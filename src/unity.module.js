// src/unity.module.js
// Refactored Unity module with improved tracking and error handling

import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { AnalyticsState, getClientId } from "./analytics.module.js?v={{{ PRODUCT_VERSION }}}";
import { onWebGLError } from "./webgl_error_loader.module.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";
import { stopChecking } from "./fetch_progress_checker.module.js?v={{{ PRODUCT_VERSION }}}"
import CookiesConstants from "./cookies_constants.module.js?v={{{ PRODUCT_VERSION }}}";
import { EventTracker } from "./core/EventTracker.module.js?v={{{ PRODUCT_VERSION }}}";
import ErrorHandler from "./core/ErrorHandler.module.js?v={{{ PRODUCT_VERSION }}}";

#if SHOW_DIAGNOSTICS
import { unityDiagnostics } from "../TemplateData/diagnostics/diagnostics.js?v={{{ PRODUCT_VERSION }}}";
#endif

// ================================
// State Management
// ================================
class UnityState {
  constructor() {
    this.mainScriptLoaded = false;
    this.loadFinished = false;
    this.loadStarted = false;
    this.hasEverLostFocus = false;
    this.lastLoggedProgress = 0;
    this.unityInstance = null;
    this.initializationTracker = null;
    this.buildLoadTracker = null;
    
    // DOM elements cache
    this.progressBarFull = document.getElementById("unity-progress-bar-full");
    
    // Performance tracking
    this.performanceMarks = new Map();
    this.resourceLoadTimes = new Map();
  }
  
  /**
   * Add performance mark
   */
  addPerformanceMark(name, data = {}) {
    this.performanceMarks.set(name, {
      timestamp: performance.now(),
      data
    });
  }
  
  /**
   * Get time between two marks
   */
  getTimeBetweenMarks(startMark, endMark) {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);
    
    if (!start || !end) return null;
    
    return end.timestamp - start.timestamp;
  }
  
  /**
   * Clear state during cleanup
   */
  cleanup() {
    this.performanceMarks.clear();
    this.resourceLoadTimes.clear();
    
    if (this.initializationTracker && !this.initializationTracker.isCompleted) {
      this.initializationTracker.error(new Error('Cleanup called during initialization'));
    }
    
    if (this.buildLoadTracker && !this.buildLoadTracker.isCompleted) {
      this.buildLoadTracker.error(new Error('Cleanup called during build load'));
    }
  }
}

const unityState = new UnityState();

// ================================
// WebGL Support Validation
// ================================
class WebGLValidator {
  
  /**
   * Comprehensive WebGL support check
   */
  static validateWebGLSupport() {
    const tracker = EventTracker.trackStage('WebGL_Check', 'comprehensive_validation');
    
    try {
      const validation = {
        webgl1: this.checkWebGL1Support(),
        webgl2: this.checkWebGL2Support(),
        extensions: this.checkWebGLExtensions(),
        limits: this.checkWebGLLimits(),
        renderer: this.getRendererInfo()
      };
      
      const isSupported = validation.webgl2.supported;
      const supportLevel = this.determineSupportLevel(validation);
      
      // Single success event with all data - no separate sendEvent needed
      tracker.success({
        validation_result: validation,
        support_level: supportLevel,
        is_supported: isSupported,
        webgl2_supported: validation.webgl2.supported,
        max_texture_size: validation.limits.maxTextureSize,
        renderer: validation.renderer.unmasked_renderer,
        vendor: validation.renderer.unmasked_vendor
      });
      
      if (!isSupported) {
        this.handleWebGLUnsupported(validation);
        return false;
      }
      
      return true;
      
    } catch (error) {
      // Single error event with all context - no separate sendEvent needed
      tracker.error(error, {
        validation_failed: true,
        user_agent: navigator.userAgent,
        platform: navigator.platform
      });
      
      this.handleWebGLError(error);
      return false;
    }
  }
  
