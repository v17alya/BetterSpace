// firebase_logs_module.js
let nickname = "?";
let userId = generateOrLoadUserId();

// Object to count how many times each raw log string appears
const logCounters = {};
// Array to avoid sending the same logString twice in the same session
let uniqueConsoleLogs = [];

// Import the functions you need from the SDKs you need
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/**
 * Sets a custom nickname for logging.
 * Ignored if the provided string is empty or whitespace only.
 * @param {string} nick
 */
export function setNickname(nick) {
  const trimmed = nick.trim();
  if (trimmed) {
    nickname = trimmed;
  }
}

/**
 * Manually sets userId for logging.
 * Also updates localStorage so that the same ID persists across reloads.
 * @param {string} id
 */
export function setUserId(id) {
  const trimmed = id.trim();
  if (trimmed) {
    userId = trimmed;
    localStorage.setItem("firebaseLogs_userId", trimmed);
  }
}

/**
 * Initializes Firebase logging. Sets up error handlers and overrides console.error.
 * After calling this, any uncaught errors or console.error calls will be sent to Firebase.
 */
export function firebaseLogsInit() {
  console.log("firebaseLogsInit");

  const firebaseConfig = {
    apiKey: "AIzaSyB1T_bGrmu7reGcsW3V70hAznbE3L_Uo8o",
    authDomain: "logexporter-42a5f.firebaseapp.com",
    databaseURL:
      "https://logexporter-42a5f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "logexporter-42a5f",
    storageBucket: "logexporter-42a5f.firebasestorage.app",
    messagingSenderId: "334718041282",
    appId: "1:334718041282:web:857f398951dd2eddfd8f5b",
    measurementId: "G-6LGNFPT0BK",
  };

  // Initialize Firebase app and database reference
  const app = initializeApp(firebaseConfig, "logsApp");
  const database = getDatabase(app);

  // Determine platform info for path segmentation
  const platformInfo =
    window.navigator?.userAgentData?.platform || window.navigator?.platform;
  const serverName = parseSegment(window.location.href, 1);

  let lastPath = "";
  let lastRef = null;
  
  /**
   * Builds and returns a Firebase Database reference (logsRef) based on current userId, nickname, and date.
   * This ensures that any change to userId or nickname will direct logs to a new node.
   */
  function getLogsRef() {
    const safeUserId = userId.replace(/[.$\[\]#]/g, "_");
    const today = new Date().toISOString().split("T")[0]; // "2025-06-04"
    const path = `StreamersMegagames/${serverName}${platformInfo}/${today}/${safeUserId}`;
    //const path = `StreamersMegagames/${platformInfo}/${today}/${userId}_${nickname}`;

    if (path === lastPath && lastRef) {
      return lastRef;
    }

    lastPath = path;
    lastRef = ref(database, path);
    return lastRef;
  }

  /**
   * Sends a raw log string to Firebase using a transaction.
   * If the same raw string has been sent before, appends "(count)" suffix.
   * Retries up to 10 times on failure, with a 5-second delay.
   *
   * @param {string} rawLogString - The original log message without suffix.
   * @param {number} [tryCount=0] - Number of retry attempts already made.
   */
  function sendLogsToServer(rawLogString, tryCount = 0) {
    if (tryCount > 10) {
      // Stop retrying after 10 failed attempts
      return;
    }
    if (!rawLogString || rawLogString.trim() === "") {
      // Do nothing for empty or whitespace-only strings
      return;
    }

    // If somehow userId or nickname is missing, regenerate or default
    if (!userId) {
      userId = generateOrLoadUserId();
    }
    if (!nickname) {
      nickname = "?";
    }

    // -------------------------------
    // 1. Update count for rawLogString
    // -------------------------------
    if (!(rawLogString in logCounters)) {
      logCounters[rawLogString] = 0;
    }
    logCounters[rawLogString] += 1;

    const count = logCounters[rawLogString];
    let logString = rawLogString;
    if (count > 1) {
      logString = `${rawLogString} (${count})`;
    }

    // --------------------------------------------
    // 2. Check if this exact logString was sent already
    // --------------------------------------------
    if (!uniqueConsoleLogs.includes(logString)) {
      const logsRef = getLogsRef();
      runTransaction(
        logsRef,
        (currentData) => {
          if (!currentData) {
            currentData = [];
          }
          // Build entry with additional metadata
          const entry = {
            message: logString,
            //userId: userId,
            nickname: nickname,
            timestamp: new Date().toISOString(),
          };
          // Only add if the array does not already contain this message
          const alreadyExists = currentData.some(
            (item) => item.message === entry.message
          );
          if (!alreadyExists) {
            uniqueConsoleLogs.push(logString);
            currentData.push(entry);
          }
          return currentData;
        },
        (error) => {
          if (error) {
            // Retry after 5 seconds, increasing tryCount
            setTimeout(() => {
              sendLogsToServer(rawLogString, tryCount + 1);
            }, 5000);
          }
        }
      );
    }
  }

  // Global handler for uncaught errors
  window.addEventListener("error", (evt) => {
    sendLogsToServer(
      `Uncaught ${evt.message} at ${evt.filename}:${evt.lineno}`,
      0
    );
  });

  // Override console.error to capture and send error messages
  const originalConsoleError = console.error;
  console.error = function () {
    originalConsoleError.apply(console, arguments);
    const logString = `"${Array.from(arguments)
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ")
      .trim()}"`;
    sendLogsToServer(logString, 0);
  };
}

/**
 * Attempts to load a saved userId from localStorage.
 * If none exists, generates a new UUID (or fallback) and saves it.
 */
function generateOrLoadUserId() {
  const storedId = localStorage.getItem("firebaseLogs_userId");
  if (storedId) {
    return storedId;
  }
  let newId;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    newId = crypto.randomUUID();
  } else {
    // Fallback: use timestamp + random number
    newId = "user-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
  localStorage.setItem("firebaseLogs_userId", newId);
  return newId;
}

/**
 * Parses and returns a specific segment from a URL path.
 * Splits the pathname by "/", filters out empty segments, and uppercases the result.
 * @param {string} url - The full URL string to parse.
 * @param {number} segmentIndex - The zero-based index of the path segment to retrieve.
 * @returns {string|undefined} The uppercase segment if found, otherwise undefined.
 */
function parseSegment(url, segmentIndex) {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean)[
      segmentIndex
    ];
    return segment?.toUpperCase();
  } catch {
    return undefined;
  }
}