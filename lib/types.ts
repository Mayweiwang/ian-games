// MediaPipe Pose Landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// Individual landmark with 3D coordinates and visibility
export interface Landmark {
  x: number; // 0-1 normalized coordinate (relative to image width)
  y: number; // 0-1 normalized coordinate (relative to image height)
  z: number; // Depth relative to hip midpoint
  visibility?: number; // Confidence score 0-1
}

// Full pose result with all 33 landmarks
export interface PoseResult {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[]; // 3D coordinates in meters
  timestamp: number;
}

// Baseline positions stored during calibration
export interface CalibrationData {
  leftHip: Landmark;
  rightHip: Landmark;
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  nose: Landmark;
  leftWrist: Landmark;
  rightWrist: Landmark;
  hipCenterY: number; // Average Y of both hips for jump detection
  shoulderCenterY: number; // Average Y of both shoulders
  timestamp: number;
}

// Camera state for WebcamFeed component
export type CameraState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'error';

// MediaPipe loading state
export type MediaPipeState =
  | 'loading'
  | 'ready'
  | 'error';

// Callback type for pose detection results
export type OnPoseCallback = (pose: PoseResult | null) => void;

// Calibration callback
export type OnCalibrationComplete = (data: CalibrationData) => void;

// Gesture detection types
export type GestureType = 'wave-left' | 'wave-right' | 'jump' | null;

export interface GestureEvent {
  type: Exclude<GestureType, null>;
  timestamp: number;
  confidence: number;
}

export interface GestureDetectionOptions {
  waveThreshold?: number;      // min Y movement for wave (default 0.05)
  waveTimeWindow?: number;     // ms window to detect wave (default 500)
  jumpThreshold?: number;      // min Y rise for jump (default 0.08)
  debounceTime?: number;       // ms between same gesture (default 500)
}

// Callback type for gesture events
export type OnGestureCallback = (gesture: GestureEvent) => void;

// ============================================
// Game Engine Types
// ============================================

// Arrow in the game
export interface Arrow {
  id: string;
  lane: 0 | 1 | 2;
  spawnTime: number;
  position: number;  // 0 = top of screen, 1 = bottom
  hit: boolean;
  missed: boolean;
  hitRating?: 'perfect' | 'good' | 'miss';
}

// Hit rating type
export type HitRating = 'perfect' | 'good' | 'miss';

// Game status
export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'ended';

// Difficulty level
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Full game state
export interface GameState {
  status: GameStatus;
  score: number;
  combo: number;
  maxCombo: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  arrows: Arrow[];
  difficulty: DifficultyLevel;
}

// Game statistics (for end game summary)
export interface GameStats {
  score: number;
  maxCombo: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  totalArrows: number;
  accuracy: number;  // percentage 0-100
  duration: number;  // game duration in ms
}

// Hit result from processing a gesture
export interface HitResult {
  hit: boolean;
  arrow?: Arrow;
  rating?: HitRating;
  score?: number;
}

// Game engine control functions
export interface GameControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  reset: () => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
}

// Skeleton connection pairs for drawing pose overlay
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_EYE_INNER],
  [POSE_LANDMARKS.LEFT_EYE_INNER, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.LEFT_EYE_OUTER],
  [POSE_LANDMARKS.LEFT_EYE_OUTER, POSE_LANDMARKS.LEFT_EAR],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE_INNER],
  [POSE_LANDMARKS.RIGHT_EYE_INNER, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EYE_OUTER],
  [POSE_LANDMARKS.RIGHT_EYE_OUTER, POSE_LANDMARKS.RIGHT_EAR],
  [POSE_LANDMARKS.MOUTH_LEFT, POSE_LANDMARKS.MOUTH_RIGHT],

  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_THUMB],
  [POSE_LANDMARKS.LEFT_PINKY, POSE_LANDMARKS.LEFT_INDEX],

  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_THUMB],
  [POSE_LANDMARKS.RIGHT_PINKY, POSE_LANDMARKS.RIGHT_INDEX],

  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],

  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
];
