'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import type {
  Arrow,
  GameState,
  GameStats,
  DifficultyLevel,
  HitResult,
  GestureEvent,
} from '@/lib/types';
import {
  DIFFICULTY_SETTINGS,
  HIT_ZONE,
  GESTURE_TO_LANE,
  calculateHitScore,
  getHitRating,
  isInHitZone,
  hasMissedHitZone,
  selectRandomPattern,
  getComboMultiplier,
} from '@/lib/gameConstants';

// Initial game state
const createInitialGameState = (difficulty: DifficultyLevel): GameState => ({
  status: 'idle',
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectHits: 0,
  goodHits: 0,
  misses: 0,
  arrows: [],
  difficulty,
});

interface UseGameEngineOptions {
  /** Initial difficulty level */
  initialDifficulty?: DifficultyLevel;
  /** Callback when an arrow is hit */
  onHit?: (result: HitResult) => void;
  /** Callback when an arrow is missed */
  onMiss?: (arrow: Arrow) => void;
  /** Callback when combo changes */
  onComboChange?: (combo: number, multiplier: number) => void;
  /** Callback when game ends */
  onGameEnd?: (stats: GameStats) => void;
}

interface UseGameEngineReturn {
  /** Current game state */
  gameState: GameState;
  /** Start the game (with countdown) */
  start: () => void;
  /** Pause the game */
  pause: () => void;
  /** Resume the game */
  resume: () => void;
  /** End the game */
  end: () => void;
  /** Reset the game to initial state */
  reset: () => void;
  /** Set difficulty level */
  setDifficulty: (difficulty: DifficultyLevel) => void;
  /** Process a gesture event (call this when a gesture is detected) */
  processGesture: (gesture: GestureEvent) => HitResult;
  /** Get current combo multiplier */
  comboMultiplier: number;
  /** Countdown value (3, 2, 1, or null if not in countdown) */
  countdown: number | null;
  /** Game duration in milliseconds */
  gameDuration: number;
  /** Final game statistics (available after game ends) */
  finalStats: GameStats | null;
}

/**
 * Game engine hook for the motion dance game
 *
 * Manages:
 * - Arrow spawning based on difficulty patterns
 * - Game loop with requestAnimationFrame
 * - Hit detection and scoring
 * - Combo tracking
 * - Game statistics
 */