  /**
   * Check WebGL 1.0 support
   */
  static checkWebGL1Support() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      return {
        supported: !!gl,
        context: gl ? 'available' : 'unavailable'
      };
    } catch (error) {
      return {
        supported: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check WebGL 2.0 support
   */
  static checkWebGL2Support() {
    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      
      return {
        supported: !!gl2,
        context: gl2 ? 'available' : 'unavailable'
      };
    } catch (error) {
      return {
        supported: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check available WebGL extensions
   */
  static checkWebGLExtensions() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return { available: [], count: 0 };
      
      const extensions = gl.getSupportedExtensions() || [];
      
      return {
        available: extensions,
        count: extensions.length,
        hasInstancedArrays: extensions.includes('ANGLE_instanced_arrays'),
        hasVertexArrayObject: extensions.includes('OES_vertex_array_object'),
        hasTextureFloat: extensions.includes('OES_texture_float')
      };
    } catch (error) {
      return {
        available: [],
        count: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Check WebGL limits
   */
  static checkWebGLLimits() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return {};
      
      return {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * Get renderer information
   */
  static getRendererInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return {};
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      return {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        shading_language_version: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmasked_vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
        unmasked_renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * Determine WebGL support level
   */
  static determineSupportLevel(validation) {
    if (!validation.webgl2.supported) {
      return validation.webgl1.supported ? 'webgl1_only' : 'none';
    }
    
    const extensions = validation.extensions;
    const limits = validation.limits;
    
    let score = 100; // Start with maximum score
    
    // Reduce score for missing important extensions
    if (!extensions.hasInstancedArrays) score -= 10;
    if (!extensions.hasVertexArrayObject) score -= 10;
    if (!extensions.hasTextureFloat) score -= 5;
    
    // Reduce score for low limits
    if (limits.maxTextureSize < 4096) score -= 20;
    if (limits.maxVertexAttribs < 16) score -= 10;
    
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
  
  /**
   * Handle WebGL not supported
   */
  static handleWebGLUnsupported(validation) {
    ErrorHandler.logError('WebGL not supported', {
      validation_results: validation,
      user_agent: navigator.userAgent,
      platform: navigator.platform
    });
  }
  
  /**
   * Handle WebGL error
   */
  static handleWebGLError(error) {
    ErrorHandler.logModuleError('WebGLValidator', 'validateWebGLSupport', error);
  }
}

// ================================
// Unity Configuration Management
// ================================
class UnityConfigManager {
  
  /**
   * Create Unity configuration with validation
   */
  static createConfig(options) {
    const tracker = EventTracker.trackStage('Unity_Config_Creation', 'build_config');
    
    try {
      // Validate input parameters
      this.validateOptions(options);
      
      // Determine optimal dataUrl
      const dataUrl = this.selectOptimalDataUrl(options);
      
      // Base configuration
      const config = {
        dataUrl,
        frameworkUrl: options.frameworkUrl,
        streamingAssetsUrl: options.streamingAssetsUrl,
        companyName: options.companyName,
        productName: options.productName,
        productVersion: options.productVersion,
        showBanner: options.unityShowBanner ?? unityShowBanner,
        cacheControl: this.createCacheControlFunction()
      };
      
      // Add optional URLs
      this.addOptionalUrls(config, options);
      
      // Single success event with all configuration details
      tracker.success({
        data_url_type: dataUrl === options.dataFileMobileUrl ? 'mobile' : 'desktop',
        has_worker: !!options.workerUrl,
        has_wasm: !!options.codeUrl,
        cache_strategy: 'selective',
        product_name: config.productName,
        product_version: config.productVersion
      });
      
      console.log('[UnityConfigManager] Config created:', {
        dataUrl: dataUrl.substring(0, 50) + '...',
        productName: config.productName,
        productVersion: config.productVersion
      });
      
      return config;
      
    } catch (error) {
      tracker.error(error, {
        invalid_options: true,
        provided_options: Object.keys(options || {})
      });
      throw error;
    }
  }
  
  /**
   * Validate options
   */
  static validateOptions(options) {
    const required = ['frameworkUrl', 'streamingAssetsUrl', 'companyName', 'productName'];
    
    for (const field of required) {
      if (!options[field]) {
        throw new Error(`Missing required option: ${field}`);
      }
    }
    
    // Check URL validity
    try {
      new URL(options.frameworkUrl);
      new URL(options.streamingAssetsUrl);
    } catch (error) {
      throw new Error(`Invalid URL in options: ${error.message}`);
    }
  }
  
  /**
   * Select optimal dataUrl based on ASTC support
   */
  static selectOptimalDataUrl(options) {
    const astcTracker = EventTracker.trackStage('ASTC_Detection', 'check_support');
    
    try {
      let dataUrl = options.dataFilePcUrl;
      
      // Check if mobile version exists and ASTC is supported
      if (options.dataFileMobileUrl && !options.dataFileMobileUrl.startsWith('DATA_FILE_')) {
        const astcSupported = this.checkASTCSupport();
        
        if (astcSupported) {
          dataUrl = options.dataFileMobileUrl;
          astcTracker.success({ astc_supported: true, using_mobile_data: true });
        } else {
          astcTracker.success({ astc_supported: false, using_mobile_data: false });
        }
      } else {
        astcTracker.success({ mobile_data_not_available: true });
      }
      
      return dataUrl;
      
    } catch (error) {
      astcTracker.error(error);
      return options.dataFilePcUrl; // fallback
    }
  }
  
  /**
   * Check ASTC texture support
   */
  static checkASTCSupport() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const gl2 = document.createElement('canvas').getContext('webgl2');
      
      const astcSupported = (gl && gl.getExtension('WEBGL_compressed_texture_astc'))
                         || (gl2 && gl2.getExtension('WEBGL_compressed_texture_astc'));
      
      return !!astcSupported;
    } catch (error) {
      console.warn('[UnityConfigManager] ASTC check failed:', error);
      return false;
    }
  }
  
  /**
   * Create cache control function
   */
  static createCacheControlFunction() {
    return function(url) {
      // Immutable caching for .data and .wasm files
      if (url.match(/\.data/) || url.match(/\.wasm/)) {
        return "immutable";
      }
      
      // Revalidation for .bundle files
      if (url.match(/\.bundle/)) {
        return "must-revalidate";
      }
      
      // Disable caching for other files
      return "no-store";
    };
  }
  
  /**
   * Add optional URLs
   */
  static addOptionalUrls(config, options) {
    const optionalUrls = ['workerUrl', 'codeUrl', 'memoryUrl', 'symbolsUrl'];
    
    optionalUrls.forEach(urlKey => {
      if (options[urlKey]) {
        config[urlKey] = options[urlKey];
      }
    });
  }
}

// ================================
// Public API Functions
// ================================

/**
 * Handle main script loading
 */
export function onMainScriptLoaded(config) {
  const tracker = EventTracker.trackStage('Main_Script_Loading', 'process_loaded_script');
  
  try {
    console.log("[Unity] Main script loaded");
    unityState.addPerformanceMark('main_script_loaded');
    
    // Single event for script loading completion - EventTracker will send the event
    unityState.mainScriptLoaded = true;
    
    // Start Unity instance creation
    startCreateUnityInstance(config);
    
    tracker.success({
      config_provided: !!config,
      performance_mark: unityState.performanceMarks.get('main_script_loaded'),
      unity_initialization_started: true
    });
    
  } catch (error) {
    tracker.error(error, {
      config_available: !!config,
      initialization_failed: true
    });
    
    handleInitializationError({
      Error: `Main script processing failed: ${error.message}`,
      IsWebglError: false
    });
  }
}

/**
 * Show build (remove loader UI)
 */
export function showBuild() {
  const tracker = EventTracker.trackStage('Show_Build', 'remove_loader_ui');
  
  try {
    console.log("[Unity] Showing build");
    unityState.addPerformanceMark('build_shown');
    
    const loaderDiv = document.getElementById("loader_canvas_div");
    if (loaderDiv) {
      loaderDiv.remove();
      tracker.success({ loader_removed: true });
    } else {
      tracker.success({ loader_already_removed: true });
    }
    
  } catch (error) {
    tracker.error(error, { ui_cleanup_failed: true });
    console.error("[Unity] Failed to show build:", error);
  }
}

/**
 * Hello from build (first contact with Unity)
 */
export function helloBuild() {
  const tracker = EventTracker.trackStage('Build_Hello', 'first_contact');
  
  try {
    console.log("[Unity] Hello from build");
    unityState.addPerformanceMark('build_hello');
    
    // Measure time from start to first contact
    const totalTime = unityState.getTimeBetweenMarks('initialization_started', 'build_hello');
    
    tracker.success({
      total_initialization_time: totalTime,
      memory_usage: unityState.performanceMarks.get('build_hello')?.data,
      first_contact_established: true
    });
    
  } catch (error) {
    tracker.error(error, { first_contact_failed: true });
    console.error("[Unity] Build hello failed:", error);
  }
}

/**
 * Create Unity configuration
 */
export function getConfig(options) {
  return UnityConfigManager.createConfig(options);
}

/**
 * Handle focus changes
 */
export function onFocusChanged(hasFocus) {
  const tracker = EventTracker.trackStage('Focus_Change', hasFocus ? 'gained' : 'lost');
  
  try {
    if (hasFocus) {
      // Focus restored
      if (!unityState.hasEverLostFocus) {
        tracker.success({ first_focus_change: false });
        return;
      }
      
      console.log("[Unity] Focus restored");
      
    } else {
      // Focus lost
      unityState.hasEverLostFocus = true;
      console.log("[Unity] Focus lost");
    }
    
    tracker.success({
      has_ever_lost_focus: unityState.hasEverLostFocus,
      unity_loaded: !!unityState.unityInstance,
      focus_direction: hasFocus ? 'gained' : 'lost'
    });
    
  } catch (error) {
    tracker.error(error, { focus_handling_failed: true });
    console.error("[Unity] Focus change handling failed:", error);
  }
}

/**
 * Check user authorization
 */
export function isUserAuthorized() {
  try {
    const at = localStorage.getItem(CookiesConstants.ACCESS_TOKEN_PREFS_KEY);
    const metaframe_at = localStorage.getItem(CookiesConstants.XSOLLA_METAFRAME_TOKEN_PREFS_KEY);
    
    const isAuthorized = (at !== null && at.trim() !== "") || (metaframe_at !== null && metaframe_at.trim() !== "");
    
    return isAuthorized;
  } catch (error) {
    ErrorHandler.logModuleError('Unity', 'isUserAuthorized', error);
    return false;
  }
}

// ================================
// Internal Functions
// ================================

/**
 * Start Unity instance creation
 */
function startCreateUnityInstance(config) {
  if (unityState.initializationTracker) {
    console.warn("[Unity] Initialization already in progress");
    return;
  }
  
  unityState.initializationTracker = EventTracker.trackStage('Unity_Initialization', 'full_process');
  unityState.addPerformanceMark('initialization_started');
  
  console.log("[Unity] Starting Unity instance creation");

  // Check WebGL support
  if (!WebGLValidator.validateWebGLSupport()) {
    console.error("[Unity] WebGL doesn't support");
    handleInitializationError({
      Error: "WebGL 2.0 is not supported.",
      IsWebglError: true
    });
    return;
  }

  // Wait for clientId and start
  getClientId()
    .then(clientId => {
      console.log("[Unity] ClientId ready, starting build load", clientId);
      unityState.addPerformanceMark('client_id_ready', { clientId: clientId.substring(0, 8) + '...' });
      
      return startBuildLoad(config);
    })
    .catch(error => {
      console.error("[Unity] Initialization failed:", error);
      unityState.initializationTracker?.error(error, {
        stage: 'client_id_or_build_load',
        webgl_check_passed: true
      });
      
      handleInitializationError({
        Error: error.message || error,
        IsWebglError: String(error).includes("WebGL")
      });
    });
}

/**
 * Start build loading
 */
function startBuildLoad(config) {
  unityState.buildLoadTracker = EventTracker.trackStage('Unity_Build_Load', 'create_instance');
  unityState.addPerformanceMark('build_load_started');
  
  return createUnityInstance(window.MegaMod.unityCanvas, config, updateProgress)
    .then(unityInstance => {
      unityState.addPerformanceMark('build_load_completed');
      onBuildLoaded(unityInstance);
      return unityInstance;
    })
    .catch(error => {
      unityState.buildLoadTracker?.error(error, {
        config_provided: !!config,
        canvas_available: !!window.MegaMod.unityCanvas
      });
      throw error;
    });
}

/**
 * Update loading progress
 */
function updateProgress(progress) {
  try {
    trackProgress(progress);
    
    // Update UI
    if (unityState.progressBarFull) {
      unityState.progressBarFull.style.width = progress * 100 + "%";
    }
    
    // Send progress events through tracker
    const currentProgress = Math.floor(progress * 100);
    
    if (unityState.buildLoadTracker && !unityState.buildLoadTracker.isCompleted) {
      unityState.buildLoadTracker.updateProgress(currentProgress, {
        memory_usage: performance.memory?.usedJSHeapSize,
        timestamp: Date.now(),
        ui_updated: !!unityState.progressBarFull
      });
    }
    
  } catch (error) {
    ErrorHandler.logModuleError('Unity', 'updateProgress', error, { progress });
  }
}

/**
 * Track loading progress
 */
function trackProgress(progress) {
  if (unityState.loadFinished) return;
  
  const currentProgress = Math.floor(progress * 100);
  unityState.loadFinished = currentProgress === 100;
  
  const shouldLog = !unityState.loadStarted || 
                   currentProgress >= unityState.lastLoggedProgress + 10 || 
                   unityState.loadFinished;
  
  if (shouldLog) {
    console.log(`[Unity] Progress: ${currentProgress}%`);
    unityState.loadStarted = true;
    
    // Send legacy progress event (keeping for compatibility)
    const progressData = {
      Progress: currentProgress,
      IndexedDB_Available: AnalyticsState.indexedDB_Available,
      Memory_Used: performance.memory?.usedJSHeapSize,
      Timestamp: Date.now()
    };
    
    sendEvent(Events.Game_Create_Unity_Instance, progressData);
    unityState.lastLoggedProgress = currentProgress;
  }
}

/**
 * Handle build loading completion
 */
function onBuildLoaded(unityInstance) {
  const completionTracker = EventTracker.trackStage('Build_Load_Completion', 'finalize');
  
  try {
    console.log("[Unity] Build loaded successfully");
    unityState.addPerformanceMark('build_loaded');
    unityState.unityInstance = unityInstance;

    // Cleanup
    if (window.MegaMod.focusTracker) {
      window.MegaMod.focusTracker.dispose();
      window.MegaMod.focusTracker = null;
    }
    
    stopChecking();
    trackProgress(1);
    
    // Measure loading times
    const buildLoadTime = unityState.getTimeBetweenMarks('build_load_started', 'build_loaded');
    const totalTime = unityState.getTimeBetweenMarks('initialization_started', 'build_loaded');
    
    // Send legacy completion event (keeping for compatibility)
    sendEvent(Events.Client_Build_Load_Finished, {
      build_load_time: buildLoadTime,
      total_initialization_time: totalTime,
      memory_final: performance.memory?.usedJSHeapSize
    });

    #if SHOW_DIAGNOSTICS
      setupDiagnostics(unityInstance);
    #endif

    // Save global reference
    window.MegaMod.myGameInstance = unityInstance;
    
    // Complete trackers with comprehensive data
    unityState.buildLoadTracker?.success({
      build_load_time: buildLoadTime,
      instance_created: true,
      memory_final: performance.memory?.usedJSHeapSize,
      diagnostics_setup: true
    });
    
    unityState.initializationTracker?.success({
      total_time: totalTime,
      final_memory: performance.memory?.usedJSHeapSize,
      unity_instance_ready: true,
      focus_tracker_cleaned: true,
      global_reference_set: true
    });
    
    completionTracker.success({
      unity_instance_ready: true,
      performance_summary: Object.fromEntries(unityState.performanceMarks),
      build_load_time: buildLoadTime,
      total_initialization_time: totalTime
    });
    
  } catch (error) {
    completionTracker.error(error, {
      instance_available: !!unityInstance,
      cleanup_attempted: true
    });
    
    ErrorHandler.logModuleError('Unity', 'onBuildLoaded', error);
    handleInitializationError({
      Error: `Build finalization failed: ${error.message}`,
      IsWebglError: false
    });
  }
}

#if SHOW_DIAGNOSTICS
/**
 * Setup diagnostics
 */
function setupDiagnostics(unityInstance) {
  try {
    const diagnosticsIcon = document.getElementById("diagnostics-icon");
    if (diagnosticsIcon && unityDiagnostics) {
      diagnosticsIcon.onclick = () => {
        unityDiagnostics.openDiagnosticsDiv(unityInstance.GetMemoryInfo);
      };
      console.log("[Unity] Diagnostics setup completed");
    }
  } catch (error) {
    ErrorHandler.logModuleError('Unity', 'setupDiagnostics', error);
  }
}
#endif

/**
 * Centralized initialization error handling
 */
function handleInitializationError(errorObj) {
  const errorTracker = EventTracker.trackStage('Initialization_Error_Handling', 'process_error');
  
  try {
    console.error("[Unity] Initialization error:", errorObj.Error);
    
    // Cleanup state
    unityState.cleanup();
    
    // Send legacy error event (keeping for compatibility)
    sendEvent(Events.Game_Error_Initialization, { 
      Error: errorObj.Error,
      IsWebglError: errorObj.IsWebglError,
      UserAgent: navigator.userAgent,
      Platform: navigator.platform,
      Memory: performance.memory?.usedJSHeapSize
    });

    // Special handling for WebGL errors
    if (errorObj.IsWebglError) {
      onWebGLError(null, window.MegaMod.isMobile);
      
      // Log WebGL specific information
      const webglInfo = WebGLValidator.getRendererInfo();
      ErrorHandler.logError('WebGL Error during initialization', {
        error: errorObj.Error,
        webgl_info: webglInfo,
        is_mobile: window.MegaMod.isMobile
      });
    }
    
    // Show user message
    const shouldReload = confirm(`Loading error: ${errorObj.Error}\n\nReload page?`);
    if (shouldReload) {
      window.location.reload();
    }
    
    errorTracker.success({
      error_handled: true,
      webgl_error: errorObj.IsWebglError,
      user_chose_reload: shouldReload,
      cleanup_completed: true
    });
    
  } catch (handlingError) {
    errorTracker.error(handlingError, {
      original_error: errorObj.Error,
      handling_failed: true
    });
    
    console.error("[Unity] Failed to handle initialization error:", handlingError);
    
    // Fallback - simple alert without reload
    alert(`Critical error: ${errorObj.Error}`);
  }
}

/**
 * Unity banner display (for debugging)
 */
function unityShowBanner(msg, type) {
  const bannerTracker = EventTracker.trackStage('Unity_Banner', 'show_message');
  
  try {
    const warningBanner = document.querySelector("#unity-warning");
    
    if (!warningBanner) {
      bannerTracker.error(new Error('Warning banner element not found'));
      return;
    }

    function updateBannerVisibility() {
      warningBanner.style.display = warningBanner.children.length ? "block" : "none";
    }

    const div = document.createElement("div");
    div.innerHTML = msg;
    warningBanner.appendChild(div);
    
    // Styling based on type
    if (type === "error") {
      div.style = "background: red; padding: 10px;";
    } else if (type === "warning") {
      div.style = "background: yellow; padding: 10px;";
      // Auto-remove after 5 seconds for warnings
      setTimeout(() => {
        if (div.parentNode) {
          warningBanner.removeChild(div);
          updateBannerVisibility();
        }
      }, 5000);
    }
    
    updateBannerVisibility();
    
    bannerTracker.success({
      message_type: type,
      message_shown: true,
      message_length: msg.length,
      is_error: type === "error"
    });
    
  } catch (error) {
    bannerTracker.error(error, {
      message_type: type,
      banner_creation_failed: true
    });
    
    ErrorHandler.logModuleError('Unity', 'unityShowBanner', error, { msg, type });
  }
}

// ================================
// Mobile Content Handling
// ================================

/**
 * Load mobile content
 */
export function loadMobileContent() {
  const mobileTracker = EventTracker.trackStage('Mobile_Content_Load', 'load_mobile_page');
  
  try {
    // Setup viewport for mobile
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "initial-scale=1.0";
    document.getElementsByTagName("head")[0].appendChild(meta);

    // Load mobile HTML
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "html/mobile.html", true);
    
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          processMobileHTML(xhr.responseText);
          mobileTracker.success({
            mobile_html_loaded: true,
            response_size: xhr.responseText.length,
            viewport_configured: true
          });
        } else {
          const error = new Error(`Failed to load mobile HTML: ${xhr.status}`);
          mobileTracker.error(error, {
            http_status: xhr.status,
            ready_state: xhr.readyState
          });
          ErrorHandler.logModuleError('Unity', 'loadMobileContent', error);
        }
      }
    };
    
    xhr.onerror = function() {
      const error = new Error('Network error loading mobile HTML');
      mobileTracker.error(error, {
        network_error: true,
        url: "html/mobile.html"
      });
      ErrorHandler.logModuleError('Unity', 'loadMobileContent', error);
    };
    
    xhr.send();
    
  } catch (error) {
    mobileTracker.error(error, {
      xhr_setup_failed: true
    });
    ErrorHandler.logModuleError('Unity', 'loadMobileContent', error);
  }
}

/**
 * Process mobile HTML
 */
function processMobileHTML(responseText) {
  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = responseText;

    // Add styles
    const styles = tempDiv.querySelectorAll("style");
    styles.forEach(style => document.head.appendChild(style));

    // Show mobile content
    const mobileDiv = tempDiv.querySelector(".mobile-container");
    const mobileContent = document.getElementById("mobile-content");
    
    if (mobileDiv && mobileContent) {
      mobileContent.appendChild(mobileDiv);
      mobileContent.style.display = "block";
      mobileDiv.style.display = "flex";
      
      // Hide Unity container
      if (window.MegaMod.unityContainer) {
        window.MegaMod.unityContainer.style.display = "none";
      }
      
      console.log("[Unity] Mobile content displayed");
    } else {
      throw new Error('Mobile container or content element not found');
    }
    
  } catch (error) {
    ErrorHandler.logModuleError('Unity', 'processMobileHTML', error);
  }
}

