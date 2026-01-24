'use client';

import { useMemo } from 'react';
import type { DifficultyLevel } from '@/lib/types';
import { DIFFICULTY_SETTINGS } from '@/lib/gameConstants';

interface ScoreDisplayProps {
  /** Current score */
  score: number;
  /** Current combo count */
  combo: number;
  /** Current combo multiplier */
  multiplier: number;
  /** Number of perfect hits */
  perfectHits: number;
  /** Number of good hits */
  goodHits: number;
  /** Number of misses */
  misses: number;
  /** Current difficulty level */
  difficulty: DifficultyLevel;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ScoreDisplay - Shows score, combo, and hit statistics with neon effects
 *
 * Uses CSS animations instead of React state for visual feedback
 */
export function ScoreDisplay({
  score,
  combo,
  multiplier,
  perfectHits,
  goodHits,
  misses,
  difficulty,
  className = '',
}: ScoreDisplayProps) {
  const difficultyLabel = DIFFICULTY_SETTINGS[difficulty].label;
  const difficultyColors = useMemo(() => ({
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  }), []);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Score display */}
      <div className="glass-card rounded-xl p-4">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wider text-white/50 mb-1">
            Score
          </div>
          <div
            key={score} // Key change triggers CSS animation
            className="neon-text text-4xl font-bold tabular-nums animate-score-pop"
          >
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Combo display */}
      {combo > 0 && (
        <div className="glass-card rounded-xl p-3 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
                Combo
              </div>
              <div
                key={combo} // Key change triggers CSS animation
                className="text-3xl font-bold text-sonic-speed animate-combo-pop"
              >
                {combo}
              </div>
            </div>
            {multiplier > 1 && (
              <div
                className={`rounded-lg px-3 py-1 font-bold transition-all duration-200 ${
                  multiplier === 4
                    ? 'bg-sonic-accent/30 text-sonic-accent animate-pulse'
                    : multiplier === 3
                    ? 'bg-purple-500/30 text-purple-400'
                    : 'bg-sonic-speed/30 text-sonic-speed'
                }`}
              >
                {multiplier}x
              </div>
            )}
          </div>

          {/* Combo progress bar */}
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sonic-speed to-sonic-accent transition-all duration-200"
              style={{
                width: `${Math.min((combo % 10) * 10 + 10, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Hit statistics */}
      <div className="glass-card rounded-xl p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-white/50 mb-1">Perfect</div>
            <div className="text-lg font-semibold text-sonic-speed">
              {perfectHits}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Good</div>
            <div className="text-lg font-semibold text-sonic-accent">
              {goodHits}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Miss</div>
            <div className="text-lg font-semibold text-red-400">
              {misses}
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty indicator */}
      <div
        className={`rounded-lg border px-3 py-2 text-center text-sm font-medium ${difficultyColors[difficulty]}`}
      >
        {difficultyLabel}
      </div>

      {/* CSS keyframes for animations */}
      <style jsx>{`
        @keyframes score-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes combo-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .animate-score-pop {
          animation: score-pop 0.15s ease-out;
        }
        .animate-combo-pop {
          animation: combo-pop 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Compact score display for overlay on game canvas
 */
export function ScoreOverlay({
  score,
  combo,
  multiplier,
  className = '',
}: Pick<ScoreDisplayProps, 'score' | 'combo' | 'multiplier' | 'className'>) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Score */}
      <div className="glass-card rounded-lg px-4 py-2">
        <span className="neon-text text-2xl font-bold tabular-nums">
          {score.toLocaleString()}
        </span>
      </div>

      {/* Combo */}
      {combo > 0 && (
        <div className="glass-card rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-xl font-bold text-sonic-speed">{combo}</span>
          {multiplier > 1 && (
            <span className="text-sm font-bold text-sonic-accent">{multiplier}x</span>
          )}
        </div>
      )}
    </div>
  );
}
