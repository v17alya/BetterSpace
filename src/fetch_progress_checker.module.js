// src/fetch_progress_checker.module.js
// Improved module to track out the progress of downloading files with detailed analytics

import Events from "./analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "./amplitude.module.js?v={{{ PRODUCT_VERSION }}}";
import { EventTracker } from "./core/EventTracker.module.js?v={{{ PRODUCT_VERSION }}}";
import ErrorHandler from "./core/ErrorHandler.module.js?v={{{ PRODUCT_VERSION }}}";

// ================================
// Configuration & State
// ================================
class FetchProgressState {
  constructor() {
    this.fetchProgressData = {};
    this.allFilesLoaded = false;
    this.intervalId = null;
    this.intervalSeconds = 10;
    this.originalFetch = window.fetch;
    this.reportedErrors = new Set();
    this.reportedSuccesses = new Set();
    this.systemTracker = null;
    this.startTime = Date.now();

    // Configuration of the tracked files
    this.trackedFileConfig = [
      { suffix: ".data.br", name: "DataFile", critical: true },
      { suffix: ".wasm.br", name: "WasmFile", critical: true },
      { suffix: ".framework.js.br", name: "FrameworkFile", critical: false },
      { suffix: ".symbols.json.br", name: "SymbolsFile", critical: false },
    ];

    // Network metrics
    this.networkMetrics = {
      totalBytes: 0,
      totalFiles: 0,
      averageSpeed: 0,
      slowestFile: null,
      fastestFile: null,
      errors: [],
    };
  }

  /**
   * Cleaning the condition
   */
  cleanup() {
    this.fetchProgressData = {};
    this.reportedErrors.clear();
    this.reportedSuccesses.clear();
    this.networkMetrics = {
      totalBytes: 0,
      totalFiles: 0,
      averageSpeed: 0,
      slowestFile: null,
      fastestFile: null,
      errors: [],
    };
  }

  /**
   * Obtaining statistics
   */
  getStats() {
    return {
      totalFiles: Object.keys(this.fetchProgressData).length,
      completedFiles: Object.values(this.fetchProgressData).filter(
        (data) => data.status === "loaded"
      ).length,
      errorFiles: Object.values(this.fetchProgressData).filter(
        (data) => data.status === "error"
      ).length,
      totalBytes: this.networkMetrics.totalBytes,
      averageSpeed: this.networkMetrics.averageSpeed,
      duration: Date.now() - this.startTime,
    };
  }
}

const progressState = new FetchProgressState();

// =====================================================body
// FILE PROGRESS TRACKING
// =====================================================body
class FileProgressTracker {
  /**
   * Initialization of file tracking
   */
  static initializeFile(resource, name, totalSize) {
    const tracker = EventTracker.trackStage(
      "File_Download",
      `${name}_download`,
      {
        resource_url: resource.substring(0, 100),
        file_type: name,
        file_size: totalSize,
      }
    );

    progressState.fetchProgressData[resource] = {
      name,
      totalSize: totalSize || -1,
      loaded: 0,
      startTime: performance.now(),
      lastUpdateTime: performance.now(),
      averageSpeed: 0,
      elapsedTime: 0,
      intervalBytes: 0,
      intervalTime: 0,
      status: "in-progress",
      tracker,

      // Additional metrics
      peakSpeed: 0,
      minSpeed: Infinity,
      speedHistory: [],
      stalls: 0, // Number of boot stops
      lastProgressUpdate: Date.now(),
    };

    console.log(
      `[FetchProgress] Started tracking: ${name} (${this.formatSize(
        totalSize
      )})`
    );

    // Sending an initial event
    sendEvent(Events.Resource_Load_Started, {
      resource_name: name,
      resource_size: totalSize,
      resource_url: resource.substring(0, 100),
    });

    return progressState.fetchProgressData[resource];
  }

