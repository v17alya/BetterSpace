// xsolla_paystation.module.js
// ES module for Xsolla PayStation integration

// Immediately load the Xsolla PayStation widget script
const xsollaSdkReady = new Promise((resolve, reject) => {
  const url = "https://static.xsolla.com/embed/paystation/1.0.7/widget.min.js";
  if (
    typeof window.XPayStationWidget !== "undefined"
  ) {
    // already on the page
    return resolve();
  }
  const s = document.createElement("script");
  s.src = url;
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Failed to load Xsolla Paystation SDK"));
  document.head.appendChild(s);
});

const payStationOptions = {
  access_token: "",
  sandbox: false,
};

let payStationCallbackView = "GameMenuUIMoreOrbsView";

export async function initXsollaPaystation() {
  await xsollaSdkReady;

  // Setup PayStation event listeners when script loads
  const events = [
    "init",
    "open",
    "load",
    "close", //"return",
    "status",
    "status-invoice",
    "status-delivering",
    "status-done",
    "status-troubled",
  ];
  events.forEach((event) => {
    window.XPayStationWidget.on(event, function () {
      const camel = event
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");

      const method = `OnXPayStationWidget_${camel}`;
      console.log(`XPayStationWidget ${event}`);
      if (window.MegaMod?.myGameInstance?.SendMessage)
        window.MegaMod.myGameInstance.SendMessage(
          payStationCallbackView,
          method,
          checkAndConvertArguments(arguments)
        );
    });
  });
}

/**
 * Open PayStation widget with given token and view
 * @param {string} accessToken
 * @param {string} callbackView
 * @param {boolean} sandbox
 */
export function openXsollaPayStation(accessToken, callbackView, sandbox) {
  payStationCallbackView = callbackView;
  payStationOptions.sandbox = sandbox;
  payStationOptions.access_token = accessToken;
  window.XPayStationWidget.init(payStationOptions);
  window.XPayStationWidget.open();
}

/**
 * Convert arguments list to JSON string, or empty string
 */
function checkAndConvertArguments() {
  return arguments.length > 0 ? JSON.stringify([...arguments]) : "";
}