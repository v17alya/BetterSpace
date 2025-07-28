// ================================
// Player Management
// ================================
class PlayerManager {
  
  /**
   * Creating a new player
   */
  static createPlayer(videoId) {
    const playerTracker = EventTracker.trackStage('Video_Player_Creation', 'create_instance');
    
    try {
      console.log(`[VideoController] Creating player for video: ${videoId}`);
      
      if (!videoState.playerModule) {
        throw new Error('Player module not loaded');
      }
      
      sendEvent(Events.Games_Video_Init_Started, {
        video_id: videoId,
        player_type: videoState.useRutube ? 'rutube' : 'youtube',
        auto_play: videoState.autoPlayEnabled
      });
      
      // Creating a player instance
      videoState.videoPlayerInstance = new videoState.playerModule(
        "player",
        videoState.autoPlayEnabled,
        videoState.videoPlaybackAllowed,
        videoState.currentVolume,
        videoId,
        true // loop enabled
      );
      
      // The initialization of the player
      videoState.videoPlayerInstance.init();
      
      // Global link for unity
      window.videoPlayerInstance = videoState.videoPlayerInstance;
      
      playerTracker.success({
        video_id: videoId,
        player_type: videoState.useRutube ? 'rutube' : 'youtube',
        instance_created: true
      });
      
      console.log(`[VideoController] Player created successfully`);
      
    } catch (error) {
      playerTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'createPlayer', error, { videoId });
      throw error;
    }
  }
  
  /**
   * Changing video with tracking
   */
  static changeVideo(youtubeVideoId, rutubeVideoId) {
    const changeTracker = EventTracker.trackStage('Video_Change', 'switch_video');
    
    try {
      const targetVideoId = videoState.useRutube ? rutubeVideoId : youtubeVideoId;
      
      sendEvent(Events.Games_Video_Try_Change, { 
        video_id: targetVideoId,
        player_type: videoState.useRutube ? 'rutube' : 'youtube'
      });
      
      if (!videoState.videoPlayerInstance) {
        throw new Error('No video player instance available');
      }
      
      console.log(`[VideoController] Changing video to: ${targetVideoId}`);
      
      // Update metrics
      this.updatePlaybackMetrics('video_changed');
      
      videoState.videoPlayerInstance.changeVideo(targetVideoId);
      
      changeTracker.success({
        new_video_id: targetVideoId,
        player_type: videoState.useRutube ? 'rutube' : 'youtube'
      });
      
    } catch (error) {
      changeTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'changeVideo', error, {
        youtubeVideoId,
        rutubeVideoId
      });
    }
  }
  
  /**
   * Play control
   */
  static playVideo() {
    const playTracker = EventTracker.trackStage('Video_Play', 'start_playback');
    
    try {
      console.log(`[VideoController] Play video requested`);
      
      const currentVideoId = videoState.videoPlayerInstance ? 
        videoState.videoPlayerInstance.getVideoId() : videoState.pendingVideoId;
      
      sendEvent(Events.Games_Video_Try_Play, { 
        video_id: currentVideoId,
        playback_allowed: videoState.videoPlaybackAllowed
      });
      
      if (!videoState.videoPlaybackAllowed) {
        console.log(`[VideoController] Video playback not allowed`);
        playTracker.success({ playback_blocked: true });
        return;
      }
      
      if (!videoState.videoPlayerInstance) {
        console.log(`[VideoController] No player instance available`);
        playTracker.error(new Error('No player instance'));
        return;
      }
      
      // Display container and start playback
      UIManager.showVideoContainer();
      videoState.videoPlayerInstance.playVideo();
      
      // The start of the time of reproduction
      videoState.playbackMetrics.lastPlayStartTime = Date.now();
      
      playTracker.success({
        video_id: currentVideoId,
        container_shown: true
      });
      
    } catch (error) {
      playTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'playVideo', error);
    }
  }
  
  /**
   * Suspension of video
   */
  static pauseVideo() {
    const pauseTracker = EventTracker.trackStage('Video_Pause', 'pause_playback');
    
    try {
      sendEvent(Events.Games_Video_Try_Pause);
      
      if (videoState.videoPlayerInstance) {
        videoState.videoPlayerInstance.pauseVideo();
        this.updatePlaybackMetrics('paused');
      }
      
      pauseTracker.success({ paused: !!videoState.videoPlayerInstance });
      
    } catch (error) {
      pauseTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'pauseVideo', error);
    }
  }
  
  /**
   * Video stop
   */
  static stopVideo() {
    const stopTracker = EventTracker.trackStage('Video_Stop', 'stop_playback');
    
    try {
      sendEvent(Events.Games_Video_Try_Stop);
      
      if (videoState.videoPlayerInstance) {
        videoState.videoPlayerInstance.stopVideo();
        this.updatePlaybackMetrics('stopped');
      }
      
      stopTracker.success({ stopped: !!videoState.videoPlayerInstance });
      
    } catch (error) {
      stopTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'stopVideo', error);
    }
  }
  
  /**
   * Updating Metrics Play
   */
  static updatePlaybackMetrics(event) {
    if (event === 'paused' || event === 'stopped' || event === 'video_changed') {
      if (videoState.playbackMetrics.lastPlayStartTime) {
        const playTime = Date.now() - videoState.playbackMetrics.lastPlayStartTime;
        videoState.playbackMetrics.totalPlayTime += playTime;
        videoState.playbackMetrics.lastPlayStartTime = null;
      }
    }
    
    if (event === 'error') {
      videoState.playbackMetrics.errorCount++;
    }
    
    if (event === 'buffering') {
      videoState.playbackMetrics.bufferingEvents++;
    }
  }
}