  /**
   * File progress update
   */
  static updateFileProgress(resource, chunkSize) {
    const fileData = progressState.fetchProgressData[resource];
    if (!fileData) return;

    const now = performance.now();
    const timeDelta = (now - fileData.lastUpdateTime) / 1000;

    // Updating basic metrics
    fileData.loaded += chunkSize;
    fileData.intervalTime += timeDelta;
    fileData.intervalBytes += chunkSize;
    fileData.lastUpdateTime = now;
    fileData.elapsedTime = (now - fileData.startTime) / 1000;

    // Speed calculation
    const currentSpeed =
      fileData.elapsedTime > 0
        ? Math.round(fileData.loaded / fileData.elapsedTime)
        : 0;
    fileData.averageSpeed = currentSpeed;

    // Peak speeding
    if (currentSpeed > fileData.peakSpeed) {
      fileData.peakSpeed = currentSpeed;
    }

    if (currentSpeed < fileData.minSpeed && currentSpeed > 0) {
      fileData.minSpeed = currentSpeed;
    }

    // Stop tracking (if there is no progress for more than 2 seconds)
    const timeSinceLastProgress = Date.now() - fileData.lastProgressUpdate;
    if (timeSinceLastProgress > 2000) {
      fileData.stalls++;
    }
    fileData.lastProgressUpdate = Date.now();

    // Updating speed history (last 10 measurements)
    fileData.speedHistory.push(currentSpeed);
    if (fileData.speedHistory.length > 10) {
      fileData.speedHistory.shift();
    }

    // Progress tracker
    if (fileData.tracker && !fileData.tracker.isCompleted) {
      const progressPercent =
        fileData.totalSize > 0
          ? Math.round((fileData.loaded / fileData.totalSize) * 100)
          : 0;

      fileData.tracker.updateProgress(progressPercent, {
        loaded_bytes: fileData.loaded,
        current_speed: currentSpeed,
        peak_speed: fileData.peakSpeed,
        stalls: fileData.stalls,
      });
    }
  }

  /**
   * Completing the file download
   */
  static completeFile(resource, success = true, error = null) {
    const fileData = progressState.fetchProgressData[resource];
    if (!fileData || fileData.status !== "in-progress") return;

    const now = performance.now();
    const totalTime = (now - fileData.startTime) / 1000;

    fileData.status = success ? "loaded" : "error";
    fileData.elapsedTime = totalTime;

    // Updating global metrics
    progressState.networkMetrics.totalFiles++;
    if (success) {
      progressState.networkMetrics.totalBytes += fileData.loaded;

      // The slowest file
      if (
        !progressState.networkMetrics.slowestFile ||
        totalTime > progressState.networkMetrics.slowestFile.time
      ) {
        progressState.networkMetrics.slowestFile = {
          name: fileData.name,
          time: totalTime,
          size: fileData.loaded,
        };
      }

      // Fastest file
      if (
        !progressState.networkMetrics.fastestFile ||
        totalTime < progressState.networkMetrics.fastestFile.time
      ) {
        progressState.networkMetrics.fastestFile = {
          name: fileData.name,
          time: totalTime,
          size: fileData.loaded,
        };
      }
    }

    // Completing the tracker
    if (fileData.tracker && !fileData.tracker.isCompleted) {
      if (success) {
        fileData.tracker.success({
          total_time: totalTime,
          bytes_loaded: fileData.loaded,
          average_speed: fileData.averageSpeed,
          peak_speed: fileData.peakSpeed,
          stalls: fileData.stalls,
          speed_variance: this.calculateSpeedVariance(fileData.speedHistory),
        });
      } else {
        fileData.tracker.error(error || new Error("Download failed"));
      }
    }

    console.log(
      `[FetchProgress] ${success ? "Completed" : "Failed"}: ${fileData.name} ` +
        `(${this.formatSize(fileData.loaded)} in ${totalTime.toFixed(2)}s)`
    );
  }

  /**
   * Calculation of speed variation
   */
  static calculateSpeedVariance(speedHistory) {
    if (speedHistory.length < 2) return 0;

    const mean =
      speedHistory.reduce((sum, speed) => sum + speed, 0) / speedHistory.length;
    const variance =
      speedHistory.reduce((sum, speed) => sum + Math.pow(speed - mean, 2), 0) /
      speedHistory.length;

    return Math.sqrt(variance);
  }

  /**
   * Formatting file size
   */
  static formatSize(bytes) {
    if (bytes < 0) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /**
   * Formatting speed
   */
  static formatSpeed(bytesPerSec) {
    if (bytesPerSec < 1024) return bytesPerSec + " B/s";
    if (bytesPerSec < 1024 * 1024)
      return (bytesPerSec / 1024).toFixed(1) + " KB/s";
    return (bytesPerSec / (1024 * 1024)).toFixed(1) + " MB/s";
  }
}

// =====================================================body
// Network Analysis
// =====================================================body
class NetworkAnalyzer {
  /**
   * Analysis of network productivity
   */
  static analyzeNetworkPerformance() {
    const analyzer = EventTracker.trackStage(
      "Network_Analysis",
      "performance_analysis"
    );

    try {
      const analysis = {
        connection: this.getConnectionInfo(),
        timing: this.getNetworkTiming(),
        quality: this.assessNetworkQuality(),
        recommendations: this.generateRecommendations(),
      };

      analyzer.success(analysis);

      sendEvent(Events.Performance_Network_Analysis, analysis);

      return analysis;
    } catch (error) {
      analyzer.error(error);
      throw error;
    }
  }

