'use client';

import { useMemo } from 'react';
import type { GameStats } from '@/lib/types';

interface GameOverModalProps {
  /** Game statistics to display */
  stats: GameStats;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when "Play Again" is clicked */
  onPlayAgain: () => void;
  /** Callback when "Back to Menu" is clicked */
  onBackToMenu: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format milliseconds to mm:ss
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get rating message based on accuracy
 */
function getRatingMessage(accuracy: number): { message: string; color: string } {
  if (accuracy >= 95) return { message: 'PERFECT!', color: 'text-sonic-accent' };
  if (accuracy >= 85) return { message: 'AMAZING!', color: 'text-sonic-speed' };
  if (accuracy >= 70) return { message: 'GREAT!', color: 'text-green-400' };
  if (accuracy >= 50) return { message: 'GOOD!', color: 'text-yellow-400' };
  return { message: 'KEEP TRYING!', color: 'text-white/70' };
}

/**
 * GameOverModal - End game statistics modal with glass-card styling
 *
 * Uses CSS animations for entrance effects instead of React state
 */
export function GameOverModal({
  stats,
  isOpen,
  onPlayAgain,
  onBackToMenu,
  className = '',
}: GameOverModalProps) {
  const totalHits = stats.perfectHits + stats.goodHits;
  const rating = useMemo(() => getRatingMessage(stats.accuracy), [stats.accuracy]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
    >
      {/* Backdrop with CSS animation */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onBackToMenu}
      />

      {/* Modal with CSS animation */}
      <div className="glass-card relative w-full max-w-md rounded-2xl p-6 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
          <div className={`text-4xl font-bold ${rating.color} neon-text`}>
            {rating.message}
          </div>
        </div>

        {/* Score */}
        <div
          className="text-center mb-6 animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <div className="text-sm uppercase tracking-wider text-white/50 mb-1">
            Final Score
          </div>
          <div className="neon-text text-5xl font-bold tabular-nums">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          {/* Max Combo */}
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Max Combo
            </div>
            <div className="text-2xl font-bold text-sonic-speed">
              {stats.maxCombo}
            </div>
          </div>

          {/* Accuracy */}
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Accuracy
            </div>
            <div className="text-2xl font-bold text-sonic-accent">
              {stats.accuracy.toFixed(1)}%
            </div>
          </div>

          {/* Duration */}
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Duration
            </div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(stats.duration)}
            </div>
          </div>

          {/* Total Hits */}
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              Total Hits
            </div>
            <div className="text-2xl font-bold text-white">
              {totalHits}/{stats.totalArrows}
            </div>
          </div>
        </div>

        {/* Hit breakdown */}
        <div
          className="flex justify-center gap-6 mb-8 animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-sonic-speed">
              {stats.perfectHits}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Perfect
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-sonic-accent">
              {stats.goodHits}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Good
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats.misses}
            </div>
            <div className="text-xs uppercase tracking-wider text-white/50">
              Miss
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex gap-4 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-xl bg-sonic-speed px-6 py-3 font-semibold text-background transition-all hover:bg-sonic-speed/80 hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={onBackToMenu}
            className="flex-1 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white/70 transition-all hover:border-white/40 hover:text-white hover:scale-105 active:scale-95"
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* CSS keyframes for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(2rem) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