// =====================================================body
// UI Management
// =====================================================body
class UIManager {
  
  /**
   * Initialization of UI components
   */
  static initializeUI() {
    const uiTracker = EventTracker.trackStage('Video_UI_Init', 'setup_interface');
    
    try {
      // Loading CSS
      this.loadCSS("VideoController/css/video_styles.css");
      
      // Creating containers
      this.injectVideoContainer();
      this.injectSliderStyles();
      this.injectVolumeSlider();
      
      // Overlay setup
      this.setupOverlay();
      
      // Draggable functionality
      if (videoState.draggableEnabled) {
        this.setupDraggable();
      }
      
      // Slider width Update in a second (after CSS string)
      setTimeout(() => this.updateVolumeSliderWidth(), 1000);
      
      uiTracker.success({
        css_loaded: true,
        container_created: true,
        draggable_enabled: videoState.draggableEnabled
      });
      
      console.log(`[VideoController] UI initialized`);
      
    } catch (error) {
      uiTracker.error(error);
      ErrorHandler.logModuleError('VideoController', 'initializeUI', error);
    }
  }
  
  /**
   * Loading CSS
   */
  static loadCSS(url) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
  
  /**
   * Creating the Main Video Container
   */
  static injectVideoContainer() {
    const containerHTML = `
      <div id="video-container">
        <div id="player"></div>
        <div id="video-overlay"></div>
      </div>
    `;
    
    const temp = document.createElement("div");
    temp.innerHTML = containerHTML;
    document.body.insertAdjacentElement("afterbegin", temp.firstElementChild);
  }
  
