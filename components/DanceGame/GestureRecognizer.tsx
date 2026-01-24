'use client';

import { useMemo } from 'react';
import type { GestureType, GestureEvent } from '@/lib/types';
import { getGestureLabel, getGestureLane } from '@/lib/gestureDetection';

interface GestureRecognizerProps {
  /** Current detected gesture */
  currentGesture: GestureType;
  /** Last gesture event with details */
  lastGestureEvent: GestureEvent | null;
  /** Total gesture count */
  gestureCount?: number;
  /** Whether to show the gesture count */
  showCount?: boolean;
  /** Whether gesture detection is enabled */
  isEnabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Lane configuration for visual display
const LANE_CONFIG = [
  { label: 'LEFT', gesture: 'wave-left' as const, icon: '👋' },
  { label: 'CENTER', gesture: 'jump' as const, icon: '⬆️' },
  { label: 'RIGHT', gesture: 'wave-right' as const, icon: '👋' },
];

/**
 * Component that visualizes detected gestures
 * Displays three lanes (left wave, jump, right wave) with visual feedback
 */
export function GestureRecognizer({
  currentGesture,
  lastGestureEvent,
  gestureCount = 0,
  showCount = false,
  isEnabled = true,
  className = '',
}: GestureRecognizerProps) {
  // Compute active lane directly from props
  const activeLane = useMemo(() => {
    return currentGesture ? getGestureLane(currentGesture) : null;
  }, [currentGesture]);

  // Determine confidence level for visual feedback
  const confidenceLevel = useMemo(() => {
    if (!lastGestureEvent) return null;
    if (lastGestureEvent.confidence >= 0.8) return 'high';
    if (lastGestureEvent.confidence >= 0.5) return 'medium';
    return 'low';
  }, [lastGestureEvent]);

  // Use gesture count as key for animation restart
  const animationKey = gestureCount;

  return (
    <div className={`relative ${className}`}>
      {/* Gesture lanes */}
      <div className="flex justify-center gap-4">
        {LANE_CONFIG.map((lane, index) => {
          const isActive = activeLane === index;

          return (
            <div
              key={lane.gesture}
              className={`
                relative flex flex-col items-center justify-center
                w-24 h-24 rounded-2xl
                transition-all duration-150
                ${
                  isActive
                    ? 'scale-110 bg-sonic-speed/30 border-2 border-sonic-speed shadow-[0_0_20px_rgba(0,217,255,0.5)]'
                    : 'bg-white/5 border border-white/10'
                }
                ${!isEnabled ? 'opacity-50' : ''}
              `}
            >
              {/* Glow effect on activation - key forces animation restart */}
              {isActive && (
                <div
                  key={`glow-${animationKey}`}
                  className="absolute inset-0 rounded-2xl bg-sonic-speed/20 animate-ping"
                  style={{ animationDuration: '0.5s', animationIterationCount: '1' }}
                />
              )}

              {/* Icon */}
              <span
                className={`text-3xl transition-transform duration-150 ${
                  isActive ? 'scale-125' : ''
                }`}
              >
                {lane.icon}
              </span>

              {/* Label */}
              <span
                className={`mt-2 text-xs font-semibold tracking-wider ${
                  isActive ? 'text-sonic-speed' : 'text-white/50'
                }`}
              >
                {lane.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <div className="h-1 w-8 rounded-full bg-sonic-speed shadow-[0_0_10px_rgba(0,217,255,0.8)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gesture feedback text */}
      <div className="mt-6 text-center min-h-[3rem]">
        {currentGesture ? (
          <div className="flex flex-col items-center gap-1">
            <span className="neon-text text-2xl font-bold animate-pulse">
              {getGestureLabel(currentGesture)}!
            </span>
            {confidenceLevel && (
              <span
                className={`text-xs ${
                  confidenceLevel === 'high'
                    ? 'text-green-400'
                    : confidenceLevel === 'medium'
                      ? 'text-yellow-400'
                      : 'text-orange-400'
                }`}
              >
                {confidenceLevel === 'high'
                  ? 'Perfect!'
                  : confidenceLevel === 'medium'
                    ? 'Good!'
                    : 'Detected'}
              </span>
            )}
          </div>
        ) : (
          <span className="text-white/30 text-sm">
            {isEnabled ? 'Waiting for gesture...' : 'Gesture detection paused'}
          </span>
        )}
      </div>

      {/* Gesture count */}
      {showCount && (
        <div className="mt-4 text-center">
          <span className="text-sm text-white/50">
            Gestures detected:{' '}
            <span className="text-sonic-speed font-semibold">{gestureCount}</span>
          </span>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-0 right-0 flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-white/40">
          {isEnabled ? 'Detecting' : 'Paused'}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version of gesture recognizer for overlay use
 */
export function GestureIndicator({
  currentGesture,
  className = '',
}: {
  currentGesture: GestureType;
  className?: string;
}) {
  if (!currentGesture) return null;

  const lane = getGestureLane(currentGesture);
  const icon = lane !== null ? LANE_CONFIG[lane].icon : '';

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        bg-sonic-speed/30 border border-sonic-speed
        shadow-[0_0_15px_rgba(0,217,255,0.5)]
        animate-pulse
        ${className}
      `}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sonic-speed font-bold">{getGestureLabel(currentGesture)}</span>
    </div>
  );
}
