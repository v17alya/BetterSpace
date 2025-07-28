// SRC/Bootstraper.module.js
// Improved Bootstraper with detailed tracking of initialization

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

// Improved imports
import { EventTracker } from "./core/EventTracker.module.js?v={{{ PRODUCT_VERSION }}}";
import ErrorHandler from "./core/ErrorHandler.module.js?v={{{ PRODUCT_VERSION }}}";
import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";

// ================================
// Bootstrapper State Management
// ================================
class BootstrapperState {
  constructor() {
    this.initializationStartTime = performance.now();
    this.initializationTracker = null;
    this.componentTrackers = new Map();
    this.failedComponents = new Set();
    this.initializationPhases = new Map();

    // Component status tracking
    this.componentStatus = {
      dom: "not_started",
      analytics: "not_started",
      firebase: "not_started",
      gtag: "not_started",
      focus_tracker: "not_started",
      audio: "not_started",
      video: "not_started",
      xsolla: "not_started",
      helpers: "not_started",
      content_setup: "not_started",
    };
  }

  /**
   * Setting the status of the component
   */
  setComponentStatus(component, status, details = {}) {
    this.componentStatus[component] = status;

    const tracker = this.componentTrackers.get(component);
    if (tracker && !tracker.isCompleted) {
      switch (status) {
        case "success":
          tracker.success(details);
          break;
        case "error":
          tracker.error(details.error || new Error(`${component} failed`));
          this.failedComponents.add(component);
          break;
        case "in_progress":
          tracker.updateProgress(details.progress || 50, details);
          break;
      }
    }
  }

  /**
   * The beginning of the component tracking
   */
  startComponentTracking(component, operation) {
    const tracker = EventTracker.trackStage(
      `Bootstrap_${component}`,
      operation
    );
    this.componentTrackers.set(component, tracker);
    this.setComponentStatus(component, "in_progress", { started: true });
    return tracker;
  }

  /**
   * Obtaining initialization statistics
   */
  getInitializationStats() {
    const totalTime = performance.now() - this.initializationStartTime;
    const successfulComponents = Object.values(this.componentStatus).filter(
      (status) => status === "success"
    ).length;
    const failedComponents = this.failedComponents.size;

    return {
      total_time: Math.round(totalTime),
      successful_components: successfulComponents,
      failed_components: failedComponents,
      component_status: { ...this.componentStatus },
      failed_component_list: Array.from(this.failedComponents),
    };
  }

  /**
   * Checking the readiness of all components
   */
  areAllComponentsReady() {
    const criticalComponents = ["dom", "analytics", "helpers", "content_setup"];
    return criticalComponents.every(
      (component) => this.componentStatus[component] === "success"
    );
  }
}

const bootstrapperState = new BootstrapperState();

// =====================================================body
// Component initialization
// =====================================================body
class ComponentInitializer {
  /**
   * Initialization of DOM components
   */
  static async initializeDOMComponents() {
    const tracker = bootstrapperState.startComponentTracking(
      "dom",
      "setup_dom_elements"
    );

    try {
      // Cache DOM elements
      const unityCanvas = document.querySelector("#unity-canvas");
      const unityContainer = document.querySelector("#unity-container");

      if (!unityCanvas || !unityContainer) {
        throw new Error("Critical DOM elements not found");
      }

      // Determin Device Type
      const isMobile = checkIfMobile();

      // Store in global namespace
      window.MegaMod = {
        app_version,
        unityCanvas,
        unityContainer,
        isMobile,
        initializationTime: Date.now(),
      };

      // Expose globally for non-module consumers
      if (typeof Module !== "undefined") {
        Module.MegaMod = window.MegaMod;
      }

      bootstrapperState.setComponentStatus("dom", "success", {
        elements_found: true,
        is_mobile: isMobile,
        global_namespace_created: true,
      });

      return { unityCanvas, unityContainer, isMobile };
    } catch (error) {
      bootstrapperState.setComponentStatus("dom", "error", { error });
      throw error;
    }
  }