  /**
   * Styles for Volume Slider
   */
  static injectSliderStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
      #volume-slider-container,
      #volume-slider-container * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -ms-user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      #volume-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 5px;
        border-radius: 3px;
        outline: none;
        padding: 0;
        margin: 0;
        background: #ccc;
        touch-action: pan-x;
      }
      
      #volume-slider::-webkit-slider-runnable-track,
      #volume-slider::-moz-range-track {
        background: transparent;
      }
      
      #volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #007aff;
        border-radius: 50%;
      }
      
      #volume-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #007aff;
        border: none;
        border-radius: 50%;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Creating a Volume Slider
   */
  static injectVolumeSlider() {
    const sliderHTML = `
      <div id="volume-slider-container" style="
        position: absolute;
        bottom: 10px;
        left: 10px;
        right: 10px;
        z-index: 1100;
        display: flex;
        align-items: center;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        width: 50px;
      ">
        <span class="volume-icon" style="font-size: 16px; margin-right: 5px; cursor: pointer;">🔊</span>
        <input type="range" id="volume-slider" min="0" max="100" value="${videoState.currentVolume}" 
               style="cursor: pointer; transition: width 0.3s ease;">
      </div>
    `;

    const container = document.getElementById("video-container");
    if (container) {
      container.insertAdjacentHTML("beforeend", sliderHTML);
      this.setupVolumeSliderEvents();
      this.updateSliderBackground(document.getElementById("volume-slider"), videoState.currentVolume);
    }
  }
  
  /**
   * Setting up events for Volume Slider
   */
  static setupVolumeSliderEvents() {
    const sliderContainer = document.getElementById("volume-slider-container");
    const slider = document.getElementById("volume-slider");
    const volumeIcon = sliderContainer?.querySelector(".volume-icon");
    
    if (volumeIcon) {
      videoState.volumeIconElement = volumeIcon;
    }

    // Events for a container
    if (sliderContainer) {
      sliderContainer.addEventListener("mousedown", (e) => e.stopPropagation());
    }

    // Events for Slider
    if (slider) {
      // Mouse events
      slider.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.clearVolumeSliderTimeout();
        videoState.isSliderActive = true;
      });
      
      slider.addEventListener("mouseup", () => {
        videoState.isSliderActive = false;
        this.resetVolumeSliderTimeout();
      });
      
      slider.addEventListener("mouseleave", () => {
        if (!videoState.isSliderActive) {
          this.resetVolumeSliderTimeout();
        }
      });

      // Touch events
      slider.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        videoState.isSliderActive = true;
        this.clearVolumeSliderTimeout();
        this.showVolumeSlider();
      }, { passive: false });

      slider.addEventListener("touchend", (e) => {
        e.stopPropagation();
        videoState.isSliderActive = false;
        this.resetVolumeSliderTimeout();
      }, { passive: false });

      // Volume Change
      slider.addEventListener("input", (e) => {
        const volume = parseInt(e.target.value, 10);
        this.setVolumeInternal(volume, true, false); // Upgrade the volume but not slider
      });
    }

    // Volume Icon Click
    if (volumeIcon) {
      volumeIcon.addEventListener("click", () => {
        const newVolume = videoState.isMuted ? videoState.previousVolume : 0;
        this.setVolumeInternal(newVolume, true, true);
        this.showVolumeSlider();
      });
    }
  }
  
  /**
   * Overlay setup
   */
  static setupOverlay() {
    const overlay = document.getElementById("video-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        if (videoState.videoPlaybackAllowed && 
            videoState.videoPlayerInstance && 
            !videoState.videoPlayerInstance.isPlaying()) {
          console.log(`[VideoController] Overlay clicked - playing video`);
          PlayerManager.playVideo();
        }
        this.showVolumeSlider();
      });
    }
  }
  
  /**
   * Setting Draggable Functionality
   */
  static setupDraggable() {
    const container = document.getElementById("video-container");
    if (container) {
      import("./Draggable.js?v={{{ PRODUCT_VERSION }}}")
        .then((module) => {
          new module.default(container);
          console.log(`[VideoController] Draggable functionality enabled`);
        })
        .catch((error) => {
          ErrorHandler.logModuleError('VideoController', 'setupDraggable', error);
        });
    }
  }
  
  /**
   * Showing/Hiding Video container
   */
  static showVideoContainer() {
    console.log(`[VideoController] Showing video container`);
    const container = document.getElementById("video-container");
    if (container) {
      container.style.opacity = 1;
      container.style.pointerEvents = "all";
      this.showOverlay();
    }
  }
  
  static hideVideoContainer() {
    console.log(`[VideoController] Hiding video container`);
    const container = document.getElementById("video-container");
    if (container) {
      container.style.opacity = 0;
      container.style.pointerEvents = "none";
      this.hideOverlay();
    }
  }
  
  static showOverlay() {
    const overlay = document.getElementById("video-overlay");
    if (overlay) {
      overlay.style.display = "block";
      overlay.style.pointerEvents = "all";
    }
  }
  
  static hideOverlay() {
    const overlay = document.getElementById("video-overlay");
    if (overlay) {
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    }
  }
  
  /**
   * Volume Slider Control
   */
  static showVolumeSlider() {
    const sliderContainer = document.getElementById("volume-slider-container");
    if (sliderContainer) {
      sliderContainer.style.opacity = "1";
      sliderContainer.style.pointerEvents = "all";
      this.resetVolumeSliderTimeout();
    }
  }
  
  static hideVolumeSlider() {
    if (videoState.isSliderActive) return;
    
    const sliderContainer = document.getElementById("volume-slider-container");
    if (sliderContainer) {
      sliderContainer.style.opacity = "0";
      sliderContainer.style.pointerEvents = "none";
    }
  }
  
  static resetVolumeSliderTimeout() {
    this.clearVolumeSliderTimeout();
    videoState.volumeSliderTimeout = setTimeout(() => this.hideVolumeSlider(), 3000);
  }
  
  static clearVolumeSliderTimeout() {
    if (videoState.volumeSliderTimeout) {
      clearTimeout(videoState.volumeSliderTimeout);
      videoState.volumeSliderTimeout = null;
    }
  }
  
  /**
   * Slider's background update
   */
  static updateSliderBackground(slider, value) {
    if (!slider) return;
    
    const percentage = parseInt(value, 10);
    slider.style.setProperty(
      "background",
      `linear-gradient(to right, #007aff ${percentage}%, #ccc ${percentage}%, #ccc 100%)`,
      "important"
    );
  }
  
  /**
   * Volume Slider Width Update
   */
  static updateVolumeSliderWidth() {
    const container = document.getElementById("video-container");
    const slider = document.getElementById("volume-slider");
    
    if (container && slider) {
      const containerWidth = container.offsetWidth;
      const minWidth = 200;
      const threshold = 300;
      
      let ratio;
      if (containerWidth <= minWidth) {
        ratio = 0.5;
      } else if (containerWidth >= threshold) {
        ratio = 0.2;
      } else {
        ratio = 0.5 - ((containerWidth - minWidth) / (threshold - minWidth)) * (0.5 - 0.2);
      }
      
      const newWidth = containerWidth * ratio;
      slider.style.width = newWidth + "px";
    }
  }
  
  /**
   * Internal volume management
   */
  static setVolumeInternal(volume, invokeEvent = true, updateSlider = false) {
    videoState.currentVolume = parseInt(volume, 10);
    
    // Upgrade the player
    if (videoState.videoPlayerInstance) {
      videoState.videoPlayerInstance.setVolume(videoState.currentVolume);
    }
    
    // Up Ui
    const slider = document.getElementById("volume-slider");
    if (slider) {
      if (updateSlider) {
        slider.value = volume;
      }
      this.updateSliderBackground(slider, volume);
    }
    
    // MUTE STATE UPDATE
    this.applyVolumeState(volume);
    
    // Callback
    if (invokeEvent && window.onVideoVolumeChanged) {
      window.onVideoVolumeChanged(videoState.currentVolume);
    }
  }
  
  /**
   * Application of volume
   */
  static applyVolumeState(volume) {
    if (volume > 0) {
      if (videoState.volumeIconElement) {
        videoState.volumeIconElement.textContent = "🔊";
      }
      videoState.isMuted = false;
      videoState.previousVolume = volume;
    } else {
      if (videoState.volumeIconElement) {
        videoState.volumeIconElement.textContent = "🔇";
      }
      videoState.isMuted = true;
    }
  }
}