  /**
   * Connection information
   */
  static getConnectionInfo() {
    if (!navigator.connection) {
      return { available: false };
    }

    return {
      available: true,
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData,
      type: navigator.connection.type,
    };
  }

  /**
   * Network timing
   */
  static getNetworkTiming() {
    const files = Object.values(progressState.fetchProgressData);
    if (files.length === 0) return {};

    const completedFiles = files.filter((f) => f.status === "loaded");
    if (completedFiles.length === 0) return {};

    const totalTime = completedFiles.reduce((sum, f) => sum + f.elapsedTime, 0);
    const totalBytes = completedFiles.reduce((sum, f) => sum + f.loaded, 0);

    return {
      total_files: completedFiles.length,
      total_bytes: totalBytes,
      total_time: totalTime,
      average_speed: totalBytes / totalTime,
      files_per_second: completedFiles.length / totalTime,
    };
  }

  /**
   * Network quality assessment
   */
  static assessNetworkQuality() {
    const timing = this.getNetworkTiming();
    const connection = this.getConnectionInfo();

    let quality = "unknown";
    let score = 0;

    // Speed -based assessment
    if (timing.average_speed) {
      if (timing.average_speed > 5 * 1024 * 1024) score += 40; // >5 mb/s
      else if (timing.average_speed > 1 * 1024 * 1024) score += 30; // >1 mb/s
      else if (timing.average_speed > 500 * 1024) score += 20; // > 500 kb/s
      else score += 10;
    }

    // Connection API -based score
    if (connection.available) {
      switch (connection.effectiveType) {
        case "4g":
          score += 30;
          break;
        case "3g":
          score += 20;
          break;
        case "2g":
          score += 10;
          break;
        case "slow-2g":
          score += 5;
          break;
      }

      if (connection.rtt < 100) score += 20;
      else if (connection.rtt < 300) score += 15;
      else if (connection.rtt < 500) score += 10;
      else score += 5;
    }

    // Quality determination
    if (score >= 80) quality = "excellent";
    else if (score >= 60) quality = "good";
    else if (score >= 40) quality = "fair";
    else if (score >= 20) quality = "poor";
    else quality = "very_poor";

    return {
      quality,
      score,
      factors: {
        speed_score: Math.min(40, score),
        connection_score: score - Math.min(40, score),
        latency_bonus: connection.available && connection.rtt < 100 ? 10 : 0,
      },
    };
  }

