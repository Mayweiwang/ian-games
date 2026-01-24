'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PoseDetector } from './PoseDetector';
import type {
  PoseResult,
  CalibrationData,
  CameraState,
  MediaPipeState,
  OnCalibrationComplete,
} from '@/lib/types';
import { POSE_LANDMARKS } from '@/lib/types';

interface CalibrationScreenProps {
  onCalibrationComplete: OnCalibrationComplete;
  onCancel?: () => void;
}

type CalibrationStep = 'waiting-camera' | 'waiting-pose' | 'countdown' | 'capturing' | 'complete';

const COUNTDOWN_SECONDS = 3;
const CAPTURE_FRAMES = 15; // Number of frames to average for calibration

// Calculate average calibration from captured poses - defined outside component
function calculateCalibration(poses: PoseResult[]): CalibrationData {
  const averageLandmark = (landmarkIndex: number) => {
    let sumX = 0,
      sumY = 0,
      sumZ = 0,
      sumVis = 0;
    let count = 0;

    for (const pose of poses) {
      const lm = pose.landmarks[landmarkIndex];
      if (lm && (lm.visibility ?? 0) > 0.5) {
        sumX += lm.x;
        sumY += lm.y;
        sumZ += lm.z;
        sumVis += lm.visibility ?? 1;
        count++;
      }
    }

    if (count === 0) {
      return { x: 0.5, y: 0.5, z: 0, visibility: 0 };
    }

    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
      visibility: sumVis / count,
    };
  };

  const leftHip = averageLandmark(POSE_LANDMARKS.LEFT_HIP);
  const rightHip = averageLandmark(POSE_LANDMARKS.RIGHT_HIP);
  const leftShoulder = averageLandmark(POSE_LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = averageLandmark(POSE_LANDMARKS.RIGHT_SHOULDER);
  const nose = averageLandmark(POSE_LANDMARKS.NOSE);
  const leftWrist = averageLandmark(POSE_LANDMARKS.LEFT_WRIST);
  const rightWrist = averageLandmark(POSE_LANDMARKS.RIGHT_WRIST);

  return {
    leftHip,
    rightHip,
    leftShoulder,
    rightShoulder,
    nose,
    leftWrist,
    rightWrist,
    hipCenterY: (leftHip.y + rightHip.y) / 2,
    shoulderCenterY: (leftShoulder.y + rightShoulder.y) / 2,
    timestamp: Date.now(),
  };
}

export function CalibrationScreen({ onCalibrationComplete, onCancel }: CalibrationScreenProps) {
  const [step, setStep] = useState<CalibrationStep>('waiting-camera');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [mediaPipeState, setMediaPipeState] = useState<MediaPipeState>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [poseDetected, setPoseDetected] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  const capturedPosesRef = useRef<PoseResult[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle pose updates
  const handlePoseUpdate = useCallback(
    (pose: PoseResult | null) => {
      const hasPose = pose !== null && pose.landmarks.length >= 33;
      setPoseDetected(hasPose);

      // Check if we have all required landmarks with good visibility
      if (hasPose) {
        const leftHip = pose.landmarks[POSE_LANDMARKS.LEFT_HIP];
        const rightHip = pose.landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const leftShoulder = pose.landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = pose.landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

        const hasKeyLandmarks =
          (leftHip?.visibility ?? 0) > 0.5 &&
          (rightHip?.visibility ?? 0) > 0.5 &&
          (leftShoulder?.visibility ?? 0) > 0.5 &&
          (rightShoulder?.visibility ?? 0) > 0.5;

        if (hasKeyLandmarks && step === 'waiting-pose') {
          // Start countdown when pose is detected
          setStep('countdown');
          setCountdown(COUNTDOWN_SECONDS);
        }

        // Capture frames during capturing step
        if (step === 'capturing' && capturedPosesRef.current.length < CAPTURE_FRAMES) {
          capturedPosesRef.current.push(pose);
          setCaptureProgress(capturedPosesRef.current.length / CAPTURE_FRAMES);

          if (capturedPosesRef.current.length >= CAPTURE_FRAMES) {
            // Calculate average calibration data
            const calibrationData = calculateCalibration(capturedPosesRef.current);
            setStep('complete');
            onCalibrationComplete(calibrationData);
          }
        }
      } else if (step === 'countdown') {
        // Lost pose during countdown, reset
        setStep('waiting-pose');
        setCountdown(COUNTDOWN_SECONDS);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    },
    [step, onCalibrationComplete]
  );

  // Handle camera state changes
  const handleCameraStateChange = useCallback((state: CameraState) => {
    setCameraState(state);
    if (state === 'active') {
      setStep('waiting-pose');
    }
  }, []);

  // Handle MediaPipe state changes
  const handleMediaPipeStateChange = useCallback((state: MediaPipeState) => {
    setMediaPipeState(state);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step === 'countdown') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Start capturing
            setStep('capturing');
            capturedPosesRef.current = [];
            setCaptureProgress(0);
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [step]);

  // Render instruction text based on current step
  const renderInstructions = () => {
    switch (step) {
      case 'waiting-camera':
        return (
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Setting Up Camera</h2>
            <p className="text-white/70">Please allow camera access to continue...</p>
          </div>
        );

      case 'waiting-pose':
        return (
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Stand In Frame</h2>
            <p className="text-white/70">
              Position yourself so your full upper body is visible
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <div className={`h-3 w-3 rounded-full ${poseDetected ? 'bg-sonic-speed' : 'bg-white/30'}`} />
              <span className="text-sm text-white/50">
                {poseDetected ? 'Pose detected!' : 'Waiting for pose...'}
              </span>
            </div>
          </div>
        );

      case 'countdown':
        return (
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Hold Still!</h2>
            <div className="neon-text text-8xl font-bold">{countdown}</div>
            <p className="mt-4 text-white/70">Stay in position...</p>
          </div>
        );

      case 'capturing':
        return (
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-white">Calibrating...</h2>
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-sonic-speed transition-all duration-100"
                style={{ width: `${captureProgress * 100}%` }}
              />
            </div>
            <p className="mt-4 text-white/70">Keep still...</p>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-sonic-speed">Calibration Complete!</h2>
            <p className="text-white/70">Starting game...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="neon-text mb-2 text-4xl font-bold">Calibration</h1>
          <p className="text-white/60">Let&apos;s make sure we can track your moves!</p>
        </div>

        {/* Camera feed */}
        <div className="glass-card overflow-hidden rounded-2xl p-2">
          <PoseDetector
            onPoseUpdate={handlePoseUpdate}
            onCameraStateChange={handleCameraStateChange}
            onMediaPipeStateChange={handleMediaPipeStateChange}
            showSkeleton={true}
            autoStart={true}
            className="rounded-xl"
          />
        </div>

        {/* Instructions */}
        <div className="mt-6">{renderInstructions()}</div>

        {/* Status indicators */}
        <div className="mt-6 flex justify-center gap-8">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                cameraState === 'active' ? 'bg-green-500' : 'bg-white/30'
              }`}
            />
            <span className="text-sm text-white/70">Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                mediaPipeState === 'ready' ? 'bg-green-500' : mediaPipeState === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-white/70">Pose Detection</span>
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={onCancel}
              className="rounded-lg border border-white/20 px-6 py-2 text-white/70 transition-all hover:border-white/40 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