// ================================
// Global Event Handlers
// ================================

/**
 * Callback when API is ready
 */
function onPlayerAPIReady() {
  console.log(`[VideoController] Player API ready`);
  
  sendEvent(Events.Games_Video_Player_Ready, {
    player_type: videoState.useRutube ? 'rutube' : 'youtube',
    api_ready: true
  });
  
  videoState.isAPIReady = true;
  
  // If there is Pending Video, we create a player
  if (videoState.pendingVideoId && !videoState.videoPlayerInstance) {
    PlayerManager.createPlayer(videoState.pendingVideoId);
  }
}

/**
 * CallBack Changing the Condition of the Player
 */
function onPlayerStateChange(state) {
  console.log(`[VideoController] Player state changed: ${state}`);
  
  sendEvent(Events.Games_Video_Player_State_Changed, {
    state,
    player_type: videoState.useRutube ? 'rutube' : 'youtube',
    video_id: videoState.videoPlayerInstance?.getVideoId()
  });
  
  // Update metrics
  PlayerManager.updatePlaybackMetrics(state.toLowerCase());
}

/**
 * CallBack Beginning Play
 */
function onVideoStartPlaying() {
  console.log(`[VideoController] Video started playing`);
  
  sendEvent(Events.Games_Video_Play_Started, {
    video_id: videoState.videoPlayerInstance?.getVideoId(),
    player_type: videoState.useRutube ? 'rutube' : 'youtube'
  });
  
  UIManager.showVideoContainer();
}

/**
 * Callback Video Errors
 */
function onVideoError(code, text) {
  console.error(`[VideoController] Video error: ${code} - ${text}`);
  
  sendEvent(Events.Games_Video_Error, {
    error_code: code,
    error_text: text,
    video_id: videoState.videoPlayerInstance?.getVideoId(),
    player_type: videoState.useRutube ? 'rutube' : 'youtube'
  });
  
  PlayerManager.updatePlaybackMetrics('error');
  UIManager.showVideoContainer();
}

/**
 * Callback Changing Volume
 */
function onVideoVolumeChanged(volume) {
  console.log(`[VideoController] Volume changed: ${volume}`);
  
  sendEvent(Events.Games_Video_Volume_Changed, {
    new_volume: volume,
    is_muted: volume === 0,
    player_type: videoState.useRutube ? 'rutube' : 'youtube'
  });
}

// =====================================================body
// PUBLIC API
// =====================================================body

/**
 * Home Downloading Video
 */
