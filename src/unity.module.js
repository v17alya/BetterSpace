// unity.module.js
import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { AnalyticsState, getClientId } from "./analytics.module.js?v={{{ PRODUCT_VERSION }}}";
import { onWebGLError } from "./webgl_error_loader.module.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";
import { stopChecking } from "./fetch_progress_checker.module.js?v={{{ PRODUCT_VERSION }}}"
import CookiesConstants from "./cookies_constants.module.js?v={{{ PRODUCT_VERSION }}}";
#if SHOW_DIAGNOSTICS
import { unityDiagnostics } from "../TemplateData/diagnostics/diagnostics.js?v={{{ PRODUCT_VERSION }}}";
#endif

let mainScriptLoaded = false;
let loadFinished = false;
let loadStarted = false;
let hasEverLostFocus = false;
let lastLoggedProgress = 0;

const progressBarFull = document.getElementById("unity-progress-bar-full");

export function onMainScriptLoaded(config) {
  console.log("onMainScriptLoaded");
  sendEvent(Events.Unity_WebGL_Hello_world);
  mainScriptLoaded = true;
  startCreateUnityInstance(config);
}

export function showBuild() {
  console.log("showBuild");
  document.getElementById("loader_canvas_div").remove();
}

export function helloBuild() {
  console.log("helloBuild");
  sendEvent(Events.Build_Hello_World);
}

export function loadMobileContent() {
  sendEvent(Events.Games_Mobile_Browser_Opened);

  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "initial-scale=1.0";
  // meta.content = 'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes';
  document.getElementsByTagName("head")[0].appendChild(meta);

  const xhr = new XMLHttpRequest();
  xhr.open("GET", "html/mobile.html", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = xhr.responseText;

      const styles = tempDiv.querySelectorAll("style");
      styles.forEach(function (style) {
        document.head.appendChild(style);
      });

      const mobileDiv = tempDiv.querySelector(".mobile-container");
      const mobileContent = document.getElementById("mobile-content");
      mobileContent.appendChild(mobileDiv);
      mobileContent.style.display = "block";
      mobileDiv.style.display = "flex";
      window.MegaMod.unityContainer.style.display = "none";
    }
  };
  xhr.send();
}

/**
 * Builds the Unity loader configuration.
 * @param {Object} payStationOptions
 * @param {string} payStationOptions.dataFilePcUrl - URL for PC data file
 * @param {string} payStationOptions.dataFileMobileUrl - URL for mobile data file
 * @param {string} payStationOptions.frameworkUrl - URL for Unity framework file
 * @param {string} payStationOptions.streamingAssetsUrl - URL for streaming assets folder
 * @param {string} payStationOptions.buildUrl - Base build folder URL for worker/memory/symbols
 * @param {string} payStationOptions.companyName
 * @param {string} payStationOptions.productName
 * @param {string} payStationOptions.productVersion
 * @param {boolean} payStationOptions.unityShowBanner - showBanner callback
 * @param {Object} [payStationOptions.extraUrls] - optional extra urls: { workerUrl, codeUrl, memoryUrl, symbolsUrl }
 * @returns {Object} Unity loader configuration
 */
