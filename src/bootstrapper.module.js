// bootstrapper.module.js

import { app_version } from "./app_version.js?v={{{ PRODUCT_VERSION }}}";
import { setupContent } from "./render.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  checkIfMobile,
  checkIndexer,
  isProductionVersion,
  parseSegment,
  getSystemInfo,
  getDeviceName,
  getBrowserName,
  initHelper,
} from "./helpers.module.js?v={{{ PRODUCT_VERSION }}}";

// Query DOM elements
const unityCanvas = document.querySelector("#unity-canvas");
const unityContainer = document.querySelector("#unity-container");

// Create global namespace for utilities
export const MegaMod = {
  // Basic properties (from preboot.module.js)
  app_version,
  unityCanvas,
  unityContainer,
};

// Expose globally for non-module consumers
window.MegaMod = MegaMod;
if (typeof Module !== "undefined") {
  Module.MegaMod = MegaMod;
}

// --------------------------------------------------
// Determine device type
// --------------------------------------------------
const isMobile = checkIfMobile();

// --------------------------------------------------
// Set initial background based on device
// --------------------------------------------------
setupContent(isMobile);

import { firebaseLogsInit, setNickname, setUserId } from "./firebaseLogs.module.js?v={{{ PRODUCT_VERSION }}}";
import { FocusTracker } from "./focusTracker.module.js?v={{{ PRODUCT_VERSION }}}";
import { GTAG_ID } from "./constants.module.js?v={{{ PRODUCT_VERSION }}}";
import { initGtag } from "./gtag_handler.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  onFocusChanged,
  getConfig,
  onMainScriptLoaded,
  showBuild,
  helloBuild,
  isUserAuthorized,
} from "./unity.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  initAnalytics,
  getSavedClientId,
  getCurrentSessionId,
  getClientId,
} from "./analytics.module.js?v={{{ PRODUCT_VERSION }}}";
import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  initMetaframe,
  checkMetaframeReady,
  openMetaframeLogin,
  openMetaframeBackpack,
  pushMetaframeNotification,
  isAuthorized,
  showMetaframeUI,
  getAuthToken,
  getMetaframeOpenButton,
} from "./xsolla_metaframe.module.js?v={{{ PRODUCT_VERSION }}}";
// !!! Must be uncommented if you need Xsolla OAuth !!!
// import {
//   openXsollaLoginLink,
//   openXsolla,
//   openXsollaLoginWidget,
//   initXsollaAuth,
// } from "./xsolla_oauth.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  openXsollaPayStation,
  initXsollaPaystation,
} from "./xsolla_paystation.module.js?v={{{ PRODUCT_VERSION }}}";
import { AudioPlayer } from "./audio_controller.module.js?v={{{ PRODUCT_VERSION }}}";
import { VideoController } from "../VideoController/src/videoController.module.js?v={{{ PRODUCT_VERSION }}}";
//import "./lib/unpkg.com_js-cookie@3.0.5_dist_js.cookie.min.js?v={{{ PRODUCT_VERSION }}}";
import {
  stopChecking,
  startChecking,
} from "./fetch_progress_checker.module.js?v={{{ PRODUCT_VERSION }}}";
import {
  sendEvent,
  sendRawEvent,
  getLastAmplitudeRequestNumber,
  setLastAmplitudeRequestNumber,
  incrementLastAmplitudeRequestNumber,
  getCurrentAmplitudeRequestNumber,
  setCurrentAmplitudeRequestNumber,
  incrementCurrentAmplitudeRequestNumber,
} from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";

// --------------------------------------------------
// Perform initial setup of logging and SDKs
// --------------------------------------------------
firebaseLogsInit();

// --------------------------------------------------
// Initialize Google Analytics (top-level await allowed in module)
// --------------------------------------------------
const gtagInitPromise = initGtag(GTAG_ID);

// --------------------------------------------------
// Initialize Firebase analytics (or other analytics init)
// --------------------------------------------------
initAnalytics();

getClientId()
  .then(clientId => {
    setUserId(clientId);
  })
  .catch(err => {

  });

