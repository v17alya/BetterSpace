// xsolla_metaframe.module.js
import CookiesConstants from "./cookies_constants.module.js?v={{{ PRODUCT_VERSION }}}";

// ==========================
// Constants
// ==========================
const METAFRAME_SCRIPT_URL =
  "https://cdn.xsolla.net/metaframe-web-wallet-widget-prod/container/v1/metaframe.js";
const METAFRAME_CONTAINER_ID = "__xsolla_metaframe_container";
const SAVE_TOKEN_TO_COOKIES = false;

// Metaframe configuration constants
const METAFRAME_CONFIG = {
  loginProjectId: "6029171b-baee-40f6-969d-ef8ca917ddce",
  merchantId: 414306,
  projectId: 221518,
  orbsApiHostId: "20220aeb-4f9a-418f-a2d1-cdc6b36e8cc3",
  isMobile: false,
  isCollapsed: true,
  layoutSettings: {
    desktop: { widgetMarginTop: 16 },
    mobile: { widgetMarginTop: 16 },
  },
};

// Metaframe event names
const EVENT_APP_LOADED = "@metaframe-partner-events:app-loaded";
const EVENT_NOT_AUTHORIZED_MINI_APPS_LOADED =
  "@metaframe-partner-events:not-authorized-mini-apps-loaded";
const EVENT_LOGIN_SUCCESSFUL = "@metaframe-partner-events:login-successful";
const EVENT_LOGOUT_SUCCESSFUL = "@metaframe-partner-events:logout-successful";

// Callback view for sending messages to Unity (if used)
const METAFRAME_CALLBACK_VIEW = "XsollaAuthProvider";

// ==========================
// Global flags
// ==========================
let isMetaframeScriptLoaded = false;
let isMetaframeReady = false;
let authToken = "";

// ==========================
// Initialization
// ==========================
/**
 * Loads the Metaframe widget script and initializes the widget.
 * @returns {Promise<void>}
 */
export async function initMetaframe() {
  // 1) Hook up any event subscriptions or DOM observers first
  subscribeOnMetaframeEvents();
  observeMetaframeContainerAddition();

  // 2) Create & inject the script, then await its load
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src   = METAFRAME_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      console.log("Metaframe script loaded.");
      isMetaframeScriptLoaded = true;

      try {
        createMetaframe();   // your widget initialization
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    script.onerror = () => {
      console.error("Error loading the Metaframe script.");
      reject(new Error("Failed to load Metaframe script"));
    };

    document.body.appendChild(script);
  });
}

function createMetaframe() {
  // Create the Metaframe instance with the provided configuration.
  window.metaframe.create(METAFRAME_CONFIG);
}

// ==========================
// Metaframe Event Subscriptions
// ==========================
function subscribeOnMetaframeEvents() {
  // Listen for when the Metaframe application is fully loaded.
  window.addEventListener(EVENT_APP_LOADED, () => {
    console.log("Event: app-loaded received.");
    isMetaframeReady = true;

    // Setup partner-specific actions and update UI elements.
    setupPartnerActions();
    setupMetaframeUI();
    showMetaframeUI(false);
  });

  // Listen for when not-authorized mini-apps have loaded.
  window.addEventListener(EVENT_NOT_AUTHORIZED_MINI_APPS_LOADED, () => {
    console.log("Event: not-authorized-mini-apps-loaded received.");
    removeAuthToken();
  });

  // Listen for a successful login event.
  window.addEventListener(EVENT_LOGIN_SUCCESSFUL, (event) => {
    const detail = event.detail || {};
    console.log(
      `Event: login-successful received. Detail: ${JSON.stringify(detail)}`
    );

    setAuthToken(detail.token);

    // If Unity is defined, send a message to notify about login success.
    if (window.MegaMod?.myGameInstance?.SendMessage) {
      window.MegaMod.myGameInstance.SendMessage(
        METAFRAME_CALLBACK_VIEW,
        "OnMetaframeLoginSuccess",
        JSON.stringify(detail)
      );
    }
  });

  // Listen for a successful logout event.
  window.addEventListener(EVENT_LOGOUT_SUCCESSFUL, () => {
    console.log("Event: logout-successful received.");
    removeAuthToken();

    if (window.MegaMod?.myGameInstance?.SendMessage) {
      window.MegaMod.myGameInstance.SendMessage(
        METAFRAME_CALLBACK_VIEW,
        "OnMetaframeLogoutSuccess"
      );
    }
  });
}

// Placeholder for any partner-specific actions.
function setupPartnerActions() {
  // Implement any additional actions needed for your partner integration.
}

// ==========================
// Utility Functions
// ==========================

export function checkMetaframeReady() {
  return isMetaframeReady;
}