  /**
   * Generation of recommendations
   */
  static generateRecommendations() {
    const quality = this.assessNetworkQuality();
    const connection = this.getConnectionInfo();
    const recommendations = [];

    if (quality.score < 40) {
      recommendations.push(
        "Consider switching to a faster internet connection"
      );
      recommendations.push("Close other applications using internet");
    }

    if (connection.available && connection.saveData) {
      recommendations.push(
        "Data saver mode is enabled - this may affect download speeds"
      );
    }

    if (connection.available && connection.rtt > 300) {
      recommendations.push(
        "High latency detected - consider switching networks"
      );
    }

    const stalledFiles = Object.values(progressState.fetchProgressData).filter(
      (f) => f.stalls > 2
    );

    if (stalledFiles.length > 0) {
      recommendations.push(
        "Network instability detected - consider refreshing if downloads stall"
      );
    }

    return recommendations;
  }
}

// =====================================================body
// Main Progress Controller
// =====================================================body

/**
 * Starting track
 */
export function startChecking() {
  const systemTracker = EventTracker.trackStage(
    "Download_System",
    "initialize_tracking"
  );
  progressState.systemTracker = systemTracker;

  console.log("[FetchProgress] Starting download tracking");

  try {
    // Initialization
    progressState.startTime = Date.now();
    progressState.allFilesLoaded = false;

    // Running the interval
    startProgressInterval();

    // Replacing Window.fetch
    setupFetchInterception();

    systemTracker.success({
      tracking_started: true,
      tracked_file_types: progressState.trackedFileConfig.map(
        (config) => config.name
      ),
    });

    // Network analysis
    setTimeout(() => {
      NetworkAnalyzer.analyzeNetworkPerformance();
    }, 5000);
  } catch (error) {
    systemTracker.error(error);
    ErrorHandler.logModuleError("FetchProgress", "startChecking", error);
    throw error;
  }
}

/**
 * Stop tracking
 */
export function stopChecking() {
  const stopTracker = EventTracker.trackStage(
    "Download_System",
    "stop_tracking"
  );

  try {
    if (progressState.allFilesLoaded) {
      stopTracker.success({ already_stopped: true });
      return;
    }

    console.log("[FetchProgress] Stopping download tracking");

    // Sending the final event
    sendEvent(Events.Client_Download_Full_All, progressState.getStats());

    // Interval stop
    if (progressState.intervalId) {
      clearInterval(progressState.intervalId);
      progressState.intervalId = null;
    }

    // Recovering the original Fetch
    restoreOriginalFetch();

    // Completion of active trackers
    Object.values(progressState.fetchProgressData).forEach((fileData) => {
      if (fileData.tracker && !fileData.tracker.isCompleted) {
        fileData.tracker.success({ forced_completion: true });
      }
    });

    // Final analysis
    const finalAnalysis = NetworkAnalyzer.analyzeNetworkPerformance();

    // Cleanup
    progressState.allFilesLoaded = true;
    progressState.cleanup();

    // Completion of the system tracker
    if (
      progressState.systemTracker &&
      !progressState.systemTracker.isCompleted
    ) {
      progressState.systemTracker.success({
        final_stats: progressState.getStats(),
        network_analysis: finalAnalysis,
      });
    }

    stopTracker.success({
      files_tracked: Object.keys(progressState.fetchProgressData).length,
      total_duration: Date.now() - progressState.startTime,
    });
  } catch (error) {
    stopTracker.error(error);
    ErrorHandler.logModuleError("FetchProgress", "stopChecking", error);
  }
}

/**
 * Setting up Fetch intercepting
 */
function setupFetchInterception() {
  window.fetch = async (resource, options) => {
    const { isTrackedFile, name, isCritical } = getTrackedFileInfo(resource);

    if (isTrackedFile) {
      console.log(`[FetchProgress] Intercepted download: ${resource}`);
    }

    try {
      const response = await progressState.originalFetch(resource, options);

      if (isTrackedFile && response.body) {
        return handleTrackedFileResponse(response, resource, name, isCritical);
      }

      return response;
    } catch (error) {
      if (isTrackedFile) {
        handleTrackedFileError(resource, name, error);
      }
      throw error;
    }
  };
}

/**
 * Response processing for a track of a file
 */
async function handleTrackedFileResponse(response, resource, name, isCritical) {
  const clonedResponse = response.clone();
  const reader = clonedResponse.body.getReader();
  const contentLength = +response.headers.get("content-length");
  const totalSize =
    Number.isFinite(contentLength) && contentLength > 0 ? contentLength : -1;

  // Initialization of tracking
  const fileData = FileProgressTracker.initializeFile(
    resource,
    name,
    totalSize
  );

  // Creating a new Readablestream for progress
  const stream = new ReadableStream({
    start(controller) {
      function pump() {
        return reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              // Completion of download
              FileProgressTracker.completeFile(resource, true);
              reportFileSuccess(fileData, resource);
              controller.close();
              return;
            }

            // Updating progress
            FileProgressTracker.updateFileProgress(resource, value.length);
            controller.enqueue(value);
            return pump();
          })
          .catch((error) => {
            // Reading error
            FileProgressTracker.completeFile(resource, false, error);
            handleTrackedFileError(resource, name, error);
            controller.error(error);
          });
      }

      return pump();
    },
  });

  // Returning a new answer with our Stream
  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Processing an error track of a file
 */
function handleTrackedFileError(resource, name, error) {
  const fileData = progressState.fetchProgressData[resource];
  if (!fileData) {
    // Create a minimum entry for an error
    FileProgressTracker.initializeFile(resource, name, 0);
  }

  FileProgressTracker.completeFile(resource, false, error);

  // Adding to global metrics of errors
  progressState.networkMetrics.errors.push({
    resource,
    name,
    error: error.message,
    timestamp: Date.now(),
  });

  reportFileError(
    progressState.fetchProgressData[resource] || { name },
    resource,
    error
  );
}

/**
 * Interval to send progress
 */