// ================================
// Cleanup and Memory Management
// ================================

/**
 * Cleanup Unity resources
 */
export function cleanupUnity() {
  const cleanupTracker = EventTracker.trackStage('Unity_Cleanup', 'full_cleanup');
  
  try {
    console.log("[Unity] Starting cleanup");
    
    // Cleanup state
    unityState.cleanup();
    
    // Force complete active operations
    EventTracker.forceCompleteAll('Unity cleanup');
    
    // Clear global references
    if (window.MegaMod && window.MegaMod.myGameInstance) {
      try {
        // Attempt proper Unity instance shutdown
        if (typeof window.MegaMod.myGameInstance.Quit === 'function') {
          window.MegaMod.myGameInstance.Quit();
        }
      } catch (quitError) {
        console.warn("[Unity] Failed to quit Unity instance:", quitError);
      }
      
      window.MegaMod.myGameInstance = null;
    }
    
    cleanupTracker.success({
      state_cleaned: true,
      trackers_completed: true,
      unity_instance_cleared: true,
      global_references_cleared: true
    });
    
    console.log("[Unity] Cleanup completed");
    
  } catch (error) {
    cleanupTracker.error(error, {
      cleanup_failed: true,
      partial_cleanup: true
    });
    
    ErrorHandler.logModuleError('Unity', 'cleanupUnity', error);
  }
}

