// helpers.module.js

/**
 * Sets up global event handlers.
 * - Locks pointer on right-click down over the canvas.
 * - Releases pointer on right-click up.
 * - Sends a Unity message before unload.
 * @param {object} unityCanvas - Canvas tag.
 */
export function initHelper(unityCanvas) {
  document.onmousedown = function (eventData) {
    if (eventData.button === 2) {
      if (unityCanvas) unityCanvas.requestPointerLock();
    }
  };

  document.onmouseup = function (eventData) {
    if (eventData.button === 2) {
      document.exitPointerLock();
    }
  };

  window.onbeforeunload = function () {
    if (window.MegaMod?.myGameInstance?.SendMessage)
      window.MegaMod.myGameInstance.SendMessage(
        "CloseEventHandler",
        "OnCloseButtonClicked"
      );
    return false;
  };
}

/**
 * Detects whether the user is on a mobile device.
 * @returns {boolean}
 */
export function checkIfMobile() {
  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
      window.navigator.userAgent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      window.navigator.userAgent.substr(0, 4)
    )
  ) {
    return true;
  }

  if (
    /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(
      window.navigator.userAgent
    ) ||
    /\b(Android|Windows Phone|iPad|iPod)\b/i.test(window.navigator.userAgent) ||
    // iPad on iOS 13 detection
    (window.navigator.userAgent.includes("Mac") && "ontouchend" in document)
  ) {
    return true;
  }

  if (
    /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(
      window.navigator.userAgent
    ) ||
    /\b(Android|Windows Phone|iPad|iPod)\b/i.test(window.navigator.userAgent) ||
    // iPad on iOS 13 detection
    (window.navigator.userAgent.includes("Mac") &&
      "ontouchend" in window.document)
  ) {
    return true;
  }

  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
      window.navigator.userAgent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      window.navigator.userAgent.substr(0, 4)
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Gets device name.
 * @returns {string}
 */
export function getDeviceName() {
  const userAgent =
    window.navigator.userAgent || window.navigator.vendor || window.opera;

  switch (true) {
    case /iPhone/i.test(userAgent):
      return "iPhone";

    case /Android/i.test(userAgent):
      return "Android";

    case /BlackBerry/i.test(userAgent):
      return "BlackBerry";

    case /iPad/i.test(userAgent):
      return "iPad";

    case /Windows Phone/i.test(userAgent):
      return "Windows Phone";

    default:
      return "Unknown device";
  }
}

/**
 * Gets browser name.
 * @returns {string}
 */
export function getBrowserName() {
  let browserName = (function (agent) {
    switch (true) {
      case agent.indexOf("edge") > -1:
        return "MS Edge";
      case agent.indexOf("edg/") > -1:
        return "Edge ( chromium based)";
      case agent.indexOf("opr") > -1 && !!window.opr:
        return "Opera";
      case agent.indexOf("chrome") > -1 && !!window.chrome:
        return "Google Chrome";
      case agent.indexOf("trident") > -1:
        return "MS IE";
      case agent.indexOf("firefox") > -1:
        return "Mozilla Firefox";
      case agent.indexOf("safari") > -1:
        return "Safari";
      default:
        return "other";
    }
  })(window.navigator.userAgent.toLowerCase());

  return browserName;
}

/**
 * Performs indexing or de-indexing logic.
 * (Copy the implementation from the original helpers.js here.)
 */
export function checkIndexer() {
  document.addEventListener("DOMContentLoaded", function () {
    const metaTag = document.createElement("meta");
    metaTag.name = "robots";

    if (isProductionVersion()) {
      metaTag.content = "index,follow";
      console.log("Meta: Allowed indexing and following");
    } else {
      metaTag.content = "noindex,nofollow";
      console.log("Meta: Disallowed indexing and following");
    }

    document.head.appendChild(metaTag);
  });
}

/**
 * Returns true if the current build is the production version.
 * @returns {boolean} True if in production environment, false otherwise.
 */
export function isProductionVersion() {
  const url = window.location.href;
  const prod = (url.includes(".io") || url.includes(".gg")) && !url.includes("dev");
  console.log(`isProductionVersion: ${prod}`);
  return prod;
}

/**
 * Parses and returns a specific segment from a URL path.
 * Splits the pathname by "/", filters out empty segments, and uppercases the result.
 * @param {string} url - The full URL string to parse.
 * @param {number} segmentIndex - The zero-based index of the path segment to retrieve.
 * @returns {string|undefined} The uppercase segment if found, otherwise undefined.
 */
export function parseSegment(url, segmentIndex) {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean)[
      segmentIndex
    ];
    return segment?.toUpperCase();
  } catch {
    return undefined;
  }
}

/**
 * Retrieves detailed system information as a JSON string.
 * Gathers device memory, CPU core count, and WebGL renderer info.
 * @returns {string} JSON string containing systemInfo properties.
 */
export function getSystemInfo() {
  let gl;
  let renderer;

  try {
    gl =
      document.createElement("canvas").getContext("webgl") ||
      document.createElement("canvas").getContext("experimental-webgl") ||
      document.createElement("canvas").getContext("webgl2");

    if (gl) {
      const unmaskedInfo = getUnmaskedInfo(gl);
      renderer = unmaskedInfo.renderer;
    }
  } catch (e) {
    console.log(e);
  }

  const systemInfo = {
    minRam: window.navigator.deviceMemory,
    hardwareConcurrency: window.navigator.hardwareConcurrency,
    renderer: renderer,
  };

  return JSON.stringify(systemInfo);
}

/**
 * Returns unmasked WebGL renderer and vendor information.
 * Uses the WEBGL_debug_renderer_info extension if available.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context to query.
 * @returns {{renderer: string, vendor: string}} Object with renderer and vendor strings.
 */
function getUnmaskedInfo(gl) {
  const unMaskedInfo = {
    renderer: "",
    vendor: "",
  };

  const dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (dbgRenderInfo != null) {
    unMaskedInfo.renderer = gl.getParameter(
      dbgRenderInfo.UNMASKED_RENDERER_WEBGL
    );
    unMaskedInfo.vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
  }

  return unMaskedInfo;
}