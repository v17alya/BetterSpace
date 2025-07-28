// audio_controller.module.js
export const AudioPlayer = (function () {
  // const audioUrls = ["../audio/megasound2.mp3"]; // all urls
  // for link type: {site_url}/{build}/{server}
  const audioUrls = ["audio/CrazyGames.mp3"]; // all urls
  // for link type: {site_url}/{server}
  // const audioUrls = ["../audio/CrazyGames.mp3"]; // all urls
  const defaultVolume = 0.05;
  const maxVolume = 1;
  const allowZeroVolume = true;
  let currentAudioIndex = 0;
  let bgAudio;
  let currentUrl;
  let playAudioTimeoutId = null; // Variable to store the timeout ID
  let audioPlaybackAllowed = true; // Flag indicating whether audio playback is allowed.

  // Helper function for consistent error messages
  function checkAudioExists(audioObject) {
    if (!audioObject) {
      console.warn("Audio object does not exist.");
      return false;
    }
    return true;
  }

  // Function to create an Audio object without a source
  function createAudio() {
    return new Audio();
  }

  // Function to set the URL source for the audio
  function setAudioSource(audioObject, audioUrl) {
    if (!checkAudioExists(audioObject)) return;

    if (currentUrl !== audioUrl) {
      currentUrl = audioUrl;
      audioObject.src = audioUrl;
      audioObject.load(); // Reloads the new audio source only if it's different
    } else {
      console.log("Audio source is already set to this URL. Skipping reload.");
    }
  }

  // Function to play the audio with readiness check
  function playAudio(audioObject) {
    console.log("playAudio");
    audioPlaybackAllowed = true;
    if (!checkAudioExists(audioObject)) return;
    attemptPlayAudio(audioObject);
  }

  // Function to resume the audio
  function resumeAudio(audioObject) {
    console.log("resumeAudio");
    audioPlaybackAllowed = true;
    if (!checkAudioExists(audioObject)) return;
    attemptPlayAudio(audioObject);
    // audioObject.play();
  }

  // Function to pause the audio
  function pauseAudio(audioObject) {
    console.log("pauseAudio");
    stopScheduleAttemptPlayAudio();
    audioPlaybackAllowed = false;
    if (!checkAudioExists(audioObject)) return;
    audioObject.pause();
  }

  // Function to set the audio volume
  function setVolume(audioObject, volumeLevel) {
    if (!checkAudioExists(audioObject)) return;

    if (volumeLevel <= 0) volumeLevel = allowZeroVolume ? 0 : 0.01;
    else if (volumeLevel >= 1) volumeLevel = 1;

    if (volumeLevel > maxVolume) volumeLevel = maxVolume;
    audioObject.volume = volumeLevel;
  }

  // Function to get the current audio volume
  function getVolume(audioObject) {
    return checkAudioExists(audioObject) ? audioObject.volume : 0;
  }

  // Function to set looping for the audio
  function setLoop(audioObject, loop) {
    if (!checkAudioExists(audioObject)) return;
    audioObject.loop = loop;
  }

  // Function to set muting for the audio
  function setMute(audioObject, mute) {
    if (!checkAudioExists(audioObject)) return;
    audioObject.muted = mute;
  }

  // Function to check if the audio is currently playing
  function isAudioPlaying(audioObject) {
    return audioObject && !audioObject.paused;
  }

  // Function to check if the audio is ready to play
  function isAudioReady(audioObject) {
    return audioObject && audioObject.readyState >= 3;
  }

  // Function to play the next audio clip in the list
  function playNextBgClip() {
    console.log("playNextBgClip");
    currentAudioIndex = (currentAudioIndex + 1) % audioUrls.length;
    setAudioSource(bgAudio, audioUrls[currentAudioIndex]);
    playAudio(bgAudio);
  }

  // Function to attempt to play audio with error handling and readiness check
  function attemptPlayAudio(audioObject) {
    console.log("attemptPlayAudio");
    if (!checkAudioExists(audioObject)) return;
    stopScheduleAttemptPlayAudio();
    if (!audioPlaybackAllowed) return;
    audioObject.removeEventListener("canplaythrough", canPlayThroughHandler);

    // Check if audio is ready to play
    if (isAudioReady(audioObject)) {
      console.log("Audio is ready. Attempting playback...");

      if (isAudioPlaying(audioObject)) {
        if (audioObject.muted) onMutedAudioPlaying();
        return;
      }

      // setMute(audioObject, true); // Mute temporarily to bypass restrictions
      audioObject
        .play()
        .then(() => {
          console.log(
            `Audio started playing successfully. playing? ${isAudioPlaying(
              audioObject
            )}`
          );
          if (audioObject.muted) {
            onMutedAudioPlaying();
            return;
          }

          if (!isAudioPlaying(audioObject)) {
            scheduleAttemptPlayAudio(audioObject);
          }
        })
        .catch((error) => {
          console.warn(`Audio play was not allowed: ${error.message}`);
          scheduleAttemptPlayAudio(audioObject);

          // if (error.name === "NotAllowedError") {
          //   console.warn(`Audio play was not allowed: ${error.message}`);
          //   unmuteAudioOnInteraction();
          // } else {
          //   console.error("An unexpected error occurred:", error);
          //   unmuteAudioOnInteraction();
          // }
        });
    } else {
      console.log("Audio is not ready. Waiting for canplaythrough...");
      audioObject.addEventListener("canplaythrough", canPlayThroughHandler, {
        once: true,
      });
    }

    function onMutedAudioPlaying() {
      console.log("onMutedAudioPlaying");
      setMute(audioObject, false); // Unmute after successful playback
      console.log(
        `Audio is muted now. playing? ${isAudioPlaying(audioObject)}`
      );

      if (!isAudioPlaying(audioObject)) {
        scheduleAttemptPlayAudio(audioObject);
      } else restartAudio(audioObject);
    }
  }

  function stopScheduleAttemptPlayAudio() {
    // Clear the previous timeout if it exists, stopping the previous attempt
    if (playAudioTimeoutId) {
      clearTimeout(playAudioTimeoutId);
      playAudioTimeoutId = null;
    }
  }

  function scheduleAttemptPlayAudio(audioObject) {
    // Clear the previous timeout if it exists, stopping the previous attempt
    stopScheduleAttemptPlayAudio();

    // Schedule a new timeout and store its ID
    playAudioTimeoutId = setTimeout(() => {
      attemptPlayAudio(audioObject);
      playAudioTimeoutId = null; // Reset the ID after the function executes
    }, 1000);
  }

  // Function to restart audio
  function restartAudio(audioObject) {
    console.log("restartAudio");
    if (!checkAudioExists(audioObject)) return;
    audioObject.currentTime = 0;
    if (!isAudioPlaying(audioObject)) attemptPlayAudio(audioObject);
  }

  // Function to add a click event listener to unmute and play audio on user interaction
  function unmuteAudioOnInteraction() {
    document.removeEventListener("click", audioClickHandler);
    document.addEventListener("click", audioClickHandler, {
      once: true,
    });
  }

  // Event handler for unmuting and playing the audio
  function audioClickHandler() {
    if (!checkAudioExists(bgAudio)) return;
    if (bgAudio.muted) {
      setMute(bgAudio, false); // Unmute after successful playback
      bgAudio.currentTime = 0;
      attemptPlayAudio(bgAudio);
    } else if (!isAudioPlaying(bgAudio)) {
      attemptPlayAudio(bgAudio);
    }
  }

  // Handler for canplaythrough event
  function canPlayThroughHandler() {
    console.log("Audio has been loaded.");
    attemptPlayAudio(bgAudio); // Try to play the audio
  }

  // Function to get currentAudioIndex
  function getCurrentAudioIndex() {
    return currentAudioIndex;
  }

  // Function to set currentAudioIndex
  function setCurrentAudioIndex(index) {
    if (index >= 0 && index < audioUrls.length) {
      currentAudioIndex = index;
    } else {
      console.warn("Invalid audio index.");
    }
  }

  // Initialize audio with source URL, volume, and loop settings
  function initializeAudio(loop = false) {
    if (checkAudioExists(bgAudio)) return bgAudio;
    audioPlaybackAllowed = true;
    bgAudio = createAudio();
    setAudioSource(bgAudio, audioUrls[0]); // Set the URL for the audio
    setVolume(bgAudio, defaultVolume); // Set volume
    setLoop(bgAudio, loop); // Enable looping
    setMute(bgAudio, true); // Mute temporarily to bypass restrictions
    playAudio(bgAudio); // Try to play the audio
    unmuteAudioOnInteraction();

    if (!loop) {
      bgAudio.addEventListener("ended", playNextBgClip);
    }

    return bgAudio;
  }

  // Public API for the AudioPlayer module
  return {
    initializeAudio,
    playAudio,
    resumeAudio,
    pauseAudio,
    setVolume,
    getVolume,
    setLoop,
    restartAudio,
    playNextBgClip,
    getCurrentAudioIndex,
    setCurrentAudioIndex,
  };
})();