function startProgressInterval() {
  if (progressState.intervalId !== null) {
    clearInterval(progressState.intervalId);
  }

  progressState.intervalId = setInterval(() => {
    sendProgressData();
  }, progressState.intervalSeconds * 1000);
}

/**
 * Sending progress data
 */
function sendProgressData() {
  if (progressState.allFilesLoaded) return;

  const progressTracker = EventTracker.trackStage(
    "Progress_Report",
    "send_update"
  );

  try {
    // Collecting progress data
    const allProgressData = Object.entries(progressState.fetchProgressData).map(
      ([resource, data]) => {
        const progressPercent =
          data.totalSize > 0
            ? ((data.loaded / data.totalSize) * 100).toFixed(2)
            : "Unknown";

        return {
          resource: resource.substring(0, 100), // We limit the length of the URL
          name: data.name,
          loaded: data.loaded,
          totalSize: data.totalSize,
          averageSpeed: data.averageSpeed,
          elapsedTime: data.elapsedTime,
          progressPercent,
          status: data.status,
          stalls: data.stalls || 0,
          peakSpeed: data.peakSpeed || 0,
        };
      }
    );

    if (allProgressData.length === 0) {
      progressTracker.success({ no_files_tracked: true });
      return;
    }

    // Sending the main event of progress
    sendProgressUpdateEvent(allProgressData);

    // Checking the completion
    checkCompletion(allProgressData);

    progressTracker.success({
      files_reported: allProgressData.length,
      total_progress: calculateOverallProgress(allProgressData),
    });
  } catch (error) {
    progressTracker.error(error);
    ErrorHandler.logModuleError("FetchProgress", "sendProgressData", error);
  }
}

/**
 * Sending an event of progress update
 */
function sendProgressUpdateEvent(allProgressData) {
  const summary = allProgressData.reduce((acc, file) => {
    acc[`Full_size_${file.name}`] = FileProgressTracker.formatSize(
      file.totalSize
    );
    acc[`Downloaded_${file.name}`] = FileProgressTracker.formatSize(
      file.loaded
    );
    acc[`Speed_${file.name}`] = FileProgressTracker.formatSpeed(
      file.averageSpeed
    );
    acc[`Time_${file.name}`] = file.elapsedTime.toFixed(2);
    acc[`Progress_${file.name}`] = file.progressPercent;
    acc[`Stalls_${file.name}`] = file.stalls;
    return acc;
  }, {});

  // Adding global metrics
  summary.Total_Files = allProgressData.length;
  summary.Network_Quality = NetworkAnalyzer.assessNetworkQuality().quality;
  summary.Overall_Progress = calculateOverallProgress(allProgressData);

  sendEvent(Events.Client_Download_Progress, summary);
}

/**
 * Calculation of total progress
 */
function calculateOverallProgress(allProgressData) {
  const totalBytes = allProgressData.reduce(
    (sum, file) => sum + (file.totalSize > 0 ? file.totalSize : 0),
    0
  );
  const loadedBytes = allProgressData.reduce(
    (sum, file) => sum + file.loaded,
    0
  );

  return totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
}

/**
 * Checking the completion of the download
 */
function checkCompletion(allProgressData) {
  // Checking the availability of all critical files
  if (!areAllCriticalFilesPresent()) {
    console.log("[FetchProgress] Waiting for critical files...");
    return;
  }

  // Checking errors
  const errorFiles = allProgressData.filter((f) => f.status === "error");
  if (errorFiles.length > 0) {
    console.error("[FetchProgress] Some files failed to download:", errorFiles);

    // Sending an event about an error
    sendEvent(Events.Client_Download_Error, {
      failed_files: errorFiles.length,
      error_details: errorFiles.map((f) => ({
        name: f.name,
        resource: f.resource,
      })),
    });

    stopChecking();
    return;
  }

  // Checking the completion of all files
  const allCompleted = allProgressData.every(
    (file) => file.status === "loaded"
  );
  if (allCompleted) {
    console.log("[FetchProgress] All files completed successfully");
    stopChecking();
  }
}

/**
 * Checking the availability of all critical files
 */
function areAllCriticalFilesPresent() {
  const loadedResources = Object.keys(progressState.fetchProgressData);
  const criticalConfigs = progressState.trackedFileConfig.filter(
    (cfg) => cfg.critical
  );

  return criticalConfigs.every((config) =>
    loadedResources.some((resource) =>
      resource.split("?")[0].endsWith(config.suffix)
    )
  );
}

