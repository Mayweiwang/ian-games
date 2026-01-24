/**
 * Game constants for the motion dance game
 */

// Scoring constants
export const SCORING = {
  PERFECT_POINTS: 100,
  GOOD_POINTS: 50,
  MISS_POINTS: 0,
} as const;

// Combo multiplier thresholds
export const COMBO_MULTIPLIERS = [
  { threshold: 0, multiplier: 1 },   // 0-9 hits: 1x
  { threshold: 10, multiplier: 2 },  // 10-24 hits: 2x
  { threshold: 25, multiplier: 3 },  // 25-49 hits: 3x
  { threshold: 50, multiplier: 4 },  // 50+ hits: 4x
] as const;

// Hit zone boundaries (as percentage of screen height from top)
// Arrows spawn at 0 and move towards 1
// Hit zone is the bottom 15% of the screen (85% to 100%)
export const HIT_ZONE = {
  PERFECT_START: 0.95,  // Perfect zone: 95-100%
  PERFECT_END: 1.0,
  GOOD_START: 0.85,     // Good zone: 85-95%
  GOOD_END: 0.95,
} as const;

// Difficulty settings
export const DIFFICULTY_SETTINGS = {
  easy: {
    arrowTravelTime: 3000,    // 3 seconds to travel full screen
    spawnInterval: 2000,       // 1 arrow every 2 seconds
    label: 'Easy',
  },
  medium: {
    arrowTravelTime: 2000,    // 2 seconds to travel full screen
    spawnInterval: 1500,       // 1 arrow every 1.5 seconds
    label: 'Medium',
  },
  hard: {
    arrowTravelTime: 1500,    // 1.5 seconds to travel full screen
    spawnInterval: 1000,       // 1 arrow every 1 second
    label: 'Hard',
  },
} as const;

// Lane configuration
export const LANES = {
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2,
  COUNT: 3,
} as const;

// Gesture to lane mapping
export const GESTURE_TO_LANE: Record<string, number> = {
  'wave-left': LANES.LEFT,
  'jump': LANES.CENTER,
  'wave-right': LANES.RIGHT,
} as const;

// Lane to gesture mapping
export const LANE_TO_GESTURE: Record<number, string> = {
  [LANES.LEFT]: 'wave-left',
  [LANES.CENTER]: 'jump',
  [LANES.RIGHT]: 'wave-right',
} as const;

// Game timing constants
export const GAME_TIMING = {
  COUNTDOWN_DURATION: 3000,    // 3 second countdown before game starts
  TARGET_FPS: 60,              // Target frames per second
  FRAME_TIME: 1000 / 60,       // ~16.67ms per frame
} as const;

// Arrow patterns for spawning
// Each pattern is a sequence of lane indices with timing offsets
export const ARROW_PATTERNS = {
  // Single lane patterns
  singleLeft: [{ lane: 0 as const, delay: 0 }],
  singleCenter: [{ lane: 1 as const, delay: 0 }],
  singleRight: [{ lane: 2 as const, delay: 0 }],

  // Double patterns (two arrows close together)
  doubleLeftRight: [
    { lane: 0 as const, delay: 0 },
    { lane: 2 as const, delay: 200 },
  ],
  doubleCenterLeft: [
    { lane: 1 as const, delay: 0 },
    { lane: 0 as const, delay: 200 },
  ],
  doubleCenterRight: [
    { lane: 1 as const, delay: 0 },
    { lane: 2 as const, delay: 200 },
  ],

  // Triple patterns
  tripleSequence: [
    { lane: 0 as const, delay: 0 },
    { lane: 1 as const, delay: 300 },
    { lane: 2 as const, delay: 600 },
  ],
  tripleReverse: [
    { lane: 2 as const, delay: 0 },
    { lane: 1 as const, delay: 300 },
    { lane: 0 as const, delay: 600 },
  ],
} as const;

// Random pattern selection weights by difficulty
export const PATTERN_WEIGHTS = {
  easy: {
    single: 0.9,   // 90% single arrows
    double: 0.1,   // 10% double arrows
    triple: 0,     // no triples
  },
  medium: {
    single: 0.6,   // 60% single arrows
    double: 0.3,   // 30% double arrows
    triple: 0.1,   // 10% triples
  },
  hard: {
    single: 0.4,   // 40% single arrows
    double: 0.4,   // 40% double arrows
    triple: 0.2,   // 20% triples
  },
} as const;

/**
 * Get the combo multiplier for a given combo count
 */
export function getComboMultiplier(combo: number): number {
  let multiplier = 1;
  for (const tier of COMBO_MULTIPLIERS) {
    if (combo >= tier.threshold) {
      multiplier = tier.multiplier;
    }
  }
  return multiplier;
}

/**
 * Calculate score for a hit
 */
export function calculateHitScore(
  rating: 'perfect' | 'good',
  combo: number
): number {
  const basePoints = rating === 'perfect' ? SCORING.PERFECT_POINTS : SCORING.GOOD_POINTS;
  const multiplier = getComboMultiplier(combo);
  return basePoints * multiplier;
}

/**
 * Get hit rating based on arrow position
 */
export function getHitRating(position: number): 'perfect' | 'good' | 'miss' {
  if (position >= HIT_ZONE.PERFECT_START && position <= HIT_ZONE.PERFECT_END) {
    return 'perfect';
  }
  if (position >= HIT_ZONE.GOOD_START && position < HIT_ZONE.PERFECT_START) {
    return 'good';
  }
  return 'miss';
}

/**
 * Check if an arrow is in the hit zone (good or perfect)
 */
export function isInHitZone(position: number): boolean {
  return position >= HIT_ZONE.GOOD_START && position <= HIT_ZONE.PERFECT_END;
}

/**
 * Check if an arrow has passed the hit zone (missed)
 */
export function hasMissedHitZone(position: number): boolean {
  return position > HIT_ZONE.PERFECT_END;
}

/**
 * Select a random pattern based on difficulty weights
 */
export function selectRandomPattern(
  difficulty: 'easy' | 'medium' | 'hard'
): Array<{ lane: 0 | 1 | 2; delay: number }> {
  const weights = PATTERN_WEIGHTS[difficulty];
  const random = Math.random();

  let patternType: 'single' | 'double' | 'triple';
  if (random < weights.single) {
    patternType = 'single';
  } else if (random < weights.single + weights.double) {
    patternType = 'double';
  } else {
    patternType = 'triple';
  }

  // Select a random pattern of the chosen type
  const patterns = {
    single: [
      ARROW_PATTERNS.singleLeft,
      ARROW_PATTERNS.singleCenter,
      ARROW_PATTERNS.singleRight,
    ],
    double: [
      ARROW_PATTERNS.doubleLeftRight,
      ARROW_PATTERNS.doubleCenterLeft,
      ARROW_PATTERNS.doubleCenterRight,
    ],
    triple: [
      ARROW_PATTERNS.tripleSequence,
      ARROW_PATTERNS.tripleReverse,
    ],
  };

  const availablePatterns = patterns[patternType];
  const randomIndex = Math.floor(Math.random() * availablePatterns.length);

  // Return a mutable copy of the pattern
  return availablePatterns[randomIndex].map(p => ({ ...p }));
}