export function getConfig(options) {
  // Determine best dataUrl based on ASTC support
  let dataUrl = options.dataFilePcUrl;
  if (options.dataFileMobileUrl && !options.dataFileMobileUrl.startsWith('DATA_FILE_')) {
    const gl = document.createElement('canvas').getContext('webgl');
    const gl2 = document.createElement('canvas').getContext('webgl2');
    const astcSupported = (gl  && gl.getExtension('WEBGL_compressed_texture_astc'))
                       || (gl2 && gl2.getExtension('WEBGL_compressed_texture_astc'));
    if (astcSupported) {
      dataUrl = options.dataFileMobileUrl;
    }
  }
  console.log('dataFileUrl:', dataUrl);

  // Base config
  const config = {
    dataUrl: dataUrl,
    frameworkUrl: options.frameworkUrl,
    streamingAssetsUrl: options.streamingAssetsUrl,
    companyName: options.companyName,
    productName: options.productName,
    productVersion: options.productVersion,
    showBanner: options.unityShowBanner ?? unityShowBanner,
    cacheControl: function (url) {
      // Caching enabled for .data and .bundle files.
      // Revalidate if file is up to date before loading from cache
      //if (url.match(/\.data/) || url.match(/\.bundle/) || url.match(/\.wasm/)) {
      if (url.match(/\.bundle/)) {
          return "must-revalidate";
          //return "immutable";
      }

      // // Caching enabled for .mp4 and .custom files
      // // Load file from cache without revalidation.
      if (url.match(/\.data/) || url.match(/\.wasm/)) {
          return "immutable";
      }
      // // Caching enabled for .mp4 and .custom files
      // // Load file from cache without revalidation.
      // if (url.match(/\.mp4/) || url.match(/\.custom/)) {
      //     return "immutable";
      // }

      // Disable explicit caching for all other files.
      // Note: the default browser cache may cache them anyway.
      return "no-store";
    },
  };

  if (options.workerUrl)   config.workerUrl   = options.workerUrl;
  if (options.codeUrl)     config.codeUrl     = options.codeUrl;
  if (options.memoryUrl)   config.memoryUrl   = options.memoryUrl;
  if (options.symbolsUrl)  config.symbolsUrl  = options.symbolsUrl;

  return config;
}

/**
 * Handles focus change events, sending analytics only on first blur and subsequent focus.
 * @param {boolean} hasFocus
 */
export function onFocusChanged(hasFocus) {
  if (hasFocus) {
    // only send “focus restored” once we’ve actually lost it before
    if (!hasEverLostFocus) return;
    sendEvent(Events.HTML_FocusLost_Ended);
    console.log("Focus restored");
  } else {
    // first time we lose focus, mark the flag and fire the event
    hasEverLostFocus = true;
    sendEvent(Events.HTML_FocusLost_Started);
    console.log("Focus lost");
  }
}

/**
 * Checks if the user is authorized via Xsolla or Firebase by looking
 * for stored tokens in localStorage.
 * @returns {boolean} True if an access token or metaframe token exists, false otherwise.
 */
export function isUserAuthorized() {
  const at = localStorage.getItem(CookiesConstants.ACCESS_TOKEN_PREFS_KEY);
  const metaframe_at = localStorage.getItem(
    CookiesConstants.XSOLLA_METAFRAME_TOKEN_PREFS_KEY
  );
  return (
    (at !== null && at.trim() !== "") ||
    (metaframe_at !== null && metaframe_at.trim() !== "")
  );
}

// internal methods

function updateProgress(progress) {
  trackProgress(progress);
  progressBarFull.style.width = progress * 100 + "%";
}

function startCreateUnityInstance(config) {
  console.log("startCreateUnityInstance");

  if (!checkWebglSupport(AnalyticsState.basedEventProperty)) {
    console.error("webgl doesn't support");
    handleInitializationError({
      Error: "WebGL 2.0 is not supported.",
      IsWebglError: true
    });
    return;
  }

  getClientId()
    .then(clientId => {
      console.log("startCreateUnityInstance: clientId ready", clientId);
      sendEvent(Events.Client_Build_Load_Started);
      return createUnityInstance(window.MegaMod.unityCanvas, config, updateProgress);
    })
    .then(unityInstance => {
      onBuildLoaded(unityInstance);
    })
    .catch(err => {
      console.error("Unity init error or analytics failure:", err);
      handleInitializationError({
        Error: err.message || err,
        IsWebglError: String(err).includes("WebGL")
      });
    });
}

/**
 * Checks WebGL support, using props if valid, or falling back to direct detection.
 * If WebGL is unavailable or only WebGL1 is supported, triggers the error overlay.
 *
 * @param {Object} props - Optional properties object.
 * @param {boolean} props.WebGL_Available - Whether WebGL is reported available.
 * @param {string}  props.WebGL_Version   - Reported WebGL version ("WebGL1" or "WebGL2").
 * @returns {boolean} True if WebGL2 is supported; false otherwise.
 */