/**
 * Determination of file type
 */
function getTrackedFileInfo(resource) {
  for (const config of progressState.trackedFileConfig) {
    if (resource.split("?")[0].endsWith(config.suffix)) {
      return {
        isTrackedFile: true,
        name: config.name,
        isCritical: config.critical,
      };
    }
  }
  return { isTrackedFile: false, name: null, isCritical: false };
}

/**
 * Report on Successful File Download
 */
function reportFileSuccess(fileData, resource) {
  if (progressState.reportedSuccesses.has(resource)) return;
  progressState.reportedSuccesses.add(resource);

  console.log(`[FetchProgress] File completed: ${fileData.name}`);

  const eventData = {
    Resource: resource.substring(0, 100),
    Name: fileData.name,
    Full_size: FileProgressTracker.formatSize(fileData.totalSize),
    Downloaded: FileProgressTracker.formatSize(fileData.loaded),
    Speed: FileProgressTracker.formatSpeed(fileData.averageSpeed),
    Peak_Speed: FileProgressTracker.formatSpeed(fileData.peakSpeed || 0),
    Time: fileData.elapsedTime.toFixed(2),
    Stalls: fileData.stalls || 0,
    Speed_Variance: FileProgressTracker.calculateSpeedVariance(
      fileData.speedHistory || []
    ),
  };

  sendEvent(Events.Client_Download_Full, eventData);
}

/**
 * File Download Report
 */
function reportFileError(fileData, resource, error) {
  if (progressState.reportedErrors.has(resource)) return;
  progressState.reportedErrors.add(resource);

  console.error(`[FetchProgress] File error: ${resource}`, error);

  const eventData = {
    Resource: resource.substring(0, 100),
    Name: fileData.name || "Unknown",
    Error_Message: error.message || error.toString(),
    Error_Type: error.constructor.name,
    Bytes_Downloaded: fileData.loaded || 0,
    Time_Before_Error: fileData.elapsedTime || 0,
  };

  sendEvent(Events.Client_Download_Error, eventData);

  // Post to the user
  alert(
    `Error downloading file: ${fileData.name}\nError: ${error.message}\n\nPlease reload the page.`
  );
}

/**
 * Recovering the original Fetch
 */
function restoreOriginalFetch() {
  console.log("[FetchProgress] Restoring original fetch");
  window.fetch = progressState.originalFetch;
}

// ================================
// Utility Functions
// ================================

/**
 * Obtaining detailed statistics
 */
export function getDetailedStats() {
  return {
    state: progressState.getStats(),
    files: Object.entries(progressState.fetchProgressData).map(
      ([resource, data]) => ({
        resource: resource.substring(0, 100),
        name: data.name,
        status: data.status,
        progress:
          data.totalSize > 0
            ? Math.round((data.loaded / data.totalSize) * 100)
            : 0,
        size: FileProgressTracker.formatSize(data.totalSize),
        loaded: FileProgressTracker.formatSize(data.loaded),
        speed: FileProgressTracker.formatSpeed(data.averageSpeed),
        time: data.elapsedTime.toFixed(2),
        stalls: data.stalls || 0,
      })
    ),
    network: progressState.networkMetrics,
    recommendations: NetworkAnalyzer.generateRecommendations(),
  };
}

/**
 * Forced completion of all downloads
 */
export function forceCompleteAll(reason = "Forced completion") {
  Object.entries(progressState.fetchProgressData).forEach(
    ([resource, fileData]) => {
      if (fileData.status === "in-progress") {
        FileProgressTracker.completeFile(resource, false, new Error(reason));
      }
    }
  );

  stopChecking();
}

// ================================
// Event Listeners
// ================================

// Cleaning when the page is closed
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    forceCompleteAll("Page unload");
  });

  // Monitoring of network changes
  if (navigator.connection) {
    navigator.connection.addEventListener("change", () => {
      const connectionInfo = NetworkAnalyzer.getConnectionInfo();
      sendEvent(Events.System_Network_Status_Changed, connectionInfo);

      console.log(
        "[FetchProgress] Network connection changed:",
        connectionInfo
      );
    });
  }
}

export default {
  startChecking,
  stopChecking,
  getDetailedStats,
  forceCompleteAll,
  FileProgressTracker,
  NetworkAnalyzer,
  // For testing
  _internal: {
    progressState,
    setupFetchInterception,
    handleTrackedFileResponse,
    sendProgressData,
  },
};
