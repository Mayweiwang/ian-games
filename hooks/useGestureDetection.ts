'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import type {
  PoseResult,
  CalibrationData,
  GestureType,
  GestureEvent,
  GestureDetectionOptions,
  OnGestureCallback,
} from '@/lib/types';
import {
  createInitialGestureState,
  processGestureFrame,
  DEFAULT_GESTURE_OPTIONS,
  type GestureTrackingState,
} from '@/lib/gestureDetection';

interface UseGestureDetectionOptions extends GestureDetectionOptions {
  onGesture?: OnGestureCallback;
  enabled?: boolean;
}

interface UseGestureDetectionReturn {
  /** Current detected gesture (null if none) */
  currentGesture: GestureType;
  /** Last gesture event with timestamp and confidence */
  lastGestureEvent: GestureEvent | null;
  /** Process a pose frame for gesture detection */
  processPose: (pose: PoseResult | null) => void;
  /** Reset the gesture detection state */
  reset: () => void;
  /** Total number of gestures detected since last reset */
  gestureCount: number;
  /** Whether gesture detection is currently enabled */
  isEnabled: boolean;
  /** Enable gesture detection */
  enable: () => void;
  /** Disable gesture detection */
  disable: () => void;
}

/**
 * Hook for detecting gestures from pose data
 *
 * @param calibration - Calibration data from the calibration step
 * @param options - Detection options and callbacks
 * @returns Gesture detection state and controls
 */
export function useGestureDetection(
  calibration: CalibrationData | null,
  options: UseGestureDetectionOptions = {}
): UseGestureDetectionReturn {
  const {
    waveThreshold = DEFAULT_GESTURE_OPTIONS.waveThreshold,
    waveTimeWindow = DEFAULT_GESTURE_OPTIONS.waveTimeWindow,
    jumpThreshold = DEFAULT_GESTURE_OPTIONS.jumpThreshold,
    debounceTime = DEFAULT_GESTURE_OPTIONS.debounceTime,
    onGesture,
    enabled: initialEnabled = true,
  } = options;

  // State
  const [currentGesture, setCurrentGesture] = useState<GestureType>(null);
  const [lastGestureEvent, setLastGestureEvent] = useState<GestureEvent | null>(null);
  const [gestureCount, setGestureCount] = useState(0);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  // Refs for mutable state (to avoid stale closures)
  const gestureStateRef = useRef<GestureTrackingState>(createInitialGestureState());
  const onGestureRef = useRef(onGesture);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

  // Clear current gesture after a short delay (for visual feedback)
  const clearGestureAfterDelay = useCallback((delay: number = 300) => {
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    gestureTimeoutRef.current = setTimeout(() => {
      setCurrentGesture(null);
    }, delay);
  }, []);

  // Process a pose frame
  const processPose = useCallback(
    (pose: PoseResult | null) => {
      // Don't process if disabled or no calibration
      if (!isEnabled || !calibration || !pose) {
        return;
      }

      const timestamp = pose.timestamp;

      // Process the frame for gesture detection
      const result = processGestureFrame(
        pose.landmarks,
        calibration,
        gestureStateRef.current,
        timestamp,
        {
          waveThreshold,
          waveTimeWindow,
          jumpThreshold,
          debounceTime,
        }
      );

      // Update state
      gestureStateRef.current = result.newState;

      // If a gesture was detected
      if (result.gesture) {
        const gestureEvent: GestureEvent = {
          type: result.gesture,
          timestamp,
          confidence: result.confidence,
        };

        setCurrentGesture(result.gesture);
        setLastGestureEvent(gestureEvent);
        setGestureCount((prev) => prev + 1);

        // Call the callback
        onGestureRef.current?.(gestureEvent);

        // Clear gesture after delay
        clearGestureAfterDelay();
      }
    },
    [calibration, isEnabled, waveThreshold, waveTimeWindow, jumpThreshold, debounceTime, clearGestureAfterDelay]
  );

  // Reset gesture detection state
  const reset = useCallback(() => {
    gestureStateRef.current = createInitialGestureState();
    setCurrentGesture(null);
    setLastGestureEvent(null);
    setGestureCount(0);

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
  }, []);

  // Enable/disable functions
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    setCurrentGesture(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentGesture,
    lastGestureEvent,
    processPose,
    reset,
    gestureCount,
    isEnabled,
    enable,
    disable,
  };
}
