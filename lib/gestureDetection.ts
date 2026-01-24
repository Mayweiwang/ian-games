/**
 * Pure functions for gesture detection logic
 *
 * Coordinate system notes:
 * - x: 0-1, left-right (0 = left edge, 1 = right edge)
 * - y: 0-1, top-bottom (0 = top edge, 1 = bottom edge)
 * - So LOWER y values mean HIGHER position in frame
 */

import type { Landmark, CalibrationData, GestureType } from './types';
import { POSE_LANDMARKS } from './types';

// Position sample for tracking movement over time
export interface PositionSample {
  y: number;
  timestamp: number;
}

// State for tracking wrist positions
export interface WristTrackingState {
  samples: PositionSample[];
  lastGestureTime: number;
}

// State for tracking jump
export interface JumpTrackingState {
  isInJump: boolean;
  lastGestureTime: number;
}

// Combined gesture tracking state
export interface GestureTrackingState {
  leftWrist: WristTrackingState;
  rightWrist: WristTrackingState;
  jump: JumpTrackingState;
}

// Default options
export const DEFAULT_GESTURE_OPTIONS = {
  waveThreshold: 0.05,      // min Y movement for wave detection
  waveTimeWindow: 500,      // ms window for wave detection
  jumpThreshold: 0.08,      // min Y rise for jump detection
  debounceTime: 500,        // ms between same gesture type
} as const;

/**
 * Create initial gesture tracking state
 */
export function createInitialGestureState(): GestureTrackingState {
  return {
    leftWrist: { samples: [], lastGestureTime: 0 },
    rightWrist: { samples: [], lastGestureTime: 0 },
    jump: { isInJump: false, lastGestureTime: 0 },
  };
}

/**
 * Add a position sample to the sliding window
 * Removes samples older than the time window
 */
export function addPositionSample(
  state: WristTrackingState,
  y: number,
  timestamp: number,
  timeWindow: number
): WristTrackingState {
  const cutoffTime = timestamp - timeWindow;

  // Filter out old samples and add new one
  const samples = [
    ...state.samples.filter(s => s.timestamp > cutoffTime),
    { y, timestamp }
  ];

  return {
    ...state,
    samples,
  };
}

/**
 * Detect wave gesture from wrist position samples
 * A wave is detected when the wrist moves up then down (or down then up)
 * with sufficient amplitude within the time window
 */
export function detectWave(
  samples: PositionSample[],
  threshold: number
): { detected: boolean; confidence: number } {
  if (samples.length < 3) {
    return { detected: false, confidence: 0 };
  }

  // Find min and max Y positions
  let minY = Infinity;
  let maxY = -Infinity;
  let minTime = 0;
  let maxTime = 0;

  for (const sample of samples) {
    if (sample.y < minY) {
      minY = sample.y;
      minTime = sample.timestamp;
    }
    if (sample.y > maxY) {
      maxY = sample.y;
      maxTime = sample.timestamp;
    }
  }

  const amplitude = maxY - minY;

  // Check if amplitude exceeds threshold
  if (amplitude < threshold) {
    return { detected: false, confidence: 0 };
  }

  // Check for oscillation pattern (up-down or down-up)
  // The min and max should be at different times (not the same sample)
  const hasOscillation = Math.abs(minTime - maxTime) > 50; // at least 50ms apart

  if (!hasOscillation) {
    return { detected: false, confidence: 0 };
  }

  // Calculate confidence based on amplitude (more movement = higher confidence)
  // Normalize to 0-1 range, with max confidence at 2x threshold
  const confidence = Math.min(1, amplitude / (threshold * 2));

  return { detected: true, confidence };
}

/**
 * Detect jump gesture by comparing current hip position to calibration baseline
 * Jump is detected when hips rise (y decreases) by more than threshold
 */
export function detectJump(
  landmarks: Landmark[],
  calibration: CalibrationData,
  state: JumpTrackingState,
  threshold: number
): { detected: boolean; newState: JumpTrackingState; confidence: number } {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // Ensure we have valid hip landmarks
  if (!leftHip || !rightHip) {
    return { detected: false, newState: state, confidence: 0 };
  }

  // Check visibility
  const leftVisible = (leftHip.visibility ?? 0) > 0.5;
  const rightVisible = (rightHip.visibility ?? 0) > 0.5;

  if (!leftVisible && !rightVisible) {
    return { detected: false, newState: state, confidence: 0 };
  }

  // Calculate current hip center Y
  const currentHipY = (leftHip.y + rightHip.y) / 2;
  const baselineHipY = calibration.hipCenterY;

  // Calculate rise (negative delta means rising since Y increases downward)
  const rise = baselineHipY - currentHipY;

  // Also check ankles if available for additional confidence
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  let ankleRise = 0;

  if (leftAnkle && rightAnkle && calibration.leftHip && calibration.rightHip) {
    // Estimate baseline ankle position (typically ~0.3 units below hips)
    const baselineAnkleY = calibration.hipCenterY + 0.3;
    const currentAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    ankleRise = baselineAnkleY - currentAnkleY;
  }

  // Determine if we're in a jump
  const isJumping = rise > threshold;

  // If we're currently jumping and weren't before, and debounce has passed
  if (isJumping && !state.isInJump) {
    // Calculate confidence based on how much they jumped
    // Higher jump = higher confidence, max out at 2x threshold
    const jumpConfidence = Math.min(1, rise / (threshold * 2));
    const ankleBonus = ankleRise > threshold * 0.5 ? 0.1 : 0;
    const confidence = Math.min(1, jumpConfidence + ankleBonus);

    return {
      detected: true,
      newState: { isInJump: true, lastGestureTime: Date.now() },
      confidence,
    };
  }

  // If we're not jumping anymore (returned to baseline)
  if (!isJumping && state.isInJump) {
    return {
      detected: false,
      newState: { isInJump: false, lastGestureTime: state.lastGestureTime },
      confidence: 0,
    };
  }

  // No change
  return {
    detected: false,
    newState: state,
    confidence: 0,
  };
}

