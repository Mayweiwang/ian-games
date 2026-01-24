'use client';

import { useEffect, useCallback } from 'react';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { WebcamFeed } from './WebcamFeed';
import type { PoseResult, CameraState, MediaPipeState } from '@/lib/types';

interface PoseDetectorProps {
  onPoseUpdate?: (pose: PoseResult | null) => void;
  onCameraStateChange?: (state: CameraState) => void;
  onMediaPipeStateChange?: (state: MediaPipeState) => void;
  showSkeleton?: boolean;
  autoStart?: boolean;
  className?: string;
}

export function PoseDetector({
  onPoseUpdate,
  onCameraStateChange,
  onMediaPipeStateChange,
  showSkeleton = true,
  autoStart = true,
  className = '',
}: PoseDetectorProps) {
  const {
    videoRef,
    canvasRef,
    state: mediaPipeState,
    error: mediaPipeError,
    currentPose,
    startDetection,
    stopDetection,
    isDetecting,
  } = useMediaPipe({
    onPoseDetected: onPoseUpdate,
    runningMode: 'VIDEO',
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // Notify parent of MediaPipe state changes
  useEffect(() => {
    onMediaPipeStateChange?.(mediaPipeState);
  }, [mediaPipeState, onMediaPipeStateChange]);

  // Handle camera state to auto-start detection when camera is active
  const handleCameraStateChange = useCallback(
    (cameraState: CameraState) => {
      onCameraStateChange?.(cameraState);

      // Auto-start detection when camera becomes active and MediaPipe is ready
      if (autoStart && cameraState === 'active' && mediaPipeState === 'ready' && !isDetecting) {
        startDetection();
      }
    },
    [autoStart, mediaPipeState, isDetecting, startDetection, onCameraStateChange]
  );

  // Start detection when MediaPipe becomes ready (if camera is already active)
  useEffect(() => {
    if (autoStart && mediaPipeState === 'ready' && videoRef.current?.srcObject && !isDetecting) {
      startDetection();
    }
  }, [autoStart, mediaPipeState, videoRef, isDetecting, startDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return (
    <div className={`relative ${className}`}>
      {/* Webcam feed with skeleton overlay */}
      <WebcamFeed
        videoRef={videoRef}
        canvasRef={canvasRef}
        pose={currentPose}
        showSkeleton={showSkeleton}
        mirrored={true}
        onCameraStateChange={handleCameraStateChange}
        className="aspect-video w-full"
      />

      {/* MediaPipe loading indicator */}
      {mediaPipeState === 'loading' && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sonic-speed border-t-transparent" />
          <span className="text-sm text-white/70">Loading pose detection...</span>
        </div>
      )}

      {/* MediaPipe ready indicator */}
      {mediaPipeState === 'ready' && isDetecting && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-sonic-speed/20 px-3 py-2 backdrop-blur-sm">
          <div className="h-3 w-3 rounded-full bg-sonic-speed animate-pulse" />
          <span className="text-sm text-sonic-speed">Tracking active</span>
        </div>
      )}

      {/* MediaPipe error */}
      {mediaPipeState === 'error' && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-red-500/20 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm text-red-300">
            <strong>Pose detection error:</strong> {mediaPipeError || 'Unknown error'}
          </p>
        </div>
      )}

      {/* Pose detection status */}
      {currentPose && (
        <div className="absolute bottom-4 right-4 rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
          <span className="text-xs text-white/50">
            {currentPose.landmarks.length} landmarks detected
          </span>
        </div>
      )}
    </div>
  );
}