async function loadVideo(youtubeVideoId, rutubeVideoId) {
  const loadTracker = EventTracker.trackStage('Video_Load', 'full_load_process');
  
  try {
    const targetVideoId = videoState.useRutube ? rutubeVideoId : youtubeVideoId;
    
    console.log(`[VideoController] Loading video: ${targetVideoId}`);
    
    sendEvent(Events.Games_Video_Try_Load, { 
      video_id: targetVideoId,
      player_type: videoState.useRutube ? 'rutube' : 'youtube'
    });
    
    videoState.pendingVideoId = targetVideoId;
    
    // Loading API
    await APILoader.loadPlayerAPI();
    
    loadTracker.updateProgress(70, { api_loaded: true });
    
    // Creating or changing the player
    if (!videoState.videoPlayerInstance) {
      if (videoState.isAPIReady) {
        PlayerManager.createPlayer(videoState.pendingVideoId);
      } else {
        console.log(`[VideoController] API not ready, player will be created when ready`);
      }
    } else {
      const currentVideoId = videoState.videoPlayerInstance.getVideoId();
      if (currentVideoId === videoState.pendingVideoId) {
        PlayerManager.playVideo();
      } else {
        PlayerManager.changeVideo(youtubeVideoId, rutubeVideoId);
      }
    }
    
    loadTracker.success({
      video_id: targetVideoId,
      player_created: !!videoState.videoPlayerInstance,
      api_ready: videoState.isAPIReady
    });
    
  } catch (error) {
    loadTracker.error(error);
    ErrorHandler.logModuleError('VideoController', 'loadVideo', error, {
      youtubeVideoId,
      rutubeVideoId
    });
  }
}

/**
 * Setting a permit to play
 */
function setVideoPlaybackAllowed(allowed) {
  videoState.videoPlaybackAllowed = Boolean(allowed);
  
  sendEvent(Events.Games_Video_Playback_Allow_Status_Changed, {
    status: videoState.videoPlaybackAllowed,
    player_type: videoState.useRutube ? 'rutube' : 'youtube'
  });
  
  if (videoState.videoPlayerInstance) {
    videoState.videoPlayerInstance.setVideoPlaybackAllowed(videoState.videoPlaybackAllowed);
  }
  
  console.log(`[VideoController] Video playback allowed: ${videoState.videoPlaybackAllowed}`);
}

/**
 * Mounting volume
 */
function setVolume(volume) {
  UIManager.setVolumeInternal(volume, true, true);
}

/**
 * Checking the state of playback
 */
function isPlaying() {
  if (videoState.videoPlayerInstance && typeof videoState.videoPlayerInstance.isPlaying === "function") {
    return videoState.videoPlayerInstance.isPlaying();
  }
  return false;
}

/**
 * Checking the type of player
 */
function isRutubePlayer() {
  return videoState.useRutube;
}

/**
 * Videocontroller initialization
 */
function init() {
  const initTracker = EventTracker.trackStage('Video_Controller_Init', 'full_initialization');
  videoState.initializationTracker = initTracker;
  
  try {
    console.log(`[VideoController] Initializing`);
    
    // Initialization UI
    UIManager.initializeUI();
    
    initTracker.updateProgress(50, { ui_initialized: true });
    
    // Setting up global callbacks
    window.onVideoStartPlaying = onVideoStartPlaying;
    window.onVideoError = onVideoError;
    window.onVideoVolumeChanged = onVideoVolumeChanged;
    
    // Run GEO DETOCTION AND API Loading in the background
    GeoDetector.detectRegionWithRetry()
      .then((result) => {
        console.log(`[VideoController] Region detected: ${result.useRutube ? 'RU (Rutube)' : 'Other (YouTube)'}`);
        initTracker.updateProgress(80, { geo_detected: true, use_rutube: result.useRutube });
      })
      .catch((error) => {
        ErrorHandler.logModuleError('VideoController', 'geoDetection', error);
      });
    
    APILoader.loadPlayerAPI()
      .then(() => {
        console.log(`[VideoController] API preloaded`);
        initTracker.success({
          ui_ready: true,
          api_preloaded: true,
          region: videoState.useRutube ? 'rutube' : 'youtube'
        });
      })
      .catch((error) => {
        ErrorHandler.logModuleError('VideoController', 'apiPreload', error);
        initTracker.error(error);
      });
    
    console.log(`[VideoController] Initialization completed`);
    
  } catch (error) {
    initTracker.error(error);
    ErrorHandler.logModuleError('VideoController', 'init', error);
  }
}

// ================================
// Cleanup and Memory Management
// ================================

/**
 * Cleaning resources
 */
