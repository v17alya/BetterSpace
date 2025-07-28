// SRC/CORE/ERRORHANDLER.MODULE.JS
// Centralized Error handler with improved login

import { sendEvent } from "../amplitude.module.js";
import Events from "../analytics_events.module.js";

/**
 * Centralized Class for Error Processing
 */
export class ErrorHandler {
  static instance = null;

  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }

    this.errorCount = 0;
    this.errorHistory = [];
    this.maxHistorySize = 50;
    this.isInitialized = false;

    ErrorHandler.instance = this;
  }

  /**
   * Initialization of global error handlers
   */
  static initialize() {
    const handler = new ErrorHandler();
    if (handler.isInitialized) {
      return handler;
    }

    // Global JavaScript Error handler
    window.addEventListener("error", (event) => {
      handler.handleGlobalError({
        type: "javascript_error",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
      });
    });

    // The raw handwriter
    window.addEventListener("unhandledrejection", (event) => {
      handler.handleGlobalError({
        type: "unhandled_promise_rejection",
        message: event.reason?.message || "Unhandled Promise Rejection",
        reason: event.reason,
        stack: event.reason?.stack,
        promise: event.promise,
      });
    });

    // WebGL loss handler
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        canvas.addEventListener("webglcontextlost", (event) => {
          handler.handleWebGLError(event);
        });
      }
    }

    handler.isInitialized = true;
    console.log("[ErrorHandler] Initialized successfully");

    return handler;
  }

  /**
   * Processing of global errors
   */
  handleGlobalError(errorData) {
    this.errorCount++;

    const enrichedError = this.enrichErrorData(errorData);
    this.addToHistory(enrichedError);

    // Logging in a console to develop
    console.error("[ErrorHandler] Global Error:", enrichedError);

    // Sending to analytics
    this.sendToAnalytics(enrichedError);

    // Shipment to Firebase (if available)
    this.sendToFirebase(enrichedError);

    // Checking for critical errors
    if (this.isCriticalError(enrichedError)) {
      this.handleCriticalError(enrichedError);
    }
  }

  /**
   * WEBGL processing
   */
  handleWebGLError(event) {
    const errorData = {
      type: "webgl_context_lost",
      message: "WebGL context was lost",
      statusMessage: event.statusMessage,
      timestamp: Date.now(),
    };

    this.handleGlobalError(errorData);

    // Try to restore the context
    this.attemptWebGLRecovery(event);
  }

  /**
   * Attempt to restore Webgl context
   */
  attemptWebGLRecovery(event) {
    event.preventDefault();

    setTimeout(() => {
      try {
        // Webgl Context Recovery Logic
        const canvas = event.target;
        const gl =
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

        if (gl && !gl.isContextLost()) {
          sendEvent(Events.HTML_WebGL_Context_Recovered, {
            recovery_time: Date.now(),
          });
          console.log("[ErrorHandler] WebGL context recovered");
        }
      } catch (error) {
        this.handleGlobalError({
          type: "webgl_recovery_failed",
          message: "Failed to recover WebGL context",
          error: error.message,
        });
      }
    }, 1000);
  }

  /**
   * Enriching an error data
   */
  enrichErrorData(errorData) {
    return {
      ...errorData,
      errorId: this.generateErrorId(),
      timestamp: Date.now(),
      errorCount: this.errorCount,
      sessionId: this.getSessionId(),

      // Browser and system
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,

      // Page
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,

      // Viewport
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,

      // Productivity
      memory: this.getMemoryInfo(),
      timing: this.getTimingInfo(),

      // Local Storage Availability
      localStorageAvailable: this.checkLocalStorageAvailable(),

      // Webgl Information
      webglInfo: this.getWebGLInfo(),
    };
  }

  /**
   * Generation of a unique ID error
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Getting Session ID
   */
  getSessionId() {
    // We use the existing mechanism with Analytics.Module.js
    if (typeof getCurrentSessionId === "function") {
      return getCurrentSessionId();
    }
    return sessionStorage.getItem("sessionId") || "unknown";
  }

  /**
   * Receiving information about memory
   */
  getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Obtaining TIMING INFORMATION
   */
  getTimingInfo() {
    if (performance.timing) {
      const timing = performance.timing;
      return {
        domContentLoaded:
          timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
      };
    }
    return null;
  }

  /**
   * Checking the availability of Local Storage
   */
  checkLocalStorageAvailable() {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Obtaining WebGL information
   */
  getWebGLInfo() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (!gl) {
        return { supported: false };
      }

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

      return {
        supported: true,
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : "Unknown",
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      };
    } catch (error) {
      return {
        supported: false,
        error: error.message,
      };
    }
  }

  /**
   * Adding a mistake to the story
   */
  addToHistory(errorData) {
    this.errorHistory.push(errorData);

    // We limit the size of the story
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Sending to analytics
   */
  sendToAnalytics(errorData) {
    try {
      sendEvent(
        Events.HTML_Window_Error,
        {
          error_type: errorData.type,
          error_message: errorData.message,
          error_id: errorData.errorId,
          error_count: errorData.errorCount,
          filename: errorData.filename,
          line: errorData.lineno,
          column: errorData.colno,
          stack_trace: errorData.stack?.substring(0, 1000), // We limit the length
          user_agent: errorData.userAgent,
          url: errorData.url,
          memory_used: errorData.memory?.usedJSHeapSize,
          webgl_supported: errorData.webglInfo?.supported,
        },
        {},
        true
      ); // Ignoreorder = TRUE for Errors
    } catch (analyticsError) {
      console.error(
        "[ErrorHandler] Failed to send to analytics:",
        analyticsError
      );
    }
  }

  /**
   * Sending to Firebase
   */
  sendToFirebase(errorData) {
    try {
      // We use the existing Firebase Logger if available
      if (
        window.firebaseLogger &&
        typeof window.firebaseLogger.log === "function"
      ) {
        window.firebaseLogger.log("error", {
          message: errorData.message,
          type: errorData.type,
          errorId: errorData.errorId,
          stack: errorData.stack,
          url: errorData.url,
          timestamp: errorData.timestamp,
        });
      }
    } catch (firebaseError) {
      console.error(
        "[ErrorHandler] Failed to send to Firebase:",
        firebaseError
      );
    }
  }

  /**
   * Check Whether an error is critical
   */
  isCriticalError(errorData) {
    const criticalPatterns = [
      /webgl/i,
      /unity/i,
      /out of memory/i,
      /script error/i,
      /network error/i,
    ];

    return criticalPatterns.some(
      (pattern) =>
        pattern.test(errorData.message) || pattern.test(errorData.type)
    );
  }

  /**
   * Critical errors processing
   */
  handleCriticalError(errorData) {
    console.error("[ErrorHandler] CRITICAL ERROR:", errorData);

    // Sending a critical error with a higher priority
    sendEvent(
      Events.HTML_Critical_Error,
      {
        error_id: errorData.errorId,
        error_type: errorData.type,
        error_message: errorData.message,
        total_errors: this.errorCount,
      },
      {},
      true
    );

    // You may need to show a message to the user
    if (errorData.type === "webgl_context_lost") {
      this.showUserNotification(
        "WebGL підтримка втрачена. Спробуйте перезавантажити сторінку."
      );
    }
  }

  /**
   * Post to the user
   */
  showUserNotification(message) {
    // Can be replaced with a more elegant solution
    if (confirm(`Помилка: ${message}\n\nПерезавантажити сторінку?`)) {
      window.location.reload();
    }
  }

  /**
   * Obtaining errors
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorHistory.slice(-10),
      errorTypes: this.getErrorTypeStats(),
    };
  }

  /**
   * Error types statistics
   */
  getErrorTypeStats() {
    const typeStats = {};
    this.errorHistory.forEach((error) => {
      typeStats[error.type] = (typeStats[error.type] || 0) + 1;
    });
    return typeStats;
  }

  /**
   * Manual error processing
   */
  static logError(message, context = {}, error = null) {
    const handler = ErrorHandler.instance || new ErrorHandler();

    handler.handleGlobalError({
      type: "manual_error",
      message,
      context,
      error: error?.message,
      stack: error?.stack,
    });
  }

  /**
   * Processing specific module errors
   */
  static logModuleError(moduleName, operation, error, context = {}) {
    const handler = ErrorHandler.instance || new ErrorHandler();

    handler.handleGlobalError({
      type: "module_error",
      message: `${moduleName}: ${operation} failed`,
      module: moduleName,
      operation,
      error: error?.message || error,
      stack: error?.stack,
      context,
    });
  }
}

// Initialization when importing module
ErrorHandler.initialize();

export default ErrorHandler;