/**
 * Process a pose frame and detect gestures
 * Returns the detected gesture (if any) and updated state
 */
export function processGestureFrame(
  landmarks: Landmark[],
  calibration: CalibrationData,
  state: GestureTrackingState,
  timestamp: number,
  options: {
    waveThreshold: number;
    waveTimeWindow: number;
    jumpThreshold: number;
    debounceTime: number;
  }
): { gesture: GestureType; newState: GestureTrackingState; confidence: number } {
  const { waveThreshold, waveTimeWindow, jumpThreshold, debounceTime } = options;

  const newState = { ...state };
  let detectedGesture: GestureType = null;
  let confidence = 0;

  // Get wrist landmarks
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  // Process left wrist for wave detection
  if (leftWrist && (leftWrist.visibility ?? 0) > 0.5) {
    newState.leftWrist = addPositionSample(
      state.leftWrist,
      leftWrist.y,
      timestamp,
      waveTimeWindow
    );

    // Check debounce
    const timeSinceLastGesture = timestamp - state.leftWrist.lastGestureTime;
    if (timeSinceLastGesture > debounceTime) {
      const waveResult = detectWave(newState.leftWrist.samples, waveThreshold);
      if (waveResult.detected) {
        detectedGesture = 'wave-left';
        confidence = waveResult.confidence;
        // Reset samples and update last gesture time
        newState.leftWrist = {
          samples: [],
          lastGestureTime: timestamp,
        };
      }
    }
  }

  // Process right wrist for wave detection (only if no left wave detected)
  if (!detectedGesture && rightWrist && (rightWrist.visibility ?? 0) > 0.5) {
    newState.rightWrist = addPositionSample(
      state.rightWrist,
      rightWrist.y,
      timestamp,
      waveTimeWindow
    );

    // Check debounce
    const timeSinceLastGesture = timestamp - state.rightWrist.lastGestureTime;
    if (timeSinceLastGesture > debounceTime) {
      const waveResult = detectWave(newState.rightWrist.samples, waveThreshold);
      if (waveResult.detected) {
        detectedGesture = 'wave-right';
        confidence = waveResult.confidence;
        // Reset samples and update last gesture time
        newState.rightWrist = {
          samples: [],
          lastGestureTime: timestamp,
        };
      }
    }
  }

  // Process jump detection (only if no wave detected)
  if (!detectedGesture) {
    const timeSinceLastJump = timestamp - state.jump.lastGestureTime;
    if (timeSinceLastJump > debounceTime) {
      const jumpResult = detectJump(landmarks, calibration, state.jump, jumpThreshold);
      newState.jump = jumpResult.newState;

      if (jumpResult.detected) {
        detectedGesture = 'jump';
        confidence = jumpResult.confidence;
      }
    } else {
      // Still update jump state for tracking (but don't detect new jumps)
      const jumpResult = detectJump(landmarks, calibration, state.jump, jumpThreshold);
      newState.jump = {
        ...jumpResult.newState,
        lastGestureTime: state.jump.lastGestureTime, // Keep original debounce time
      };
    }
  }

  return {
    gesture: detectedGesture,
    newState,
    confidence,
  };
}

/**
 * Get a human-readable label for a gesture type
 */
export function getGestureLabel(gesture: GestureType): string {
  switch (gesture) {
    case 'wave-left':
      return 'Left Wave';
    case 'wave-right':
      return 'Right Wave';
    case 'jump':
      return 'Jump';
    default:
      return '';
  }
}

/**
 * Get the lane index for a gesture (for game matching)
 * Left = 0, Center = 1, Right = 2
 */
export function getGestureLane(gesture: GestureType): number | null {
  switch (gesture) {
    case 'wave-left':
      return 0;
    case 'jump':
      return 1;
    case 'wave-right':
      return 2;
    default:
      return null;
  }
}
