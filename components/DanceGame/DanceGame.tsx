'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CalibrationScreen } from './CalibrationScreen';
import { PoseDetector } from './PoseDetector';
import { GameCanvas } from './GameCanvas';
import { ScoreDisplay, ScoreOverlay } from './ScoreDisplay';
import { GameOverModal } from './GameOverModal';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import { useGameEngine } from '@/hooks/useGameEngine';
import type {
  CalibrationData,
  PoseResult,
  DifficultyLevel,
  GestureEvent,
  HitRating,
} from '@/lib/types';

type GamePhase = 'calibration' | 'ready' | 'playing' | 'paused' | 'ended';

interface HitFeedback {
  id: string;
  lane: number;
  rating: HitRating;
  timestamp: number;
}

interface DanceGameProps {
  /** Initial difficulty level */
  initialDifficulty?: DifficultyLevel;
  /** Callback when returning to menu */
  onBackToMenu?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DanceGame - Main orchestrator component
 *
 * Manages game flow:
 * 1. Calibration phase
 * 2. Ready/difficulty selection phase
 * 3. Playing phase with gesture detection
 * 4. Game over with stats display
 */
export function DanceGame({
  initialDifficulty = 'easy',
  onBackToMenu,
  className = '',
}: DanceGameProps) {
  // Game phase state
  const [phase, setPhase] = useState<GamePhase>('calibration');
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [hitFeedback, setHitFeedback] = useState<HitFeedback[]>([]);

  // Refs for feedback tracking and gesture control
  const hitFeedbackIdRef = useRef(0);
  const gestureDisableRef = useRef<(() => void) | null>(null);

  // Game engine hook - use onGameEnd callback to handle phase transition
  const {
    gameState,
    start: startGame,
    end: endGame,
    reset: resetGame,
    setDifficulty: setGameDifficulty,
    processGesture,
    comboMultiplier,
    countdown,
    finalStats,
  } = useGameEngine({
    initialDifficulty: difficulty,
    onHit: (result) => {
      if (result.hit && result.arrow && result.rating) {
        // Add hit feedback for visual effect
        const feedback: HitFeedback = {
          id: `hit-${++hitFeedbackIdRef.current}`,
          lane: result.arrow.lane,
          rating: result.rating,
          timestamp: Date.now(),
        };
        setHitFeedback((prev) => [...prev, feedback]);

        // Clean up old feedback
        setTimeout(() => {
          setHitFeedback((prev) => prev.filter((f) => f.id !== feedback.id));
        }, 600);
      }
    },
    onMiss: (arrow) => {
      // Add miss feedback
      const feedback: HitFeedback = {
        id: `miss-${++hitFeedbackIdRef.current}`,
        lane: arrow.lane,
        rating: 'miss',
        timestamp: Date.now(),
      };
      setHitFeedback((prev) => [...prev, feedback]);

      // Clean up old feedback
      setTimeout(() => {
        setHitFeedback((prev) => prev.filter((f) => f.id !== feedback.id));
      }, 600);
    },
    onGameEnd: () => {
      // Handle game end via callback (not useEffect)
      setPhase('ended');
      gestureDisableRef.current?.();
    },
  });

  // Gesture detection hook
  const { processPose, currentGesture, enable: enableGestures, disable: disableGestures } =
    useGestureDetection(calibration, {
      onGesture: (gesture: GestureEvent) => {
        if (phase === 'playing' && gameState.status === 'playing') {
          processGesture(gesture);
        }
      },
      enabled: phase === 'playing',
    });

  // Store gesture disable function in ref (in effect, not during render)
  useEffect(() => {
    gestureDisableRef.current = disableGestures;
  }, [disableGestures]);

  // Process pose updates
  const handlePoseUpdate = useCallback(
    (pose: PoseResult | null) => {
      if (phase === 'playing') {
        processPose(pose);
      }
    },
    [phase, processPose]
  );

  // Handle calibration completion
  const handleCalibrationComplete = useCallback((data: CalibrationData) => {
    setCalibration(data);
    setPhase('ready');
  }, []);

  // Handle difficulty change
  const handleDifficultyChange = useCallback(
    (newDifficulty: DifficultyLevel) => {
      setDifficulty(newDifficulty);
      setGameDifficulty(newDifficulty);
    },
    [setGameDifficulty]
  );

  // Start the game
  const handleStartGame = useCallback(() => {
    setPhase('playing');
    enableGestures();
    startGame();
  }, [enableGestures, startGame]);

  // Handle play again
  const handlePlayAgain = useCallback(() => {
    resetGame();
    setPhase('ready');
    setHitFeedback([]);
  }, [resetGame]);

  // Handle back to menu
  const handleBackToMenu = useCallback(() => {
    resetGame();
    setPhase('calibration');
    setCalibration(null);
    setHitFeedback([]);
    onBackToMenu?.();
  }, [resetGame, onBackToMenu]);

  // Handle end game (manual)
  const handleEndGame = useCallback(() => {
    endGame();
  }, [endGame]);

  // Render calibration phase
  if (phase === 'calibration') {
    return (
      <CalibrationScreen
        onCalibrationComplete={handleCalibrationComplete}
        onCancel={onBackToMenu}
      />
    );
  }

  // Render ready/difficulty selection phase
  if (phase === 'ready') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center p-4 ${className}`}>
        <div className="w-full max-w-md">
          <h1 className="neon-text mb-8 text-center text-4xl font-bold">
            Ready to Dance?
          </h1>

          {/* Difficulty selection */}
          <div className="glass-card mb-8 rounded-2xl p-6">
            <h2 className="mb-4 text-center text-lg font-semibold text-white/80">
              Select Difficulty
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  className={`rounded-xl px-4 py-3 font-semibold transition-all ${
                    difficulty === level
                      ? level === 'easy'
                        ? 'bg-green-500/30 text-green-400 border-2 border-green-500'
                        : level === 'medium'
                        ? 'bg-yellow-500/30 text-yellow-400 border-2 border-yellow-500'
                        : 'bg-red-500/30 text-red-400 border-2 border-red-500'
                      : 'border border-white/20 text-white/70 hover:border-white/40'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="glass-card mb-8 rounded-2xl p-6">
            <h2 className="mb-4 text-center text-lg font-semibold text-white/80">
              How to Play
            </h2>
            <div className="space-y-3 text-sm text-white/60">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-sonic-speed">{"<--"}</span>
                <span>Wave LEFT hand for cyan arrows</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl text-sonic-blue">{"^"}</span>
                <span>JUMP for blue lightning bolts</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl text-sonic-accent">{"-->"}</span>
                <span>Wave RIGHT hand for gold arrows</span>
              </div>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartGame}
            className="w-full rounded-xl bg-sonic-speed px-8 py-4 text-xl font-bold text-background transition-all hover:bg-sonic-speed/80 hover:scale-105 active:scale-95"
          >
            Start Game
          </button>

          {/* Back button */}
          {onBackToMenu && (
            <button
              onClick={handleBackToMenu}
              className="mt-4 w-full rounded-xl border border-white/20 px-8 py-3 font-semibold text-white/70 transition-all hover:border-white/40 hover:text-white"
            >
              Back to Menu
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render playing/paused phase
  return (
    <div className={`flex min-h-screen flex-col ${className}`}>
      {/* Main game area */}
      <div className="flex flex-1 gap-4 p-4">
        {/* Left side: Camera feed */}
        <div className="flex-1">
          <div className="glass-card relative h-full overflow-hidden rounded-2xl p-2">
            <PoseDetector
              onPoseUpdate={handlePoseUpdate}
              showSkeleton={true}
              autoStart={true}
              className="h-full rounded-xl"
            />

            {/* Gesture indicator overlay */}
            {currentGesture && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform">
                <div className="glass-card rounded-lg px-4 py-2 text-lg font-bold text-sonic-speed">
                  {currentGesture === 'wave-left' && 'LEFT WAVE!'}
                  {currentGesture === 'wave-right' && 'RIGHT WAVE!'}
                  {currentGesture === 'jump' && 'JUMP!'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Game canvas */}
        <div className="flex flex-col items-center gap-4">
          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="neon-text text-9xl font-bold animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Score overlay */}
          <ScoreOverlay
            score={gameState.score}
            combo={gameState.combo}
            multiplier={comboMultiplier}
          />

          {/* Game canvas */}
          <GameCanvas
            arrows={gameState.arrows}
            width={320}
            height={480}
            recentHits={hitFeedback}
          />

          {/* Game controls */}
          <div className="flex gap-4">
            <button
              onClick={handleEndGame}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 transition-all hover:border-red-400/50 hover:text-red-400"
            >
              End Game
            </button>
          </div>
        </div>

        {/* Right side: Score display */}
        <div className="w-48">
          <ScoreDisplay
            score={gameState.score}
            combo={gameState.combo}
            multiplier={comboMultiplier}
            perfectHits={gameState.perfectHits}
            goodHits={gameState.goodHits}
            misses={gameState.misses}
            difficulty={gameState.difficulty}
          />
        </div>
      </div>

      {/* Game over modal */}
      {finalStats && (
        <GameOverModal
          stats={finalStats}
          isOpen={phase === 'ended'}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