  /**
   * Initialization of analytics
   */
  static async initializeAnalytics() {
    const tracker = bootstrapperState.startComponentTracking(
      "analytics",
      "setup_analytics"
    );

    try {
      // Import Analytics Modules
      const [
        { initAnalytics, getClientId, getSavedClientId, getCurrentSessionId },
        { firebaseLogsInit, setNickname, setUserId },
      ] = await Promise.all([
        import("./analytics.module.js?v={{{ PRODUCT_VERSION }}}"),
        import("./firebaseLogs.module.js?v={{{ PRODUCT_VERSION }}}"),
      ]);

      tracker.updateProgress(30, { modules_imported: true });

      // Initialize Firebase logs first
      firebaseLogsInit();

      tracker.updateProgress(50, { firebase_logs_initialized: true });

      // Initialize Main Analytics
      initAnalytics();

      tracker.updateProgress(70, { main_analytics_initialized: true });

      // Set user ID when client ID is ready
      try {
        const clientId = await getClientId();
        setUserId(clientId);

        tracker.updateProgress(90, { client_id_set: true });
      } catch (clientIdError) {
        console.warn(
          "[Bootstrapper] Failed to set Firebase user ID:",
          clientIdError
        );
        // Not critical, continue
      }

      // Add to Global Namespace
      Object.assign(window.MegaMod, {
        getSavedClientId,
        getCurrentSessionId,
        setNickname,
      });

      bootstrapperState.setComponentStatus("analytics", "success", {
        firebase_initialized: true,
        main_analytics_initialized: true,
        client_id_ready: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("analytics", "error", { error });
      throw error;
    }
  }

  /**
   * Google Analytics Initialization
   */
  static async initializeGoogleAnalytics() {
    const tracker = bootstrapperState.startComponentTracking(
      "gtag",
      "setup_google_analytics"
    );

    try {
      const { GTAG_ID } = await import(
        "./constants.module.js?v={{{ PRODUCT_VERSION }}}"
      );
      const { initGtag } = await import(
        "./gtag_handler.module.js?v={{{ PRODUCT_VERSION }}}"
      );

      tracker.updateProgress(30, { modules_imported: true });

      const gtag = await initGtag(GTAG_ID);

      window.MegaMod.gtag = gtag;

      bootstrapperState.setComponentStatus("gtag", "success", {
        gtag_id: GTAG_ID,
        gtag_ready: true,
      });

      console.log(
        `[Bootstrapper] Google Analytics initialized with ID: ${GTAG_ID}`
      );
    } catch (error) {
      bootstrapperState.setComponentStatus("gtag", "error", { error });
      console.error(
        "[Bootstrapper] Google Analytics initialization failed:",
        error
      );
      // Not critical, continue without gtag
    }
  }

  /**
   * Initialization of Focus Tracker
   */
  static async initializeFocusTracker() {
    const tracker = bootstrapperState.startComponentTracking(
      "focus_tracker",
      "setup_focus_tracking"
    );

    try {
      const [{ FocusTracker }, { onFocusChanged }] = await Promise.all([
        import("./focusTracker.module.js?v={{{ PRODUCT_VERSION }}}"),
        import("./unity.module.js?v={{{ PRODUCT_VERSION }}}"),
      ]);

      tracker.updateProgress(50, { modules_imported: true });

      const focusTracker = new FocusTracker((hasFocus) =>
        onFocusChanged(hasFocus)
      );

      window.MegaMod.focusTracker = focusTracker;

      bootstrapperState.setComponentStatus("focus_tracker", "success", {
        tracker_created: true,
        callback_registered: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("focus_tracker", "error", { error });
      console.error(
        "[Bootstrapper] Focus tracker initialization failed:",
        error
      );
      // Not critical, continue
    }
  }

  /**
   * Initialization of audio
   */
  static async initializeAudio() {
    const tracker = bootstrapperState.startComponentTracking(
      "audio",
      "setup_audio_system"
    );

    try {
      const { AudioPlayer } = await import(
        "./audio_controller.module.js?v={{{ PRODUCT_VERSION }}}"
      );

      tracker.updateProgress(50, { module_imported: true });

      const bgAudio = AudioPlayer.initializeAudio(true);

      window.MegaMod.bgAudio = bgAudio;
      window.MegaMod.AudioPlayer = AudioPlayer;

      bootstrapperState.setComponentStatus("audio", "success", {
        background_audio_initialized: true,
        loop_enabled: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("audio", "error", { error });
      console.error("[Bootstrapper] Audio initialization failed:", error);
      // Not critical for core functionality
    }
  }

  /**
   * Initialization of the video controller
   */
  static async initializeVideo() {
    const tracker = bootstrapperState.startComponentTracking(
      "video",
      "setup_video_controller"
    );

    try {
      const { VideoController } = await import(
        "../VideoController/src/videoController.module.js?v={{{ PRODUCT_VERSION }}}"
      );

      tracker.updateProgress(30, { module_imported: true });

      // Initialize video controller
      VideoController.init();

      tracker.updateProgress(80, { controller_initialized: true });

      window.MegaMod.videoController = VideoController;

      bootstrapperState.setComponentStatus("video", "success", {
        controller_ready: true,
        ui_initialized: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("video", "error", { error });
      console.error(
        "[Bootstrapper] Video controller initialization failed:",
        error
      );
      // Not Critical
    }
  }

  /**
   * Initialization of Xsolla integration
   */
  static async initializeXsolla() {
    const tracker = bootstrapperState.startComponentTracking(
      "xsolla",
      "setup_xsolla_integrations"
    );

    try {
      const [xsollaPaystationModule, xsollaMetaframeModule] = await Promise.all(
        [
          import("./xsolla_paystation.module.js?v={{{ PRODUCT_VERSION }}}"),
          import("./xsolla_metaframe.module.js?v={{{ PRODUCT_VERSION }}}"),
        ]
      );

      tracker.updateProgress(30, { modules_imported: true });

      // Initialize Xsolla components
      const [payStationResult, metaframeResult] = await Promise.all([
        xsollaPaystationModule
          .initXsollaPaystation()
          .catch((err) => ({ error: err })),
        xsollaMetaframeModule.initMetaframe().catch((err) => ({ error: err })),
      ]);

      tracker.updateProgress(70, {
        paystation_init: !payStationResult.error,
        metaframe_init: !metaframeResult.error,
      });

      // Add to Global Namespace
      Object.assign(window.MegaMod, {
        checkMetaframeReady: xsollaMetaframeModule.checkMetaframeReady,
        openMetaframeLogin: xsollaMetaframeModule.openMetaframeLogin,
        openMetaframeBackpack: xsollaMetaframeModule.openMetaframeBackpack,
        pushMetaframeNotification:
          xsollaMetaframeModule.pushMetaframeNotification,
        isAuthorized: xsollaMetaframeModule.isAuthorized,
        showMetaframeUI: xsollaMetaframeModule.showMetaframeUI,
        getAuthToken: xsollaMetaframeModule.getAuthToken,
        getMetaframeOpenButton: xsollaMetaframeModule.getMetaframeOpenButton,
        openXsollaPayStation: xsollaPaystationModule.openXsollaPayStation,
      });

      const hasErrors = payStationResult.error || metaframeResult.error;

      if (hasErrors) {
        throw new Error(
          `Xsolla initialization partial failure: PayStation=${!!payStationResult.error}, Metaframe=${!!metaframeResult.error}`
        );
      }

      bootstrapperState.setComponentStatus("xsolla", "success", {
        paystation_ready: true,
        metaframe_ready: true,
      });

      console.log("[Bootstrapper] Xsolla integrations initialized");
    } catch (error) {
      bootstrapperState.setComponentStatus("xsolla", "error", { error });
      console.error("[Bootstrapper] Xsolla initialization failed:", error);
      // Not critical for core functionality
    }
  }

  /**
   * Initialization of Helper Utilities
   */
  static async initializeHelpers(unityCanvas) {
    const tracker = bootstrapperState.startComponentTracking(
      "helpers",
      "setup_helper_utilities"
    );

    try {
      // Initialize various helpers
      initHelper(unityCanvas);

      tracker.updateProgress(30, { canvas_helpers_initialized: true });

      // SEO/Indexer Setup
      checkIndexer();

      tracker.updateProgress(60, { indexer_setup: true });

      // Add Helper Functions to Global Namespace
      Object.assign(window.MegaMod, {
        isProductionVersion,
        parseSegment,
        getSystemInfo,
        getDeviceName,
        getBrowserName,
        checkIfMobile,
      });

      bootstrapperState.setComponentStatus("helpers", "success", {
        canvas_helpers_ready: true,
        seo_configured: true,
        global_helpers_available: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("helpers", "error", { error });
      throw error; // Critical for basic functionality
    }
  }

  /**
   * Content setting
   */
  static async initializeContentSetup(isMobile) {
    const tracker = bootstrapperState.startComponentTracking(
      "content_setup",
      "setup_page_content"
    );

    try {
      setupContent(isMobile);

      tracker.updateProgress(50, { content_setup_called: true });

      // Start Fetch Progress Monitoring
      const { startChecking } = await import(
        "./fetch_progress_checker.module.js?v={{{ PRODUCT_VERSION }}}"
      );
      startChecking();

      tracker.updateProgress(80, { fetch_monitoring_started: true });

      // Add stop checking to global namespace
      const { stopChecking } = await import(
        "./fetch_progress_checker.module.js?v={{{ PRODUCT_VERSION }}}"
      );
      window.MegaMod.stopChecking = stopChecking;

      bootstrapperState.setComponentStatus("content_setup", "success", {
        content_rendered: true,
        fetch_monitoring_active: true,
      });
    } catch (error) {
      bootstrapperState.setComponentStatus("content_setup", "error", { error });
      throw error; // Critical
    }
  }
}

// =====================================================body
// Enhanced Unity Loader
// =====================================================body
class UnityLoader {
  /**
   * Unity booting with improved tracking
   */
  static async loadUnity(options) {
    const unityTracker = EventTracker.trackStage(
      "Unity_Load",
      "complete_unity_initialization"
    );

    try {
      console.log("[Bootstrapper] Starting Unity load process");

      // Get Configuration
      const { getConfig, onMainScriptLoaded } = await import(
        "./unity.module.js?v={{{ PRODUCT_VERSION }}}"
      );

      unityTracker.updateProgress(10, { unity_module_imported: true });

      const config = getConfig(options);

      unityTracker.updateProgress(20, { config_created: true });

      return new Promise((resolve, reject) => {
        const scriptTracker = EventTracker.trackStage(
          "Unity_Script_Load",
          "load_loader_script"
        );

        // Create and inject loader script
        const script = document.createElement("script");
        script.src = options.loaderUrl;

        script.onload = () => {
          try {
            scriptTracker.success({
              loader_url: options.loaderUrl,
              script_loaded: true,
            });

            unityTracker.updateProgress(50, { loader_script_loaded: true });

            // Call Unity initialization
            onMainScriptLoaded(config);

            unityTracker.success({
              config_applied: true,
              unity_initialization_started: true,
              loader_url: options.loaderUrl,
            });

            resolve();
          } catch (error) {
            scriptTracker.error(error);
            unityTracker.error(error);
            reject(error);
          }
        };

        script.onerror = () => {
          const error = new Error(
            `Failed to load Unity loader script: ${script.src}`
          );

          scriptTracker.error(error);
          unityTracker.error(error);

          sendEvent(Events.Main_Script_Loading_Failed, {
            url: script.src,
            error: error.message,
          });

          alert(`Script load failed: ${script.src}\nPlease reload the page.`);
          reject(error);
        };

        document.body.appendChild(script);

        unityTracker.updateProgress(30, { script_element_created: true });
      });
    } catch (error) {
      unityTracker.error(error);
      throw error;
    }
  }
}

// ================================
// Main Bootstrapper Logic
// ================================

/**
 * The main function of starting Unity
 */
export async function startUnity(options) {
  bootstrapperState.initializationTracker = EventTracker.trackStage(
    "Application_Bootstrap",
    "complete_application_initialization"
  );

  const initTracker = bootstrapperState.initializationTracker;

  try {
    console.log("[Bootstrapper] Starting application bootstrap");

    sendEvent(Events.Bootstrap_Started, {
      app_version,
      options_provided: !!options,
      timestamp: Date.now(),
    });

    // Phase 1: Dom and Basic Setup
    initTracker.updateProgress(5, { phase: "dom_setup" });
    const { unityCanvas, unityContainer, isMobile } =
      await ComponentInitializer.initializeDOMComponents();

    // Phase 2: Analytics Initialization
    initTracker.updateProgress(15, { phase: "analytics_setup" });
    await ComponentInitializer.initializeAnalytics();

    // Phase 3: Content and helpers setup
    initTracker.updateProgress(25, { phase: "content_setup" });
    await ComponentInitializer.initializeHelpers(unityCanvas);
    await ComponentInitializer.initializeContentSetup(isMobile);

    // Phase 4: Optional components (parallel)
    initTracker.updateProgress(40, { phase: "optional_components" });

    const optionalComponents = await Promise.allSettled([
      ComponentInitializer.initializeGoogleAnalytics(),
      ComponentInitializer.initializeFocusTracker(),
      ComponentInitializer.initializeAudio(),
      ComponentInitializer.initializeVideo(),
      ComponentInitializer.initializeXsolla(),
    ]);

    // Log results of optional components
    const optionalResults = optionalComponents.map((result, index) => {
      const componentNames = [
        "gtag",
        "focus_tracker",
        "audio",
        "video",
        "xsolla",
      ];
      return {
        component: componentNames[index],
        status: result.status,
        error: result.status === "rejected" ? result.reason?.message : null,
      };
    });

    initTracker.updateProgress(70, {
      phase: "optional_components_completed",
      optional_results: optionalResults,
    });

    // Phase 5: Unity Loading
    initTracker.updateProgress(80, { phase: "unity_loading" });
    await UnityLoader.loadUnity(options);

    // Final phase: Complete initialization
    const finalStats = bootstrapperState.getInitializationStats();

    initTracker.success({
      phase: "completed",
      total_time: finalStats.total_time,
      successful_components: finalStats.successful_components,
      failed_components: finalStats.failed_components,
      critical_components_ready: bootstrapperState.areAllComponentsReady(),
      component_status: finalStats.component_status,
    });

    sendEvent(Events.Bootstrap_Completed, {
      ...finalStats,
      app_version,
      is_mobile: isMobile,
      production: isProductionVersion(),
    });

    console.log("[Bootstrapper] Application bootstrap completed successfully");
    console.log("[Bootstrapper] Stats:", finalStats);
  } catch (error) {
    const finalStats = bootstrapperState.getInitializationStats();

    initTracker.error(error, {
      phase: "failed",
      partial_stats: finalStats,
      critical_error: true,
    });

    sendEvent(Events.Bootstrap_Failed, {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      partial_stats: finalStats,
      app_version,
    });

    ErrorHandler.logError("Bootstrap initialization failed", {
      error: error.message,
      stats: finalStats,
      options: options,
    });

    console.error("[Bootstrapper] Bootstrap failed:", error);
    throw error;
  }
}

// ================================
// Cleanup and Memory Management
// ================================

/**
 * Bootstrapper's cleaning resources
 */
function cleanup() {
  const cleanupTracker = EventTracker.trackStage(
    "Bootstrap_Cleanup",
    "cleanup_resources"
  );

  try {
    console.log("[Bootstrapper] Starting cleanup");

    // Cleanup video controller
    if (window.MegaMod?.videoController?.cleanup) {
      window.MegaMod.videoController.cleanup();
    }

    // Cleanup focus tracker
    if (window.MegaMod?.focusTracker?.dispose) {
      window.MegaMod.focusTracker.dispose();
    }

    // Force complete all active operations
    EventTracker.forceCompleteAll("Bootstrap cleanup");

    cleanupTracker.success({
      video_cleaned: true,
      focus_tracker_cleaned: true,
      active_operations_completed: true,
    });

    console.log("[Bootstrapper] Cleanup completed");
  } catch (error) {
    cleanupTracker.error(error);
    ErrorHandler.logModuleError("Bootstrapper", "cleanup", error);
  }
}

// ================================
// Global Event Handlers
// ================================

// Cleanup when you close the page
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cleanup();
  });

  // Additional Global Error Handels
  window.addEventListener("error", (event) => {
    if (event.filename?.includes("bootstrapper")) {
      ErrorHandler.logError("Bootstrapper runtime error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  });
}

// =====================================================body
// Export
// =====================================================body

export default {
  startUnity,
  cleanup,

  // Statistics and Debuging
  getBootstrapStats: () => bootstrapperState.getInitializationStats(),
  getComponentStatus: (component) =>
    bootstrapperState.componentStatus[component],

  // Internal access for testing
  _internal: {
    bootstrapperState,
    ComponentInitializer,
    UnityLoader,
  },
};
