// analytics.module.js
// ES module for analytics state and initialization routines

import UAParser from "./lib/ClientDataJS/ua-parser.min.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";
import { GTAG_ID } from "./constants.module.js?v={{{ PRODUCT_VERSION }}}";
import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { isUserAuthorized } from "./unity.module.js?v={{{ PRODUCT_VERSION }}}";
import { parseSegment, getDeviceName, checkIfMobile } from "./helpers.module.js?v={{{ PRODUCT_VERSION }}}";
import { initGtag } from "./gtag_handler.module.js?v={{{ PRODUCT_VERSION }}}";

// Internal module-level variables
let clientId = "";
let currentSessionId = -1;

/**
 * Memoized promise for retrieving a persistent client ID.
 * @type {Promise<string>|null}
 */
let clientIdPromise = null;

/**
 * Centralized analytics state container.
 * Exposed on window.AnalyticsState for backward compatibility.
 */
export const AnalyticsState = {
  serverName: null,
  indexedDB_Available: false,
  deviceProperty: null,
  basedEventProperty: null,
};

/**
 * Retrieves a persistent client ID, using localStorage, GA client_id or a UUID.
 * Always resolves to a string and never rejects.
 * @returns {Promise<string>}
 */
export function getClientId() {
  if (clientIdPromise) return clientIdPromise;

  clientIdPromise = (async () => {
    // 1. Try localStorage cache
    try {
      const saved = localStorage.getItem("userId");
      if (saved) return saved;
    } catch { }
    
    console.log("getClientId getGtagClientId");

    // 2. Try to get GA client_id via gtag
    let id = null;
    try {
      id = await getGtagClientId();
    } catch {}
    if (id) {
      try {
        localStorage.setItem("userId", id);
      } catch {}
      return id;
    }
    console.log("getClientId randomUUID or fallbackUuidv4");

    // 3. Fallback to crypto or manual UUID
    let uuid;
    try {
      uuid = crypto?.randomUUID?.() ?? fallbackUuidv4();
    } catch {
      uuid = fallbackUuidv4();
    }
    try {
      localStorage.setItem("userId", uuid);
    } catch {}
    return uuid;
  })();

  return clientIdPromise;
}

/**
 * Returns the last saved client ID (or empty string if not initialized).
 * @returns {string}
 */
export function getSavedClientId() {
  return clientId;
}

/**
 * Returns the current session ID.
 * @returns {number}
 */
export function getCurrentSessionId() {
  return currentSessionId;
}

/**
 * Main analytics initialization.
 * - Generates a session ID
 * - Kicks off clientId retrieval
 * - Populates AnalyticsState
 * - Sends initial Hello_World event
 */
export function initAnalytics() {
  console.log("initAnalytics");
  currentSessionId = Date.now();
  getClientId().then((id) => {
    console.log("Client ID initialized:", id);
    clientId = id;
  });

  // Populate state
  // for link type: {site_url}/{build}/{server}
  AnalyticsState.serverName = parseSegment(window.location.href, 1);
  // for link type: {site_url}/{server}
  // AnalyticsState.serverName = parseSegment(window.location.href, 0);
  AnalyticsState.indexedDB_Available = "indexedDB" in window;
  AnalyticsState.deviceProperty = getDeviceName?.();
  AnalyticsState.basedEventProperty = initializeBasedEventProperty();
  console.log("initAnalytics top location:", window.top.location.href);
  console.log("initAnalytics location:", window.location.href);
  console.log("initAnalytics serverName:", AnalyticsState.serverName);
  console.log(
    "initAnalytics basedEventProperty:",
    AnalyticsState.basedEventProperty
  );

  // Send initial event
  const defaultProps = { Session_ActivePlayTime: 0, Game_ID: "none" };
  sendEvent(Events.Hello_World, defaultProps, defaultProps);

  window.addEventListener("unhandledrejection", (ev) => {
    sendEvent(Events.HTML_Window_UnhandledRejection, { reason: ev.reason?.toString(), stack: ev.reason?.stack, }, {}, true);
  });

  window.addEventListener("error", (event) => {
    sendEvent(
      Events.HTML_Window_Error,
      {
        message: event.message,
        url: event.filename,
        line: event.lineno,
        col: event.colno,
      },
      {},
      true
    );
    // console.error(
    //   `${event.message}\n${event.filename}, ${event.lineno}:${event.colno}`
    // );
  });
}

/**
 * Generate a simple UUID v4 fallback.
 * @returns {string}
 */
function fallbackUuidv4() {
  console.log("fallbackUuidv4");
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Attempts to retrieve GA client_id via gtag within timeout.
 * @param {number} [timeoutMs=3000]
 * @returns {Promise<string|null>}
 */
function getGtagClientId(timeoutMs = 3000) {
  console.log("getGtagClientId");
  return new Promise(async (resolve) => {
    console.log("getGtagClientId await");
    try {
      await initGtag(GTAG_ID);
    } catch (err) {
      console.error("getGtagClientId Google Analytics failed to load:", err);
    }

    if (typeof window.gtag !== "function") {
      console.log("getGtagClientId no gtag");
      return resolve(null);
    }
    
    console.log("getGtagClientId gtag");
    let called = false;
    const timer = setTimeout(() => {
      called = true;
      resolve(null);
    }, timeoutMs);

    try {
      window.gtag("get", GTAG_ID, "client_id", (id) => {
        if (!called) {
          clearTimeout(timer);
          called = true;
          resolve(id || null);
        }
      });
    } catch {
      if (!called) {
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Initializes base event properties (browser, OS, WebGL, etc.).
 * @returns {object} Base event property map.
 */
function initializeBasedEventProperty() {
  const parser = new UAParser(navigator.userAgent);
  const result = parser.getResult();
  return {
    Browser: result.browser.name || "unknown",
    Browser_Version: result.browser.version || "unknown",
    Operating_System: result.os.name || "unknown",
    Operating_System_Version: result.os.version || "unknown",
    WebGL_Available: !!(
      window.WebGLRenderingContext &&
      (document.createElement("canvas").getContext("webgl") ||
        document.createElement("canvas").getContext("experimental-webgl"))
    ),
    WebGL_Version: document.createElement("canvas").getContext("webgl2")
      ? "WebGL2"
      : "WebGL1",
    IndexedDB_Available: AnalyticsState.indexedDB_Available,
    DeviceType: AnalyticsState.deviceProperty,
    Link_Open: window.top.location.href,
    IsMobile: checkIfMobile(),
    Server_Name: AnalyticsState.serverName || "none",
    New_User: !isUserAuthorized(),
  };
}