// ================================
// Performance Monitoring
// ================================

/**
 * Start periodic Unity performance monitoring
 */
function startPerformanceMonitoring() {
  if (!unityState.unityInstance) return;
  
  const monitoringInterval = setInterval(() => {
    try {
      if (!unityState.unityInstance) {
        clearInterval(monitoringInterval);
        return;
      }
      
      const memoryInfo = performance.memory;
      if (memoryInfo) {
        const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
        
        // Warning for high memory usage
        if (usagePercent > 80) {
          EventTracker.logCriticalEvent(Events.System_Memory_Warning, {
            usage_percent: usagePercent,
            used_mb: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
            limit_mb: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
          });
        }
        
        // Critical warning
        if (usagePercent > 95) {
          EventTracker.logCriticalEvent(Events.System_Memory_Critical, {
            usage_percent: usagePercent,
            used_mb: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
          });
        }
      }
      
    } catch (error) {
      ErrorHandler.logModuleError('Unity', 'performanceMonitoring', error);
    }
  }, 10000); // Every 10 seconds
}

// Start monitoring after Unity loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(startPerformanceMonitoring, 5000);
  });
}

// ================================
// Global Error Handlers for Unity
// ================================

// Handle WebGL context lost
if (typeof document !== 'undefined') {
  document.addEventListener('webglcontextlost', (event) => {
    EventTracker.logCriticalEvent(Events.HTML_WebGL_Context_Lost, {
      status_message: event.statusMessage,
      can_restore: event.statusMessage !== 'loseContext'
    });
    
    event.preventDefault();
    
    // Attempt recovery after 1 second
    setTimeout(() => {
      try {
        const canvas = event.target;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl && !gl.isContextLost()) {
          EventTracker.logCriticalEvent(Events.HTML_WebGL_Context_Recovered, {
            recovery_time: Date.now()
          });
        }
      } catch (error) {
        ErrorHandler.logModuleError('Unity', 'webglContextRecovery', error);
      }
    }, 1000);
  });
}

// Cleanup on page close
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupUnity();
  });
}

export default {
  UnityState: unityState,
  WebGLValidator,
  UnityConfigManager,
  cleanupUnity,
  // Export for testing
  _internal: {
    handleInitializationError,
    updateProgress,
    trackProgress,
    onBuildLoaded
  }
};