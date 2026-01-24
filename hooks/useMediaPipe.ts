'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoseResult, MediaPipeState, Landmark } from '@/lib/types';

// CDN URL for MediaPipe model files - pinned to match package.json version
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';

interface UseMediaPipeOptions {
  onPoseDetected?: (pose: PoseResult | null) => void;
  runningMode?: 'VIDEO' | 'IMAGE';
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

interface UseMediaPipeReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: MediaPipeState;
  error: string | null;
  currentPose: PoseResult | null;
  startDetection: () => void;
  stopDetection: () => void;
  isDetecting: boolean;
}

export function useMediaPipe(options: UseMediaPipeOptions = {}): UseMediaPipeReturn {
  const {
    onPoseDetected,
    runningMode = 'VIDEO',
    minPoseDetectionConfidence = 0.5,
    minPosePresenceConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<unknown>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const isDetectingRef = useRef(false); // Use ref to avoid stale closure in animation loop

  const [state, setState] = useState<MediaPipeState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let mounted = true;

    async function initializeMediaPipe() {
      try {
        // Dynamic import to avoid SSR issues
        const vision = await import('@mediapipe/tasks-vision');
        const { PoseLandmarker, FilesetResolver } = vision;

        // Initialize the fileset resolver
        const visionFileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);

        // Create the pose landmarker
        const poseLandmarker = await PoseLandmarker.createFromOptions(visionFileset, {
          baseOptions: {
            modelAssetPath: `${MEDIAPIPE_CDN}/pose_landmarker_lite.task`,
            delegate: 'GPU',
          },
          runningMode: runningMode,
          numPoses: 1,
          minPoseDetectionConfidence,
          minPosePresenceConfidence,
          minTrackingConfidence,
        });

        if (mounted) {
          poseLandmarkerRef.current = poseLandmarker;
          setState('ready');
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to initialize MediaPipe:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detection');
          setState('error');
        }
      }
    }

    initializeMediaPipe();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up pose landmarker
      if (poseLandmarkerRef.current) {
        const landmarker = poseLandmarkerRef.current as { close?: () => void };
        if (typeof landmarker.close === 'function') {
          landmarker.close();
        }
      }
    };
  }, [runningMode, minPoseDetectionConfidence, minPosePresenceConfidence, minTrackingConfidence]);

  // Detection loop
  const detectPose = useCallback(() => {
    const video = videoRef.current;
    const poseLandmarker = poseLandmarkerRef.current as {
      detectForVideo: (
        video: HTMLVideoElement,
        timestamp: number
      ) => {
        landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
        worldLandmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
      };
    } | null;

    if (!video || !poseLandmarker || video.readyState < 2) {
      if (isDetectingRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectPose);
      }
      return;
    }

    // Only process if we have a new frame
    const currentTime = video.currentTime;
    if (currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = currentTime;

      try {
        const result = poseLandmarker.detectForVideo(video, performance.now());

        if (result.landmarks && result.landmarks.length > 0) {
          const poseResult: PoseResult = {
            landmarks: result.landmarks[0].map((lm): Landmark => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility,
            })),
            worldLandmarks: result.worldLandmarks?.[0]?.map((lm): Landmark => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility,
            })),
            timestamp: performance.now(),
          };

          setCurrentPose(poseResult);
          onPoseDetected?.(poseResult);
        } else {
          setCurrentPose(null);
          onPoseDetected?.(null);
        }
      } catch (err) {
        console.error('Pose detection error:', err);
      }
    }

    if (isDetectingRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }
  }, [onPoseDetected]);

  // Start detection
  const startDetection = useCallback(() => {
    if (state !== 'ready') {
      console.warn('MediaPipe not ready yet');
      return;
    }
    setIsDetecting(true);
  }, [state]);

  // Stop detection
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Run detection loop when isDetecting changes
  useEffect(() => {
    if (isDetecting && state === 'ready') {
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDetecting, state, detectPose]);

  return {
    videoRef,
    canvasRef,
    state,
    error,
    currentPose,
    startDetection,
    stopDetection,
    isDetecting,
  };
}
