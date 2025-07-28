// render.module.js
export function setupContent(isMobile) {
  console.log("setupContent isMobile=", isMobile);
  // addStartButton();

  window.MegaMod.unityContainer.style.display = "block";
  const SPLASH_SCREEN = document.querySelector("#SPLASH_SCREEN");

  const logo = document.querySelector("#logo");
  if (isMobile) {
    SPLASH_SCREEN.src =
      "https://megamod-image.s3.us-east-1.amazonaws.com/SPLASH_SCREEN_JPG1_GAMES_WITHOUT_LOGO.jpg";
    logo.src =
      "https://megamod-image.s3.us-east-1.amazonaws.com/Megamod_logo_04.png";
    logo.style.display = "block";
    // Mobile device style: fill the whole browser client area with the game canvas:
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content =
      "width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes";
    document.getElementsByTagName("head")[0].appendChild(meta);
    window.MegaMod.unityContainer.className = "unity-mobile";
    window.MegaMod.unityCanvas.className = "unity-mobile";
    // To lower canvas resolution on mobile devices to gain some
    // performance, uncomment the following line:
    // config.devicePixelRatio = 1;

    // #if SHOW_DIAGNOSTICS
    //         // position the diagnostics icon in the corner on the canvas
    //          const diagnostics_icon = document.getElementById("diagnostics-icon");
    //         diagnostics_icon.style.position = "fixed";
    //         diagnostics_icon.style.bottom = "10px";
    //         diagnostics_icon.style.right = "0px";
    //         window.MegaMod.unityCanvas.after(diagnostics_icon);
    // #endif
  } else {
    logo.style.display = "none";
    SPLASH_SCREEN.src =
      "https://megamod-image.s3.amazonaws.com/Game_loader_0011.jpg";
    //         window.MegaMod.unityCanvas.style.width = "{{{ WIDTH }}}px";
    //         window.MegaMod.unityCanvas.style.height = "{{{ HEIGHT }}}px";
  }
  setBackground(isMobile);
  showLoadingBar();
}

function showLoadingBar() {
  document.getElementById("loading-text").style.display = "block";
  const loadingBar = document.getElementById("unity-loading-bar");
  // if (loadingBar.style.display === "none") {
  loadingBar.style.display = "block";
  // }
}

/**
 * Sets the background image based on device type.
 * If the user is on a mobile device, applies a mobile-specific background.
 * Otherwise, applies the default desktop background.
 * @param {boolean} isMobile - Flag indicating if the user is on mobile.
 */
function setBackground(isMobile) {
  if (isMobile) {
    // document.body.style.backgroundImage = "url('TemplateData/mobile_error/background-image.jpg')";
  } else {
    // document.body.style.backgroundImage = "url('https://megamod-image.s3.amazonaws.com/bg.png')";
  }
}

function addStartButton() {
  // start button logic
  // document
  //   .getElementById("start-button")
  //   .addEventListener("click", function () {
  //     if (!(typeof mainScriptLoaded !== "undefined" && mainScriptLoaded))
  //       return;
  //     sendEvent(Events.HTML_Click_Start);
  //     document.getElementById("start-container").remove();
  //     document.getElementById("loading-text").style.display = "block";
  //     startCreateUnityInstance(config);
  //   });
  // sendEvent(Events.HTML_Button_Start_Showed);
}