function cleanup() {
  const cleanupTracker = EventTracker.trackStage('Video_Cleanup', 'full_cleanup');
  
  try {
    console.log(`[VideoController] Starting cleanup`);
    
    // Play stop
    if (videoState.videoPlayerInstance) {
      try {
        videoState.videoPlayerInstance.stopVideo();
      } catch (error) {
        console.warn(`[VideoController] Failed to stop video:`, error);
      }
    }
    
    // Cleaning the condition
    videoState.cleanup();
    
    // Cleaning global references
    window.videoPlayerInstance = null;
    window.onVideoStartPlaying = null;
    window.onVideoError = null;
    window.onVideoVolumeChanged = null;
    
    cleanupTracker.success({
      state_cleaned: true,
      global_refs_cleared: true,
      final_stats: videoState.getStats()
    });
    
    console.log(`[VideoController] Cleanup completed`);
    
  } catch (error) {
    cleanupTracker.error(error);
    ErrorHandler.logModuleError('VideoController', 'cleanup', error);
  }
}

// =====================================================body
// Module Export
// =====================================================body

export const VideoController = {
  // Core functions
  init,
  cleanup,
  
  // Video control
  load: loadVideo,
  play: PlayerManager.playVideo,
  pause: PlayerManager.pauseVideo,
  stop: PlayerManager.stopVideo,
  change: PlayerManager.changeVideo,
  
  // Audio Control
  setVolume,
  mute: () => {
    if (videoState.videoPlayerInstance) {
      videoState.videoPlayerInstance.muteVideo();
    }
  },
  unmute: () => {
    if (videoState.videoPlayerInstance) {
      videoState.videoPlayerInstance.unmuteVideo();
    }
  },
  
  // Ui Control
  hide: UIManager.hideVideoContainer,
  show: UIManager.showVideoContainer,
  hideOverlay: UIManager.hideOverlay,
  showOverlay: UIManager.showOverlay,
  
  // State queries
  isPlaying,
  isRutubePlayer,
  getVideoPlaybackAllowed: () => videoState.videoPlaybackAllowed,
  setVideoPlaybackAllowed,
  
  // Statistics and Debuging
  getStats: () => videoState.getStats(),
  getPlaybackMetrics: () => ({ ...videoState.playbackMetrics }),
  
  // Internal access for testing
  _internal: {
    videoState,
    PlayerManager,
    UIManager,
    APILoader,
    GeoDetector
  }
};

export default VideoController;// Videocontroller/SRC/Videocontroller.module.js
// Improved video control module with detailed tracking and errors processing

import Events from "../../src/analytics_events.module.js?v={{{ PRODUCT_VERSION }}}";
import { sendEvent } from "../../src/amplitude.module.js?v={{{ PRODUCT_VERSION }}}";
import { EventTracker } from "../../src/core/EventTracker.module.js?v={{{ PRODUCT_VERSION }}}";
import ErrorHandler from "../../src/core/ErrorHandler.module.js?v={{{ PRODUCT_VERSION }}}";

// ================================
// Video Controller State Management
// ================================
class VideoControllerState {
  constructor() {
    // Player Instances
    this.videoPlayerInstance = null;
    this.pendingVideoId = null;
    this.playerModule = null;
    
    // API Readiness
    this.isAPIReady = false;
    this.loadAPIPromise = null;
    
    // Geo Detection
    this.useRutube = null;
    this.ipDataPromise = null;
    this.cachedIpData = null;
    
    // Playback control
    this.videoPlaybackAllowed = false;
    this.currentVolume = 5; // Default 5%
    this.isMuted = false;
    this.previousVolume = 5;
    
    // Ui state
    this.volumeSliderTimeout = null;
    this.isSliderActive = false;
    this.volumeIconElement = null;
    
    // Configuration
    this.draggableEnabled = true;
    this.autoPlayEnabled = true;
    this.defaultVolume = 5;
    
    // Performance tracking
    this.initializationTracker = null;
    this.playbackMetrics = {
      totalPlayTime: 0,
      bufferingEvents: 0,
      errorCount: 0,
      lastPlayStartTime: null
    };
  }
  
  /**
   * Cleaning the condition
   */
  cleanup() {
    if (this.volumeSliderTimeout) {
      clearTimeout(this.volumeSliderTimeout);
      this.volumeSliderTimeout = null;
    }
    
    if (this.initializationTracker && !this.initializationTracker.isCompleted) {
      this.initializationTracker.error(new Error('VideoController cleanup'));
    }
    
    this.playbackMetrics = {
      totalPlayTime: 0,
      bufferingEvents: 0,
      errorCount: 0,
      lastPlayStartTime: null
    };
  }
  