// --------------------------------------------------
// Initialize focus tracking
// --------------------------------------------------
const focusTracker = new FocusTracker((hasFocus) => onFocusChanged(hasFocus));

// --------------------------------------------------
// Initialize SEO/indexer helper
// --------------------------------------------------
checkIndexer();

// ---------------------------------------------
// Begin fetch progress monitoring
// ---------------------------------------------
startChecking();

// ---------------------------------------------
// Initialize helper utilities that need canvas reference
// ---------------------------------------------
initHelper(unityCanvas);

// ---------------------------------------------
// Initialize audio player (background audio, etc.)
// ---------------------------------------------
const bgAudio = AudioPlayer.initializeAudio(true);

// ---------------------------------------------
// Initialize Xsolla-related promises
// ---------------------------------------------
// !!! Uncomment if you need Xsolla OAuth !!!
// const xsollaAuthP = initXsollaAuth();
const xsollaPayP = initXsollaPaystation();
const xsollaMetaframeP = initMetaframe();

// ---------------------------------------------
// Assign bootstrapper properties and methods to MegaMod
// ---------------------------------------------
Object.assign(MegaMod, {
  // Media and controllers
  bgAudio,
  AudioPlayer,
  //Cookies: window.Cookies,
  videoController: VideoController,
  isMobile,
  focusTracker,

  // Unity-related methods
  showBuild,
  helloBuild,
  isUserAuthorized,

  // Helper / environment methods
  isProductionVersion,
  parseSegment,
  getSystemInfo,
  getDeviceName,
  getBrowserName,
  checkIfMobile,

  // Fetch progress controller
  stopChecking,

  // Metaframe (Xsolla) methods
  checkMetaframeReady,
  openMetaframeLogin,
  openMetaframeBackpack,
  pushMetaframeNotification,
  isAuthorized,
  showMetaframeUI,
  getAuthToken,
  getMetaframeOpenButton,

  // Xsolla PayStation methods
  openXsollaPayStation,

  // Analytics (already initialized above)
  getSavedClientId,
  getCurrentSessionId,

  // Amplitude methods
  sendEvent,
  sendRawEvent,
  getLastAmplitudeRequestNumber,
  setLastAmplitudeRequestNumber,
  incrementLastAmplitudeRequestNumber,
  getCurrentAmplitudeRequestNumber,
  setCurrentAmplitudeRequestNumber,
  incrementCurrentAmplitudeRequestNumber,

  // Firebase Logs
  setNickname,
});

// ---------------------------------------------
// Wait for Xsolla initializations (if any)
// ---------------------------------------------
try {
  await Promise.all([
    // !!! Uncomment if using Xsolla OAuth !!!
    // xsollaAuthP,
    xsollaPayP,
    xsollaMetaframeP,
  ]);
  console.log(`Xsolla-related initializations done`);
} catch (err) {
  console.error("One of the Xsolla initializations failed:", err);
}

// --------------------------------------------------
// Wait for Google Analytics to finish initializing
// --------------------------------------------------
try {
  const gtag = await Promise.all([gtagInitPromise]).then(
    ([gtagValue]) => gtagValue
  );
  MegaMod.gtag = gtag;
  console.log(`gtag initialized with ID: ${GTAG_ID}`);
} catch (err) {
  console.error("One of the initializations failed:", err);
}

// =====================
// Unity Loader Entrypoint
// =====================
/**
 * Load Unity WebGL build.
 * 1. Build configuration via getConfig(options)
 * 2. Initialize analytics and UI
 * 3. Inject loader script and handle events
 *
 * @param {Object} options - Unity loader parameters (must include loaderUrl, dataFile URLs, etc.)
 * @returns {Promise<void>} Resolves when Unity load starts
 */
export async function startUnity(options) {
  const config = getConfig(options);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = options.loaderUrl;
    script.onload = () => {
      try {
        onMainScriptLoaded(config);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      const errProp = { url: script.src };
      sendEvent(Events.Main_Script_Loading_Failed, errProp);
      alert("Script load failed: " + script.src + "\nPlease reload the page.");
      reject(new Error("Loader script failed to load"));
    };
    document.body.appendChild(script);
  });
}