export function useGameEngine(
  options: UseGameEngineOptions = {}
): UseGameEngineReturn {
  const {
    initialDifficulty = 'easy',
    onHit,
    onMiss,
    onComboChange,
    onGameEnd,
  } = options;

  // Game state
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(initialDifficulty)
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameDuration, setGameDuration] = useState(0);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);

  // Refs for game loop (to avoid stale closures)
  const gameStateRef = useRef<GameState>(gameState);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const arrowIdCounterRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalArrowsSpawnedRef = useRef<number>(0);
  const gameLoopRef = useRef<(timestamp: number) => void>(() => {});

  // Callback refs
  const onHitRef = useRef(onHit);
  const onMissRef = useRef(onMiss);
  const onComboChangeRef = useRef(onComboChange);
  const onGameEndRef = useRef(onGameEnd);

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    onHitRef.current = onHit;
    onMissRef.current = onMiss;
    onComboChangeRef.current = onComboChange;
    onGameEndRef.current = onGameEnd;
  }, [onHit, onMiss, onComboChange, onGameEnd]);

  // Generate a unique arrow ID
  const generateArrowId = useCallback((): string => {
    arrowIdCounterRef.current += 1;
    return `arrow-${arrowIdCounterRef.current}-${Date.now()}`;
  }, []);

  // Spawn arrows based on pattern
  const spawnArrows = useCallback(
    (currentTime: number, difficulty: DifficultyLevel): Arrow[] => {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      const timeSinceLastSpawn = currentTime - lastSpawnTimeRef.current;

      if (timeSinceLastSpawn < settings.spawnInterval) {
        return [];
      }

      lastSpawnTimeRef.current = currentTime;

      // Select a random pattern
      const pattern = selectRandomPattern(difficulty);

      // Create arrows from the pattern
      const newArrows: Arrow[] = pattern.map((p) => ({
        id: generateArrowId(),
        lane: p.lane,
        spawnTime: currentTime + p.delay,
        position: 0,
        hit: false,
        missed: false,
      }));

      totalArrowsSpawnedRef.current += newArrows.length;

      return newArrows;
    },
    [generateArrowId]
  );

  // Update arrow positions based on elapsed time
  const updateArrowPositions = useCallback(
    (arrows: Arrow[], currentTime: number, difficulty: DifficultyLevel): Arrow[] => {
      const settings = DIFFICULTY_SETTINGS[difficulty];

      return arrows.map((arrow) => {
        if (arrow.hit || arrow.missed) {
          return arrow;
        }

        // Calculate position based on time since spawn
        const timeSinceSpawn = currentTime - arrow.spawnTime;
        const position = Math.max(0, timeSinceSpawn / settings.arrowTravelTime);

        return {
          ...arrow,
          position,
        };
      });
    },
    []
  );

  // Check for missed arrows (past hit zone without being hit)
  const checkMissedArrows = useCallback(
    (
      arrows: Arrow[]
    ): { updatedArrows: Arrow[]; missCount: number; missedArrows: Arrow[] } => {
      let missCount = 0;
      const missedArrows: Arrow[] = [];

      const updatedArrows = arrows.map((arrow) => {
        if (arrow.hit || arrow.missed) {
          return arrow;
        }

        if (hasMissedHitZone(arrow.position)) {
          missCount += 1;
          const missedArrow = {
            ...arrow,
            missed: true,
            hitRating: 'miss' as const,
          };
          missedArrows.push(missedArrow);
          return missedArrow;
        }

        return arrow;
      });

      return { updatedArrows, missCount, missedArrows };
    },
    []
  );

  // Clean up old arrows (remove arrows that are way past the screen)
  const cleanupArrows = useCallback((arrows: Arrow[]): Arrow[] => {
    // Keep arrows that are still visible or recently hit/missed
    return arrows.filter((arrow) => {
      // Remove arrows far past the bottom of the screen
      if (arrow.position > 1.5) {
        return false;
      }
      return true;
    });
  }, []);

  // Initialize game loop in useEffect to avoid self-reference issues
  useEffect(() => {
    gameLoopRef.current = (timestamp: number) => {
      const state = gameStateRef.current;

      if (state.status !== 'playing') {
        return;
      }

      // Update last frame time
      lastFrameTimeRef.current = timestamp;

      // Update game duration
      const currentGameDuration = timestamp - gameStartTimeRef.current;
      setGameDuration(currentGameDuration);

      // Spawn new arrows
      const newArrows = spawnArrows(timestamp, state.difficulty);

      // Update arrow positions
      let updatedArrows = updateArrowPositions(
        [...state.arrows, ...newArrows],
        timestamp,
        state.difficulty
      );

      // Check for missed arrows
      const { updatedArrows: arrowsAfterMiss, missCount, missedArrows } =
        checkMissedArrows(updatedArrows);
      updatedArrows = arrowsAfterMiss;

      // Notify about missed arrows
      if (missCount > 0) {
        for (const arrow of missedArrows) {
          onMissRef.current?.(arrow);
        }
      }

      // Clean up old arrows
      updatedArrows = cleanupArrows(updatedArrows);

      // Update state
      setGameState((prev) => {
        const newCombo = missCount > 0 ? 0 : prev.combo;
        const prevCombo = prev.combo;

        // Notify if combo changed
        if (newCombo !== prevCombo) {
          const newMultiplier = getComboMultiplier(newCombo);
          onComboChangeRef.current?.(newCombo, newMultiplier);
        }

        return {
          ...prev,
          arrows: updatedArrows,
          misses: prev.misses + missCount,
          combo: newCombo,
        };
      });

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(gameLoopRef.current);
    };
  }, [spawnArrows, updateArrowPositions, checkMissedArrows, cleanupArrows]);

  // Start game loop helper
  const startGameLoop = useCallback(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoopRef.current);
  }, []);

  // Start the game with countdown
  const start = useCallback(() => {
    // Reset state
    setGameState((prev) => ({
      ...createInitialGameState(prev.difficulty),
      status: 'countdown',
    }));
    setCountdown(3);
    setFinalStats(null);
    totalArrowsSpawnedRef.current = 0;
    arrowIdCounterRef.current = 0;

    // Start countdown
    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        // Countdown finished, start the game
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);

        const startTime = performance.now();
        gameStartTimeRef.current = startTime;
        lastSpawnTimeRef.current = startTime;
        lastFrameTimeRef.current = startTime;

        setGameState((prev) => ({
          ...prev,
          status: 'playing',
        }));

        // Start game loop
        startGameLoop();
      }
    }, 1000);
  }, [startGameLoop]);

  // Pause the game
  const pause = useCallback(() => {
    if (gameStateRef.current.status !== 'playing') {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setGameState((prev) => ({
      ...prev,
      status: 'paused',
    }));
  }, []);

  // Resume the game
  const resume = useCallback(() => {
    if (gameStateRef.current.status !== 'paused') {
      return;
    }

    lastFrameTimeRef.current = performance.now();

    setGameState((prev) => ({
      ...prev,
      status: 'playing',
    }));

    startGameLoop();
  }, [startGameLoop]);

  // End the game
  const end = useCallback(() => {
    // Stop game loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop countdown if running
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const state = gameStateRef.current;
    const totalHits = state.perfectHits + state.goodHits;
    const totalAttempts = totalHits + state.misses;

    // Calculate final stats
    const stats: GameStats = {
      score: state.score,
      maxCombo: state.maxCombo,
      perfectHits: state.perfectHits,
      goodHits: state.goodHits,
      misses: state.misses,
      totalArrows: totalArrowsSpawnedRef.current,
      accuracy: totalAttempts > 0 ? (totalHits / totalAttempts) * 100 : 0,
      duration: gameDuration,
    };

    setFinalStats(stats);
    setGameState((prev) => ({
      ...prev,
      status: 'ended',
    }));
    setCountdown(null);

    // Notify game end
    onGameEndRef.current?.(stats);
  }, [gameDuration]);

  // Reset the game
  const reset = useCallback(() => {
    // Stop everything
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setGameState((prev) => createInitialGameState(prev.difficulty));
    setCountdown(null);
    setGameDuration(0);
    setFinalStats(null);
    totalArrowsSpawnedRef.current = 0;
    arrowIdCounterRef.current = 0;
  }, []);

  // Set difficulty
  const setDifficulty = useCallback((difficulty: DifficultyLevel) => {
    setGameState((prev) => ({
      ...prev,
      difficulty,
    }));
  }, []);

  // Process a gesture event and check for hits
  const processGesture = useCallback((gesture: GestureEvent): HitResult => {
    const state = gameStateRef.current;

    if (state.status !== 'playing') {
      return { hit: false };
    }

    // Get the lane for this gesture
    const gestureLane = GESTURE_TO_LANE[gesture.type];
    if (gestureLane === undefined) {
      return { hit: false };
    }

    // Find arrows in the hit zone for this lane that haven't been hit yet
    const targetArrows = state.arrows
      .filter(
        (arrow) =>
          arrow.lane === gestureLane &&
          !arrow.hit &&
          !arrow.missed &&
          isInHitZone(arrow.position)
      )
      // Sort by position (closest to perfect zone first)
      .sort((a, b) => {
        const aDist = Math.abs(a.position - HIT_ZONE.PERFECT_START);
        const bDist = Math.abs(b.position - HIT_ZONE.PERFECT_START);
        return aDist - bDist;
      });

    if (targetArrows.length === 0) {
      return { hit: false };
    }

    // Hit the closest arrow
    const hitArrow = targetArrows[0];
    const rating = getHitRating(hitArrow.position);

    // This shouldn't happen since we filtered for hit zone, but handle it
    if (rating === 'miss') {
      return { hit: false };
    }

    // Calculate score
    const newCombo = state.combo + 1;
    const score = calculateHitScore(rating, newCombo);

    // Update state
    setGameState((prev) => {
      const updatedArrows = prev.arrows.map((arrow) =>
        arrow.id === hitArrow.id
          ? { ...arrow, hit: true, hitRating: rating }
          : arrow
      );

      const newMaxCombo = Math.max(prev.maxCombo, newCombo);

      // Notify about combo change
      const multiplier = getComboMultiplier(newCombo);
      onComboChangeRef.current?.(newCombo, multiplier);

      return {
        ...prev,
        arrows: updatedArrows,
        score: prev.score + score,
        combo: newCombo,
        maxCombo: newMaxCombo,
        perfectHits: rating === 'perfect' ? prev.perfectHits + 1 : prev.perfectHits,
        goodHits: rating === 'good' ? prev.goodHits + 1 : prev.goodHits,
      };
    });

    const result: HitResult = {
      hit: true,
      arrow: hitArrow,
      rating,
      score,
    };

    // Notify about hit
    onHitRef.current?.(result);

    return result;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Calculate current combo multiplier
  const comboMultiplier = getComboMultiplier(gameState.combo);

  return {
    gameState,
    start,
    pause,
    resume,
    end,
    reset,
    setDifficulty,
    processGesture,
    comboMultiplier,
    countdown,
    gameDuration,
    finalStats,
  };
}
