// src/core/EventTracker.module.js
// Centralized tracker for monitoring all stages and operations with proper event management

import { sendEvent } from "../amplitude.module.js";
import Events from "../analytics_events.module.js";
import ErrorHandler from "./ErrorHandler.module.js";

/**
 * Class for tracking individual stage/operation
 */
export class StageTracker {
  constructor(stageName, operation, context = {}) {
    this.stageName = stageName;
    this.operation = operation;
    this.context = context;
    this.startTime = performance.now();
    this.startTimestamp = Date.now();
    this.isCompleted = false;
    this.childTrackers = [];
    this.metadata = {};

    // ID for linking start and end of operation
    this.trackingId = this.generateTrackingId();

    this.sendStartEvent();
  }

  /**
   * Generate unique ID for operation
   */
  generateTrackingId() {
    return `${this.stageName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Send operation start event
   */
  sendStartEvent() {
    const eventData = {
      tracking_id: this.trackingId,
      operation: this.operation,
      stage: this.stageName,
      timestamp: this.startTimestamp,
      memory_before: this.getMemoryUsage(),
      performance_now: this.startTime,
      ...this.context,
    };

    try {
      // Only send Started event - no duplicates
      const startEventName = Events.GetAnalyticsEventStartKey(this.stageName);
      sendEvent(startEventName, eventData);
      console.log(
        `[EventTracker] Started: ${this.stageName} (${this.operation})`
      );
    } catch (error) {
      ErrorHandler.logModuleError("EventTracker", "sendStartEvent", error, {
        stageName: this.stageName,
        operation: this.operation,
      });
    }
  }

  /**
   * Add metadata to operation
   */
  addMetadata(key, value) {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Update operation progress
   */
  updateProgress(progress, details = {}) {
    if (this.isCompleted) {
      console.warn(
        `[EventTracker] Cannot update progress for completed operation: ${this.stageName}`
      );
      return this;
    }

    const eventData = {
      tracking_id: this.trackingId,
      operation: this.operation,
      stage: this.stageName,
      progress: Math.min(100, Math.max(0, progress)),
      duration_so_far: Math.round(performance.now() - this.startTime),
      ...details,
      ...this.metadata,
    };

    try {
      // Send Progress event
      const progressEventName = Events.GetAnalyticsEventProgressKey(
        this.stageName
      );
      sendEvent(progressEventName, eventData);
    } catch (error) {
      ErrorHandler.logModuleError("EventTracker", "updateProgress", error, {
        stageName: this.stageName,
        progress,
      });
    }

    return this;
  }

  /**
   * Successful completion of operation
   * @param {Object} data - Additional data to include in success event
   */
  success(data = {}) {
    if (this.isCompleted) {
      console.warn(
        `[EventTracker] Operation already completed: ${this.stageName}`
      );
      return this;
    }

    const duration = Math.round(performance.now() - this.startTime);
    const eventData = {
      tracking_id: this.trackingId,
      operation: this.operation,
      stage: this.stageName,
      duration_ms: duration,
      duration_readable: this.formatDuration(duration),
      timestamp_end: Date.now(),
      memory_after: this.getMemoryUsage(),
      memory_delta: this.getMemoryDelta(),
      child_operations: this.childTrackers.length,
      ...data, // User-provided success data
      ...this.metadata,
    };

    this.isCompleted = true;

    try {
      // Send Success event - this replaces manual sendEvent calls
      const successEventName = Events.GetAnalyticsEventSuccessKey(
        this.stageName
      );
      sendEvent(successEventName, eventData);
      console.log(`[EventTracker] Success: ${this.stageName} (${duration}ms)`);
    } catch (error) {
      ErrorHandler.logModuleError("EventTracker", "success", error, {
        stageName: this.stageName,
        duration,
      });
    }

    return this;
  }

  /**
   * Operation completion with error
   * @param {Error} error - Error that occurred
   * @param {Object} data - Additional error context
   */
  error(error, data = {}) {
    if (this.isCompleted) {
      console.warn(
        `[EventTracker] Operation already completed: ${this.stageName}`
      );
      return this;
    }

    const duration = Math.round(performance.now() - this.startTime);
    const errorData = {
      tracking_id: this.trackingId,
      operation: this.operation,
      stage: this.stageName,
      duration_ms: duration,
      duration_readable: this.formatDuration(duration),
      timestamp_end: Date.now(),
      error_message: error?.message || error?.toString() || "Unknown error",
      error_type: error?.constructor?.name || "Error",
      error_stack: error?.stack?.substring(0, 1000), // Limit length
      memory_after: this.getMemoryUsage(),
      child_operations: this.childTrackers.length,
      ...data, // User-provided error context
      ...this.metadata,
    };

    this.isCompleted = true;

    try {
      // Send Error event - this replaces manual sendEvent calls
      const errorEventName = Events.GetAnalyticsEventErrorKey(this.stageName);
      sendEvent(errorEventName, errorData);
      console.error(
        `[EventTracker] Error: ${this.stageName} (${duration}ms)`,
        error
      );

      // Also log through ErrorHandler for additional processing
      ErrorHandler.logModuleError("StageTracker", this.operation, error, {
        stageName: this.stageName,
        trackingId: this.trackingId,
        duration,
      });
    } catch (sendError) {
      console.error(`[EventTracker] Failed to send error event:`, sendError);
    }

    return this;
  }

  /**
   * Create child tracker
   */
  createChild(childStageName, childOperation, context = {}) {
    const childTracker = new StageTracker(
      `${this.stageName}_${childStageName}`,
      childOperation,
      {
        ...context,
        parent_tracking_id: this.trackingId,
        parent_stage: this.stageName,
      }
    );

    this.childTrackers.push(childTracker);
    return childTracker;
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  /**
   * Calculate memory delta
   */
  getMemoryDelta() {
    const currentMemory = this.getMemoryUsage();
    const startMemory = this.context.memory_before || { used: 0 };
    return currentMemory.used - startMemory.used;
  }

  /**
   * Format duration in readable format
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Get operation statistics
   */
  getStats() {
    return {
      trackingId: this.trackingId,
      stageName: this.stageName,
      operation: this.operation,
      isCompleted: this.isCompleted,
      duration: this.isCompleted
        ? Math.round(performance.now() - this.startTime)
        : null,
      childCount: this.childTrackers.length,
      metadata: this.metadata,
    };
  }
}

/**
 * Main EventTracker class
 */
export class EventTracker {
  static activeTrackers = new Map();
  static completedTrackers = [];
  static maxCompletedHistory = 100;

  /**
   * Create new stage tracker
   * @param {string} stageName - Name of the stage/operation
   * @param {string} operation - Specific operation being performed
   * @param {Object} context - Additional context for the operation
   * @returns {StageTracker} New tracker instance
   */
  static trackStage(stageName, operation, context = {}) {
    const tracker = new StageTracker(stageName, operation, context);

    // Store active trackers
    EventTracker.activeTrackers.set(tracker.trackingId, tracker);

    return tracker;
  }

  /**
   * Create quick tracker for simple async operations
   * @param {string} stageName - Name of the stage
   * @param {string} operation - Operation description
   * @param {Function} asyncFunction - Async function to execute
   * @param {Object} context - Additional context
   * @returns {Promise} Promise that resolves/rejects with original result
   */
  static quickTrack(stageName, operation, asyncFunction, context = {}) {
    const tracker = EventTracker.trackStage(stageName, operation, context);

    return Promise.resolve(asyncFunction())
      .then((result) => {
        tracker.success({ result_type: typeof result });
        return result;
      })
      .catch((error) => {
        tracker.error(error);
        throw error;
      })
      .finally(() => {
        EventTracker.moveToCompleted(tracker);
      });
  }

  /**
   * Move completed tracker from active to history
   */
  static moveToCompleted(tracker) {
    EventTracker.activeTrackers.delete(tracker.trackingId);
    EventTracker.completedTrackers.push(tracker.getStats());

    // Limit history size
    if (
      EventTracker.completedTrackers.length > EventTracker.maxCompletedHistory
    ) {
      EventTracker.completedTrackers.shift();
    }
  }

  /**
   * Get statistics of all operations
   */
  static getGlobalStats() {
    const activeStats = Array.from(EventTracker.activeTrackers.values()).map(
      (tracker) => tracker.getStats()
    );

    return {
      active: activeStats,
      completed: EventTracker.completedTrackers,
      totalActive: activeStats.length,
      totalCompleted: EventTracker.completedTrackers.length,
    };
  }

  /**
   * Force complete all active trackers with error (for cleanup)
   */
  static forceCompleteAll(reason = "Force cleanup") {
    EventTracker.activeTrackers.forEach((tracker) => {
      if (!tracker.isCompleted) {
        tracker.error(new Error(reason));
        EventTracker.moveToCompleted(tracker);
      }
    });

    EventTracker.activeTrackers.clear();
  }

  /**
   * Log critical event without tracking (for immediate events)
   * NOTE: Use this sparingly - prefer trackStage for most operations
   * @param {string} eventName - Event name from Events constants
   * @param {Object} data - Event data
   */
  static logCriticalEvent(eventName, data = {}) {
    const eventData = {
      timestamp: Date.now(),
      critical: true,
      memory: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          }
        : null,
      ...data,
    };

    try {
      sendEvent(eventName, eventData, {}, true); // ignoreOrder for critical events
      console.warn(`[EventTracker] Critical Event: ${eventName}`, eventData);
    } catch (error) {
      ErrorHandler.logError("Failed to log critical event", {
        eventName,
        originalData: data,
      });
    }
  }

  /**
   * Send performance metrics
   */
  static sendPerformanceMetrics() {
    const tracker = EventTracker.trackStage("Performance_Metrics", "collect");

    try {
      const metrics = {
        // Navigation Timing
        navigation: EventTracker.getNavigationTiming(),

        // Resource Timing
        resources: EventTracker.getResourceTiming(),

        // Memory
        memory: EventTracker.getMemoryInfo(),

        // Connection
        connection: EventTracker.getConnectionInfo(),

        // Active trackers count
        active_operations: EventTracker.activeTrackers.size,
      };

      // Success automatically sends Performance_Metrics_Success event
      tracker.success(metrics);
    } catch (error) {
      tracker.error(error);
    }
  }

  /**
   * Get Navigation Timing metrics
   */
  static getNavigationTiming() {
    if (!performance.timing) return null;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    return {
      dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcp_connect: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom_processing: timing.domComplete - timing.domLoading,
      load_complete: timing.loadEventEnd - navigationStart,
      dom_content_loaded: timing.domContentLoadedEventEnd - navigationStart,
    };
  }

  /**
   * Get Resource Timing metrics
   */
  static getResourceTiming() {
    if (!performance.getEntriesByType) return null;

    const resources = performance.getEntriesByType("resource");
    const summary = {
      total_resources: resources.length,
      by_type: {},
      slow_resources: [],
    };

    resources.forEach((resource) => {
      // Group by type
      const type = resource.initiatorType || "other";
      summary.by_type[type] = (summary.by_type[type] || 0) + 1;

      // Slow resources (more than 2 seconds)
      if (resource.duration > 2000) {
        summary.slow_resources.push({
          name: resource.name.substring(0, 100), // Limit length
          duration: Math.round(resource.duration),
          size: resource.transferSize || 0,
          type: type,
        });
      }
    });

    return summary;
  }

  /**
   * Get memory information
   */
  static getMemoryInfo() {
    if (!performance.memory) return null;

    return {
      used_mb: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total_mb: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit_mb: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      usage_percent: Math.round(
        (performance.memory.usedJSHeapSize /
          performance.memory.jsHeapSizeLimit) *
          100
      ),
    };
  }

  /**
   * Get connection information
   */
  static getConnectionInfo() {
    if (!navigator.connection) return null;

    return {
      effective_type: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      save_data: navigator.connection.saveData,
    };
  }
}

// Add global handlers for metrics collection
if (typeof window !== "undefined") {
  // Collect metrics on load
  window.addEventListener("load", () => {
    setTimeout(() => {
      EventTracker.sendPerformanceMetrics();
    }, 1000);
  });

  // Collect metrics before page close
  window.addEventListener("beforeunload", () => {
    EventTracker.logCriticalEvent("Page_Unload", {
      active_operations: EventTracker.activeTrackers.size,
      total_completed: EventTracker.completedTrackers.length,
    });

    // Complete all active operations
    EventTracker.forceCompleteAll("Page unload");
  });

  // Periodic metrics collection (every 30 seconds)
  setInterval(() => {
    EventTracker.sendPerformanceMetrics();
  }, 30000);
}

export default EventTracker;