/**
 * Opens the Metaframe login window if the Metaframe is ready.
 */
export function openMetaframeLogin() {
  if (!isMetaframeReady) {
    console.error("Metaframe is not ready!");
    return;
  }
  showMetaframeUI(true);
  window.metaframe.partnerActions.openLogin();
}

/**
 * Opens the Metaframe backpack window if the Metaframe is ready.
 */
export function openMetaframeBackpack() {
  if (!isMetaframeReady) {
    console.error("Metaframe is not ready!");
    return;
  }
  window.metaframe.partnerActions.openBackpack();
}

/**
 * Pushes a new notification to the notification stack if the Metaframe is ready.
 */
export function pushMetaframeNotification(params) {
  if (!isMetaframeReady) {
    console.error("Metaframe is not ready!");
    return;
  }
  window.metaframe.partnerActions.pushNotification(params);
}

/**
 * Checks if the user is authorized based on the presence of an auth token.
 *
 * @returns {boolean} True if authorized; otherwise, false.
 */
export function isAuthorized() {
  const token = getAuthToken();
  return token !== null && token !== "";
}

/**
 * Shows or hides the Metaframe UI container.
 *
 * @param {boolean} show - True to show the UI; false to hide it.
 */
export function showMetaframeUI(show) {
  const container = getMetaframeUI();
  if (container) {
    // Using visibility so that the element retains its space.
    container.style.visibility = show ? "visible" : "hidden";
    container.style.opacity = show ? 1 : 0;
    container.style.pointerEvents = show ? "all" : "none";
    // container.style.visibility = show ? "visible" : "hidden";
    // Alternatively, you can use display:
    // container.style.display = show ? "block" : "none";
  } else {
    console.warn(`Element with id "${METAFRAME_CONTAINER_ID}" not found.`);
  }
}

/**
 * Retrieves the Xsolla Metaframe token from cookies.
 *
 * @returns {string} The decoded token or an empty string if not found.
 */
export function getAuthToken() {
  if (SAVE_TOKEN_TO_COOKIES) {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split("=");
      if (cookieName === CookiesConstants.XSOLLA_METAFRAME_TOKEN_PREFS_KEY) {
        return decodeURIComponent(cookieValue);
      }
    }
  }
  return authToken;
}

export function getMetaframeOpenButton() {
  return findElementInShadowDOM(getMetaframeUI(), "button.go699427653", false);
}

/**
 * Stores the token in a session cookie.
 *
 * @param {string} token - The token string to be stored.
 */
function setAuthToken(token) {
  console.log("setAuthToken: " + token);

  if (!token) {
    // Check if token is empty; if so, do not set the cookie.
    return;
  }

  authToken = token;
  if (!SAVE_TOKEN_TO_COOKIES) return;

  // Without a domain attribute, the cookie will be set for the current domain.
  // To share across subdomains, you can add: `; domain=.example.com`
  document.cookie = `${CookiesConstants.XSOLLA_METAFRAME_TOKEN_PREFS_KEY}=${encodeURIComponent(
    token
  )}; path=/`;
}

/**
 * Removes the Xsolla Metaframe token cookie.
 */
