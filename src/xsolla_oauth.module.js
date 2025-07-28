// xsolla_oauth.module.js
// ES module for Xsolla OAuth widget

// Immediately load the Xsolla OAuth widget script
const xsollaSdkReady = new Promise((resolve, reject) => {
  const url = "https://login-sdk.xsolla.com/latest/";
  if (
    typeof window.XsollaLogin !== "undefined"
  ) {
    // already on the page
    return resolve();
  }
  const s = document.createElement("script");
  s.src = url;
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Failed to load Xsolla OAuth SDK"));
  document.head.appendChild(s);
});

let pages;
let xl;
let callbackReturned = false;

/**
 * Open a direct login link in a new tab/window
 * @param {string} link
 */
export function openXsollaLoginLink(link) {
  callbackReturned = false;

  const linkElement = document.createElement("a");
  linkElement.href = link;
  linkElement.target = "_blank";
  document.body.appendChild(linkElement); // Temporarily add to the DOM
  linkElement.click();
  document.body.removeChild(linkElement); // Clean up afterwards
  //window.open(link, "_blank");
}

/**
 * Open OAuth widget (after initXsolla)
 */
export function openXsolla() {
  //document.querySelector("#xl_auth").style.display = "block";
  xl.open();
}

/**
 * Open OAuth widget and handle callback via BroadcastChannel
 * @param {function(string)} callback
 */
export function openXsollaLoginWidget(callback) {
  callbackReturned = false;
  const channel = new BroadcastChannel("app-data");
  channel.onmessage = (eventMessage) => {
    console.log("openXsollaLoginWidget onmessage: " + eventMessage.data);

    if (!callbackReturned) {
      console.log("callback: " + eventMessage.data);
      callbackReturned = true;
      callback(eventMessage.data);
    }
  };

  const additionalPath = "/html/oauth_xsolla.html";
  // for link type: {site_url}/{server}
  // const origin = window.location.origin;
  // for link type: {site_url}/{build}/{server}
  const origin = window.location.origin + window.location.pathname;

  window.open(
    `${origin.replace(/\/$/, "")}/${additionalPath.replace(/^\//, "")}`,
    "_blank"
  );
}

/**
 * Initialize Xsolla OAuth widget and mount it.
 * @returns {object} XsollaLogin.Widget instance
 */
export async function initXsollaAuth() {
  await xsollaSdkReady;
  const redirectUri = getRedirectUri();
  xl = new window.XsollaLogin.Widget({
    projectId: "6029171b-baee-40f6-969d-ef8ca917ddce",
    preferredLocale: "en_US",
    clientId: "5909",
    responseType: "code",
    state: random_hexadecimal(32),
    redirectUri: redirectUri,
    scope: "offline",
    // scope: "email",
  });
  xl.mount("xl_auth");
  pages = window.XsollaLogin.WidgetPages;

  const channel = new BroadcastChannel("app-data");
  channel.onmessage = (eventMessage) => {
    console.log("openXsollaLoginWidget onmessage: " + eventMessage.data);

    if (!callbackReturned) {
      console.log("callback: " + eventMessage.data);
      callbackReturned = true;
      if (window.MegaMod?.myGameInstance?.SendMessage)
        window.MegaMod.myGameInstance.SendMessage(
          "XsollaAuthProvider",
          "XsollaAuthProvider_BabkaAuthTokenGot",
          eventMessage.data
        );
    }
  };
}

/**
 * Compute redirect URI for OAuth callback page
 * @returns {string}
 */
function getRedirectUri() {
  const additionalPath = "/html/oauth_xsolla_callback.html";
  // for link type: {site_url}/{server}
  // const origin = window.location.origin;
  // for link type: {site_url}/{build}/{server}
  const origin = window.location.origin + window.location.pathname;
  return `${origin.replace(/\/$/, "")}/${additionalPath.replace(/^\//, "")}`;
}

/**
 * Generate a random hexadecimal string
 * @param {number} length
 * @returns {string}
 */
function random_hexadecimal(length) {
  let result = "";
  const chars = "abcdef0123456789";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}