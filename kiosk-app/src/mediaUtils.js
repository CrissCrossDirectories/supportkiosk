/**
 * mediaUtils.js - Utilities for handling camera and audio permissions
 * Optimized for iPad Guided Access / Kiosk mode
 */

/**
 * Request camera access with proper error handling for iPad
 * @param {Object} options - Configuration options
 * @param {boolean} options.preferRearCamera - Prefer rear camera (better for barcode scanning)
 * @returns {Promise<MediaStream>} - Media stream with video track
 */
export const requestCameraAccess = async (options = {}) => {
  const { preferRearCamera = true } = options;

  try {
    const constraints = {
      video: {
        // iPad optimization: prefer rear camera for better barcode scanning
        facingMode: preferRearCamera ? { ideal: "environment" } : { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false, // Request video only, audio separately
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { success: true, stream, error: null };
  } catch (error) {
    console.error("Camera access request failed:", error);

    let userFriendlyError = "Could not access camera";

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      userFriendlyError =
        "Camera access was denied. Please enable camera permissions in Safari Settings > Tech Support Kiosk > Camera.";
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      userFriendlyError = "No camera device found on this device.";
    } else if (error.name === "NotReadableError") {
      userFriendlyError = "Camera is in use by another application. Please close other apps and try again.";
    } else if (error.name === "TypeError") {
      userFriendlyError = "Camera request not supported on this browser.";
    }

    return { success: false, stream: null, error: userFriendlyError };
  }
};

/**
 * Request microphone access with iPad optimizations
 * @param {Object} options - Configuration options
 * @param {boolean} options.noiseSuppression - Enable noise suppression
 * @param {boolean} options.echoCancellation - Enable echo cancellation
 * @returns {Promise<MediaStream>} - Media stream with audio track
 */
export const requestMicrophoneAccess = async (options = {}) => {
  const { noiseSuppression = true, echoCancellation = true } = options;

  try {
    const constraints = {
      audio: {
        noiseSuppression: noiseSuppression,
        echoCancellation: echoCancellation,
        // iPad may benefit from explicit gain control
        autoGainControl: true,
      },
      video: false, // Audio only
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { success: true, stream, error: null };
  } catch (error) {
    console.error("Microphone access request failed:", error);

    let userFriendlyError = "Could not access microphone";

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      userFriendlyError =
        "Microphone access was denied. Please enable microphone permissions in Safari Settings > Tech Support Kiosk > Microphone.";
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      userFriendlyError = "No microphone device found on this device.";
    } else if (error.name === "NotReadableError") {
      userFriendlyError = "Microphone is in use by another application.";
    }

    return { success: false, stream: null, error: userFriendlyError };
  }
};

/**
 * Stop all media tracks in a stream
 * @param {MediaStream} stream - Media stream to stop
 */
export const stopMediaStream = (stream) => {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
};

/**
 * Check if Speech Recognition API is available
 * @returns {boolean}
 */
export const isSpeechRecognitionSupported = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return !!SpeechRecognition;
};

/**
 * Get Speech Recognition constructor
 * @returns {Function|null}
 */
export const getSpeechRecognitionAPI = () => {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Create and configure a Speech Recognition instance
 * @returns {SpeechRecognition|null}
 */
export const createSpeechRecognition = () => {
  const SpeechRecognition = getSpeechRecognitionAPI();
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  return recognition;
};

/**
 * iPad-specific check for Guided Access mode
 * Note: Cannot directly detect Guided Access, but we can optimize for it
 * @returns {boolean}
 */
export const isLikelyKioskMode = () => {
  // Check if device appears to be locked down
  // iPad in Guided Access mode typically has reduced system UI
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasFullscreenAPI = document.fullscreenEnabled || document.webkitFullscreenEnabled;

  return isIOS && hasFullscreenAPI;
};

/**
 * Request fullscreen with error handling
 * @param {HTMLElement} element - Element to display fullscreen
 * @returns {Promise<void>}
 */
export const requestFullscreen = async (element = document.documentElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen request failed:", error);
    // Not critical for kiosk mode - Guided Access handles this
  }
};

/**
 * Exit fullscreen
 * @returns {Promise<void>}
 */
export const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    }
  } catch (error) {
    console.warn("Exit fullscreen failed:", error);
  }
};