function removeAuthToken() {
  console.log("removeAuthToken");
  authToken = "";

  // Delete the cookie by setting its expiration date to a past date.
  // Ensure the same domain and path are used if a domain was specified during creation.
  document.cookie = `${CookiesConstants.XSOLLA_METAFRAME_TOKEN_PREFS_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Retrieves the Metaframe container element by its ID.
 *
 * @returns {HTMLElement|null} The container element or null if not found.
 */
function getMetaframeUI() {
  return document.getElementById(METAFRAME_CONTAINER_ID);
}

/**
 * Sets up the Metaframe UI by adding click event listeners to buttons
 * within the Shadow DOM of the Metaframe container.
 */
function setupMetaframeUI() {
  setupMetaframeButtonClickActions();

  const isMobileQuery = window.matchMedia("(max-width: 1000px)");
  handleMetaframeLayoutChange(isMobileQuery);
  isMobileQuery.addEventListener("change", handleMetaframeLayoutChange);
}

function setupMetaframeButtonClickActions() {
  // Find all buttons with the class "go699427653" inside the Shadow DOM.
  const button = getMetaframeOpenButton();
  if (button) {
    button.addEventListener("click", () => {
      // console.log("setupMetaframeUI click: " + button);
      // showMetaframeLogoutButton(false);
    });
  } else {
    console.warn('No button with class "go699427653" found in the Shadow DOM.');
  }
}

/**
 * Finds one or more elements inside a Shadow DOM using a specified query selector.
 *
 * @param {HTMLElement} hostElement - The shadow host element.
 * @param {string} elementSelector - The query selector to find the desired element(s) within the Shadow DOM.
 * @param {boolean} [findAll=false] - If true, returns all matching elements as a NodeList; if false, returns the first matching element.
 * @returns {HTMLElement|NodeList|null} - The found element(s), or null if not found.
 */
function findElementInShadowDOM(hostElement, elementSelector, findAll = false) {
  if (!hostElement) {
    console.warn("Shadow host element not provided.");
    return null;
  }

  // Access the shadow root (only works if created with mode: "open")
  const shadowRoot = hostElement.shadowRoot;
  if (!shadowRoot) {
    console.warn("Shadow root is not available for the provided host element.");
    return null;
  }

  if (findAll) {
    // Return all matching elements.
    const elements = shadowRoot.querySelectorAll(elementSelector);
    if (!elements || elements.length === 0) {
      console.warn(
        `No elements found matching selector "${elementSelector}" inside the Shadow DOM.`
      );
      return null;
    }
    return elements;
  } else {
    // Return the first matching element.
    const element = shadowRoot.querySelector(elementSelector);
    if (!element) {
      console.warn(
        `Element with selector "${elementSelector}" not found inside the Shadow DOM.`
      );
      return null;
    }
    return element;
  }
}

/**
 * Finds one or more elements inside a Shadow DOM using a element id.
 *
 * @param {HTMLElement} hostElement - The shadow host element.
 * @param {string} elementId - The id to find the desired element(s) within the Shadow DOM.
 * @returns {HTMLElement|null} - The found element(s), or null if not found.
 */
function findElementByIdInShadowDOM(hostElement, elementId) {
  if (!hostElement) {
    console.warn("Shadow host element not provided.");
    return null;
  }

  // Access the shadow root (only works if created with mode: "open")
  const shadowRoot = hostElement.shadowRoot;
  if (!shadowRoot) {
    console.warn("Shadow root is not available for the provided host element.");
    return null;
  }

  const element = shadowRoot.getElementById(elementId);
  if (!element) {
    console.warn(
      `Element with selector "${elementId}" not found inside the Shadow DOM.`
    );
    return null;
  }
  return element;
}

/**
 * Generic function that observes a target node for the addition of an element matching a given query selector.
 *
 * @param {HTMLElement|ShadowRoot} targetNode - The node (or ShadowRoot) to observe.
 * @param {string} querySelector - The CSS selector to identify the desired element.
 * @param {Function} callback - A function to be called when a matching element is added. Receives the matched node as an argument.
 * @param {boolean} [disconnectOnFound=true] - Whether to disconnect the observer after the element is found.
 * @param {boolean} [anySelector=false] - observe any added element.
 */
function observeElementAddition(
  targetNode,
  querySelector,
  callback,
  disconnectOnFound = true,
  anySelector = false
) {
  if (!targetNode) {
    console.warn("Target node not provided for observation.");
    return;
  }

  const config = { childList: true, subtree: true };

  const observer = new MutationObserver((mutationsList, obs) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          // Ensure the added node is an element.
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself matches the query or contains a matching element.
            if (
              anySelector ||
              node.matches(querySelector) ||
              node.querySelector(querySelector)
            ) {
              console.log(
                `Element matching "${querySelector}" has been added:`,
                node
              );

              if (typeof callback === "function") {
                callback(node);
              }

              if (disconnectOnFound) {
                obs.disconnect();
              }
              // Exit early once a matching element is found.
              return;
            }
          }
        });
      }
    }
  });

  observer.observe(targetNode, config);
}

/**
 * Observes the document for the addition of the Metaframe container element by its ID.
 * Once the element is added, it executes the optional callback and hides the UI container.
 *
 * @param {Function} [callback] - Optional callback to be called when the element is added.
 */
function observeMetaframeContainerAddition(callback) {
  observeElementAddition(
    document.body,
    `#${METAFRAME_CONTAINER_ID}`,
    (node) => {
      console.log(
        `Metaframe container with id "${METAFRAME_CONTAINER_ID}" was added:`,
        node
      );
      showMetaframeUI(false); // Hide the container as needed.

      if (typeof callback === "function") {
        callback(node);
      }
    },
    true // Disconnect after the element is found.
  );
}

/**
 * Switches Metaframe from desktop to mobile version or vice versa.
 *
 * @param {Function} [isMobile] - Whether to switch Metaframe to the mobile version. If set to true, Metaframe switches to the mobile version.
 * If set to false, Metaframe switches to the desktop version.
 */
function setMetaframeIsMobile(isMobile) {
  window.metaframe.setIsMobile(isMobile);
}

function handleMetaframeLayoutChange(e) {
  setMetaframeIsMobile(e.matches);
}