  /**
   * Obtaining statistics
   */
  getStats() {
    return {
      hasInstance: !!this.videoPlayerInstance,
      isAPIReady: this.isAPIReady,
      useRutube: this.useRutube,
      playbackAllowed: this.videoPlaybackAllowed,
      currentVolume: this.currentVolume,
      playbackMetrics: { ...this.playbackMetrics }
    };
  }
}

const videoState = new VideoControllerState();

// ================================
// Geo Detection with Retry Logic
// ================================
class GeoDetector {
  
  /**
   * Definition of the region with Retry logic
   */
  static async detectRegionWithRetry() {
    if (videoState.useRutube !== null) {
      return videoState.cachedIpData;
    }

    if (videoState.ipDataPromise) {
      return videoState.ipDataPromise;
    }

    const geoTracker = EventTracker.trackStage('Geo_Detection', 'detect_region');

    videoState.ipDataPromise = new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 3;
      const delay = 1000;

      function attemptFetch() {
        attempts++;
        geoTracker.updateProgress((attempts / maxAttempts) * 50); // 50% for attempts
        
        sendEvent(Events.Games_Video_Geo_Fetch_Started, { attempt: attempts });
        
        console.log(`[VideoController] Geo detection attempt ${attempts}`);

        // Let's try several API EndPoints
        const endpoints = [
          'https://better-space-api.herokuapp.com/api/settings/',
          'https://ipapi.co/json/',
          'https://api.ipify.org?format=json' // Fallback without Geo
        ];

        this.tryEndpoints(endpoints, 0)
          .then(data => {
            const geo = data.geo || data; // Depends on the API
            sendEvent(Events.Games_Video_Geo_Fetch_Finished, { 
              geo, 
              attempt: attempts,
              endpoint_used: data._endpoint 
            });
            
            console.log(`[VideoController] Region detected: ${geo.country}`);
            
            const result = {
              data: geo,
              useRutube: new URLSearchParams(window.top.location.search).get("useRutube") ?? 
                        geo.country === "RU"
            };

            videoState.cachedIpData = result;
            videoState.useRutube = result.useRutube;
            
            geoTracker.success({
              region: geo.country,
              use_rutube: result.useRutube,
              attempts_needed: attempts
            });
            
            resolve(result);
          })
          .catch(error => {
            console.error(`[VideoController] Geo detection attempt ${attempts} failed:`, error);
            sendEvent(Events.Games_Video_Geo_Fetch_Failed, { 
              error: error.message, 
              attempt: attempts 
            });

            if (attempts < maxAttempts) {
              setTimeout(attemptFetch, delay * attempts); // Increase the delay
            } else {
              // Fallback to YouTube If all attempts failed
              const fallbackResult = {
                data: { country: 'UNKNOWN' },
                useRutube: false
              };
              
              videoState.cachedIpData = fallbackResult;
              videoState.useRutube = false;
              
              geoTracker.error(error, { 
                fallback_used: true,
                final_choice: 'youtube' 
              });
              
              resolve(fallbackResult);
            }
          });
      }

      attemptFetch();
    });

    return videoState.ipDataPromise;
  }
  
  /**
   * Attempt different endpoints
   */
  static async tryEndpoints(endpoints, index) {
    if (index >= endpoints.length) {
      throw new Error('All geo detection endpoints failed');
    }
    
    const endpoint = endpoints[index];
    
    try {
      const response = await fetch(endpoint, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      data._endpoint = endpoint; // We add information about used endpoint
      
      return data;
      
    } catch (error) {
      console.warn(`[VideoController] Endpoint ${endpoint} failed:`, error.message);
      
      // Let's try the next endpoint
      return this.tryEndpoints(endpoints, index + 1);
    }
  }
}

// =====================================================body
// API loading with enhanced tracking
// =====================================================body
class APILoader {
  
