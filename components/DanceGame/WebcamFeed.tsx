'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { CameraState, PoseResult, Landmark } from '@/lib/types';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '@/lib/types';

interface WebcamFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pose: PoseResult | null;
  showSkeleton?: boolean;
  mirrored?: boolean;
  onCameraStateChange?: (state: CameraState) => void;
  className?: string;
}

// Skeleton drawing colors for the Sonic theme
const SKELETON_COLORS = {
  connection: 'rgba(0, 217, 255, 0.8)', // sonic-speed
  landmark: 'rgba(255, 215, 0, 0.9)', // sonic-accent
  wristHighlight: 'rgba(0, 217, 255, 1)', // Highlighted for wave detection
  hipHighlight: 'rgba(0, 217, 255, 1)', // Highlighted for jump detection
};

export function WebcamFeed({
  videoRef,
  canvasRef,
  pose,
  showSkeleton = true,
  mirrored = true,
  onCameraStateChange,
  className = '',
}: WebcamFeedProps) {
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);

  // Notify parent of camera state changes
  useEffect(() => {
    onCameraStateChange?.(cameraState);
  }, [cameraState, onCameraStateChange]);

  // Request camera access - returns the new state
  const requestCameraAsync = useCallback(async (): Promise<CameraState> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        return 'active';
      }
      return 'error';
    } catch (err) {
      console.error('Camera access error:', err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera access was denied. Please allow camera access to play.');
          return 'denied';
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('No camera found. Please connect a camera to play.');
          return 'error';
        } else {
          setErrorMessage(`Camera error: ${err.message}`);
          return 'error';
        }
      } else {
        setErrorMessage('An unexpected error occurred accessing the camera.');
        return 'error';
      }
    }
  }, [videoRef]);

  // Retry camera access (for button clicks)
  const retryCamera = useCallback(async () => {
    setErrorMessage(null);
    setCameraState('requesting');
    const newState = await requestCameraAsync();
    setCameraState(newState);
  }, [requestCameraAsync]);

  // Initialize camera on mount
  useEffect(() => {
    // Prevent double-initialization in strict mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;

    const initCamera = async () => {
      setCameraState('requesting');
      const newState = await requestCameraAsync();
      if (!cancelled) {
        setCameraState(newState);
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      mountedRef.current = false; // Reset on unmount to allow re-initialization
      // Cleanup: stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [requestCameraAsync]);

  // Draw skeleton overlay on canvas
  useEffect(() => {
    if (!showSkeleton || !pose || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;

    // Match canvas size to video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Handle mirroring
    if (mirrored) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }

    // Draw connections (bones)
    ctx.strokeStyle = SKELETON_COLORS.connection;
    ctx.lineWidth = 3;

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = pose.landmarks[startIdx];
      const end = pose.landmarks[endIdx];

      if (start && end && (start.visibility ?? 1) > 0.5 && (end.visibility ?? 1) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    }

    // Draw landmarks (joints)
    const drawLandmark = (landmark: Landmark, color: string, radius: number) => {
      if (!landmark || (landmark.visibility ?? 1) < 0.5) return;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, radius, 0, 2 * Math.PI);
      ctx.fill();
    };

    // Draw all landmarks
    pose.landmarks.forEach((landmark, index) => {
      // Highlight important landmarks for the game
      const isWrist =
        index === POSE_LANDMARKS.LEFT_WRIST || index === POSE_LANDMARKS.RIGHT_WRIST;
      const isHip = index === POSE_LANDMARKS.LEFT_HIP || index === POSE_LANDMARKS.RIGHT_HIP;

      if (isWrist) {
        drawLandmark(landmark, SKELETON_COLORS.wristHighlight, 10);
      } else if (isHip) {
        drawLandmark(landmark, SKELETON_COLORS.hipHighlight, 8);
      } else {
        drawLandmark(landmark, SKELETON_COLORS.landmark, 5);
      }
    });

    if (mirrored) {
      ctx.restore();
    }
  }, [pose, showSkeleton, canvasRef, videoRef, mirrored]);

  // Render based on camera state
  const renderContent = () => {
    switch (cameraState) {
      case 'idle':
      case 'requesting':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-sonic-speed border-t-transparent mx-auto" />
              <p className="text-white/70">Requesting camera access...</p>
            </div>
          </div>
        );

      case 'denied':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
            <div className="glass-card max-w-sm rounded-xl p-6 text-center">
              <div className="mb-4 text-5xl">
                <span role="img" aria-label="No camera">
                  No Camera
                </span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Camera Access Denied</h3>
              <p className="mb-4 text-white/70">{errorMessage}</p>
              <button
                onClick={retryCamera}
                className="rounded-lg bg-sonic-speed px-6 py-2 font-semibold text-background transition-all hover:bg-sonic-light"
              >
                Try Again
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
            <div className="glass-card max-w-sm rounded-xl p-6 text-center">
              <div className="mb-4 text-5xl">
                <span role="img" aria-label="Error">
                  Error
                </span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Camera Error</h3>
              <p className="mb-4 text-white/70">{errorMessage}</p>
              <button
                onClick={retryCamera}
                className="rounded-lg bg-sonic-speed px-6 py-2 font-semibold text-background transition-all hover:bg-sonic-light"
              >
                Retry
              </button>
            </div>
          </div>
        );

      case 'active':
        return null; // Video is showing
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-black ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        style={{ display: cameraState === 'active' ? 'block' : 'none' }}
      />

      {/* Canvas overlay for skeleton */}
      {showSkeleton && cameraState === 'active' && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      {/* State overlays */}
      {renderContent()}
    </div>
  );
}