function checkWebglSupport(props) {
  // Determine if props contains valid WebGL fields
  const hasValidProps =
    props != null &&
    typeof props.WebGL_Available === 'boolean' &&
    typeof props.WebGL_Version === 'string';

  // Use props.WebGL_Available if valid; otherwise detect directly
  const webglAvailable = hasValidProps
    ? props.WebGL_Available
    : !!(
        window.WebGLRenderingContext &&
        (document.createElement('canvas').getContext('webgl') ||
         document.createElement('canvas').getContext('experimental-webgl'))
      );

  // Use props.WebGL_Version if valid; otherwise detect WebGL1 vs WebGL2
  const webglVersion = hasValidProps
    ? props.WebGL_Version
    : (document.createElement('canvas').getContext('webgl2') ? 'WebGL2' : 'WebGL1');

  // If WebGL is missing or only WebGL1 is supported, show the overlay
  if (!webglAvailable || webglVersion !== 'WebGL2') {
    return false;
  }

  // WebGL2 is available
  return true;
}

/**
 * Centralized error handler for Unity initialization failures.
 * @param {Object} errorObj
 * @param {string} errorObj.Error       – descriptive error message
 * @param {boolean} errorObj.IsWebglError – whether this error is WebGL‑related
 */
function handleInitializationError(errorObj) {
  console.error("handleInitializationError: " + errorObj.Error);
  sendEvent(Events.Game_Error_Initialization, { Error: errorObj.Error });

  if (errorObj.IsWebglError) {
    onWebGLError(null, window.MegaMod.isMobile);
  }

  alert("Error: " + errorObj.Error + "\nPlease reload the page.");
}

function onBuildLoaded(unityInstance) {
  console.log("build ready");

  if (window.MegaMod.focusTracker) {
    window.MegaMod.focusTracker.dispose();
    window.MegaMod.focusTracker = null;
  }
  stopChecking();
  trackProgress(1);
  sendEvent(Events.Client_Build_Load_Finished);

  #if SHOW_DIAGNOSTICS
    const diagnostics_icon = document.getElementById("diagnostics-icon");
    diagnostics_icon.onclick = () => {
      unityDiagnostics.openDiagnosticsDiv(unityInstance.GetMemoryInfo);
    };
  #endif
  window.MegaMod.myGameInstance = unityInstance;
}

/**
 * Tracks loading progress and sends events at milestones.
 * @param {number} progress - Value between 0 and 1.
 */
function trackProgress(progress) {
  if (loadFinished) return;
  const currentProgress = Math.floor(progress * 100);
  loadFinished = currentProgress === 100;
  if (
    !loadStarted ||
    currentProgress >= lastLoggedProgress + 10 ||
    loadFinished
  ) {
    console.log(`Create_Unity_Instance_Progress: ${currentProgress}%`);
    loadStarted = true;
    const progressProperty = {
      Progress: currentProgress,
      IndexedDB_Available: AnalyticsState.indexedDB_Available,
    };
    sendEvent(Events.Game_Create_Unity_Instance, progressProperty);
    lastLoggedProgress = currentProgress;
  }
}

function unityShowBanner(msg, type) {
  const warningBanner = document.querySelector("#unity-warning");

  function updateBannerVisibility() {
    warningBanner.style.display = warningBanner.children.length
      ? "block"
      : "none";
  }

  const div = document.createElement("div");
  div.innerHTML = msg;
  warningBanner.appendChild(div);
  if (type == "error") div.style = "background: red; padding: 10px;";
  else {
    if (type == "warning") div.style = "background: yellow; padding: 10px;";
    setTimeout(function () {
      warningBanner.removeChild(div);
      updateBannerVisibility();
    }, 5000);
  }
  updateBannerVisibility();
}