  /**
   * Loading API for the selected player
   */
  static async loadPlayerAPI() {
    if (videoState.loadAPIPromise) {
      return videoState.loadAPIPromise;
    }

    const apiTracker = EventTracker.trackStage('Video_API_Load', 'load_player_api');

    videoState.loadAPIPromise = (async () => {
      try {
        // First we define the region
        const ipDataResult = await GeoDetector.detectRegionWithRetry();
        
        apiTracker.updateProgress(30, { region_detected: ipDataResult.useRutube ? 'RU' : 'OTHER' });

        // Determine which module to download
        const modulePath = ipDataResult.useRutube
          ? "./RutubePlayer.js?v={{{ PRODUCT_VERSION }}}"
          : "./YouTubePlayer.js?v={{{ PRODUCT_VERSION }}}";

        sendEvent(Events.Games_Video_Load_API_Started, { 
          player_type: ipDataResult.useRutube ? 'rutube' : 'youtube',
          module_path: modulePath 
        });

        apiTracker.updateProgress(50, { module_path: modulePath });

        // Loading module from Retry
        const module = await this.importWithRetry(modulePath, 3, 1000);
        
        apiTracker.updateProgress(70, { module_loaded: true });

        // Setting up global callbacks
        videoState.playerModule = module.default;
        this.setupGlobalCallbacks(ipDataResult.useRutube);
        
        apiTracker.updateProgress(90, { callbacks_setup: true });

        // Loading API (YouTube or Rutube)
        await this.loadExternalAPI();

        sendEvent(Events.Games_Video_Load_API_Finished, { 
          player_type: ipDataResult.useRutube ? 'rutube' : 'youtube',
          success: true 
        });

        apiTracker.success({
          player_type: ipDataResult.useRutube ? 'rutube' : 'youtube',
          total_time: apiTracker.elapsedTime
        });

        return videoState.playerModule;

      } catch (error) {
        sendEvent(Events.Games_Video_Load_API_Error, { 
          error_message: error.message,
          stack: error.stack?.substring(0, 500) 
        });

        apiTracker.error(error);
        
        // Clean Promise to allow repeated attempts
        videoState.loadAPIPromise = null;
        throw error;
      }
    })();

    return videoState.loadAPIPromise;
  }
  
  /**
   * Import of module with Retry logic
   */
  static async importWithRetry(modulePath, retries = 3, delay = 1000) {
    let attempts = 0;
    
    while (attempts < retries) {
      try {
        sendEvent(Events.Games_Video_API_Fetch_Started, { 
          path: modulePath, 
          attempt: attempts + 1 
        });
        
        const module = await import(modulePath);
        
        sendEvent(Events.Games_Video_API_Fetch_Finished, { 
          path: modulePath, 
          attempt: attempts + 1 
        });
        
        return module;
        
      } catch (error) {
        attempts++;
        
        sendEvent(Events.Games_Video_API_Fetch_Failed, { 
          path: modulePath, 
          attempt: attempts, 
          error: error.message 
        });
        
        console.error(`[VideoController] Import attempt ${attempts} failed:`, error);
        
        if (attempts < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempts));
        } else {
          throw new Error(`Failed to import ${modulePath} after ${retries} attempts: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Setting up global callbacks
   */
  static setupGlobalCallbacks(useRutube) {
    if (useRutube) {
      window.onRutubeIframeAPIReady = onPlayerAPIReady;
    } else {
      window.onYouTubeIframeAPIReady = onPlayerAPIReady;
    }
    
    window.onPlayerStateChange = onPlayerStateChange;
    window.onVideoStartPlaying = onVideoStartPlaying;
    window.onVideoError = onVideoError;
    window.onVideoVolumeChanged = onVideoVolumeChanged;
  }
  
  /**
   * Loading the external API
   */
  static async loadExternalAPI() {
    const externalAPITracker = EventTracker.trackStage('External_API_Load', 'load_api_script');
    
    try {
      await this.retryAsync(
        () => videoState.playerModule.loadAPI(),
        3,
        1000,
        {
          onAttemptStart: (attempt) => {
            sendEvent(Events.Games_Video_Load_API_Started, { 
              api_path: window.videoPlayerApiPath, 
              attempt 
            });
          },
          onAttemptSuccess: (attempt) => {
            sendEvent(Events.Games_Video_Load_API_Finished, { 
              api_path: window.videoPlayerApiPath, 
              attempt 
            });
          },
          onAttemptFailure: (attempt, error) => {
            sendEvent(Events.Games_Video_Load_API_Error, { 
              api_path: window.videoPlayerApiPath, 
              attempt, 
              error: error.message 
            });
          },
        }
      );
      
      externalAPITracker.success({ api_loaded: true });
      
    } catch (error) {
      externalAPITracker.error(error);
      throw error;
    }
  }
  
  /**
   * Retry feature with Callbacks
   */
  static async retryAsync(fn, retries = 3, delay = 1000, callbacks = {}) {
    const {
      onAttemptStart = () => {},
      onAttemptSuccess = () => {},
      onAttemptFailure = () => {},
    } = callbacks;

    let attempt = 0;
    while (attempt < retries) {
      onAttemptStart(attempt + 1);
      
      try {
        const result = await fn();
        onAttemptSuccess(attempt + 1);
        return result;
      } catch (error) {
        attempt++;
        onAttemptFailure(attempt, error);
        
        console.error(`[VideoController] Retry attempt ${attempt} failed:`, error.message);
        
        if (attempt >= retries) {
          throw error;
        }
        
        await new Promise(res => setTimeout(res, delay * attempt));
      }
    }
  }
}
