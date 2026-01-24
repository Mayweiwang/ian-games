'use client';

import { useEffect, useRef } from 'react';
import type { Arrow, HitRating } from '@/lib/types';
import { HIT_ZONE, LANES } from '@/lib/gameConstants';

interface HitFeedback {
  id: string;
  lane: number;
  rating: HitRating;
  timestamp: number;
}

interface GameCanvasProps {
  /** Current arrows to display */
  arrows: Arrow[];
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
  /** Recent hit feedback for visual effects */
  recentHits?: HitFeedback[];
  /** Additional CSS classes */
  className?: string;
}

// Lane colors matching the theme
const LANE_COLORS = {
  0: {
    // Left - Cyan (sonic-speed)
    arrow: '#00d9ff',
    glow: 'rgba(0, 217, 255, 0.8)',
    lane: 'rgba(0, 217, 255, 0.1)',
  },
  1: {
    // Center - Blue lightning (sonic-blue)
    arrow: '#0066d9',
    glow: 'rgba(0, 102, 217, 0.8)',
    lane: 'rgba(0, 84, 178, 0.1)',
  },
  2: {
    // Right - Gold (sonic-accent)
    arrow: '#ffd700',
    glow: 'rgba(255, 215, 0, 0.8)',
    lane: 'rgba(255, 215, 0, 0.1)',
  },
} as const;

// Arrow shape definitions
const ARROW_SIZE = 40;

/**
 * Draw an arrow shape pointing up
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  glowColor: string,
  size: number = ARROW_SIZE,
  alpha: number = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw glow effect
  ctx.shadowBlur = 20;
  ctx.shadowColor = glowColor;

  ctx.fillStyle = color;
  ctx.beginPath();

  // Arrow pointing up
  const halfSize = size / 2;
  const tipY = y - halfSize;
  const baseY = y + halfSize * 0.6;
  const stemBottom = y + halfSize;
  const stemWidth = size * 0.25;

  // Draw arrow shape
  ctx.moveTo(x, tipY);                    // Top point
  ctx.lineTo(x + halfSize, baseY);        // Right wing
  ctx.lineTo(x + stemWidth, baseY);       // Right stem top
  ctx.lineTo(x + stemWidth, stemBottom);  // Right stem bottom
  ctx.lineTo(x - stemWidth, stemBottom);  // Left stem bottom
  ctx.lineTo(x - stemWidth, baseY);       // Left stem top
  ctx.lineTo(x - halfSize, baseY);        // Left wing
  ctx.closePath();

  ctx.fill();

  // Draw outline for extra definition
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a lightning bolt for jump arrows
 */
function drawLightning(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  glowColor: string,
  size: number = ARROW_SIZE,
  alpha: number = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw glow effect
  ctx.shadowBlur = 25;
  ctx.shadowColor = glowColor;

  ctx.fillStyle = color;
  ctx.beginPath();

  const halfSize = size / 2;

  // Lightning bolt shape
  ctx.moveTo(x - halfSize * 0.3, y - halfSize);     // Top left
  ctx.lineTo(x + halfSize * 0.5, y - halfSize);     // Top right
  ctx.lineTo(x + halfSize * 0.1, y - halfSize * 0.1);  // Middle right notch
  ctx.lineTo(x + halfSize * 0.6, y - halfSize * 0.1);  // Middle right extension
  ctx.lineTo(x - halfSize * 0.2, y + halfSize);     // Bottom point
  ctx.lineTo(x, y);                                  // Middle
  ctx.lineTo(x - halfSize * 0.4, y);                 // Middle left notch
  ctx.closePath();

  ctx.fill();

  // Add white inner glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw hit explosion effect
 */
function drawHitExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  rating: HitRating
) {
  const colors = {
    perfect: '#00d9ff',
    good: '#ffd700',
    miss: '#ff4444',
  };

  const color = colors[rating];
  const maxRadius = rating === 'perfect' ? 60 : 40;
  const radius = maxRadius * progress;
  const alpha = 1 - progress;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.stroke();

  // Inner glow
  if (rating === 'perfect') {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * GameCanvas - Renders the arrow lanes and hit zone visualization
 */
export function GameCanvas({
  arrows,
  width = 400,
  height = 600,
  recentHits = [],
  className = '',
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Store latest props in refs to avoid stale closures in animation loop
  const arrowsRef = useRef(arrows);
  const recentHitsRef = useRef(recentHits);

  // Keep refs up to date
  useEffect(() => {
    arrowsRef.current = arrows;
  }, [arrows]);

  useEffect(() => {
    recentHitsRef.current = recentHits;
  }, [recentHits]);

  // Animation loop using refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const currentArrows = arrowsRef.current;
      const currentHits = recentHitsRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate lane dimensions
      const laneWidth = width / LANES.COUNT;
      const hitZoneY = height * HIT_ZONE.GOOD_START;
      const perfectZoneY = height * HIT_ZONE.PERFECT_START;

      // Draw lane backgrounds
      for (let i = 0; i < LANES.COUNT; i++) {
        const laneX = i * laneWidth;
        const colors = LANE_COLORS[i as keyof typeof LANE_COLORS];

        // Lane background gradient
        const gradient = ctx.createLinearGradient(laneX, 0, laneX + laneWidth, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, colors.lane);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(laneX, 0, laneWidth, height);

        // Lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, height);
        ctx.stroke();
      }

      // Draw hit zone indicator (good zone)
      const hitZoneGradient = ctx.createLinearGradient(0, hitZoneY, 0, height);
      hitZoneGradient.addColorStop(0, 'rgba(0, 217, 255, 0)');
      hitZoneGradient.addColorStop(0.3, 'rgba(0, 217, 255, 0.1)');
      hitZoneGradient.addColorStop(1, 'rgba(0, 217, 255, 0.2)');

      ctx.fillStyle = hitZoneGradient;
      ctx.fillRect(0, hitZoneY, width, height - hitZoneY);

      // Draw perfect zone highlight
      const perfectZoneGradient = ctx.createLinearGradient(0, perfectZoneY, 0, height);
      perfectZoneGradient.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
      perfectZoneGradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');

      ctx.fillStyle = perfectZoneGradient;
      ctx.fillRect(0, perfectZoneY, width, height - perfectZoneY);

      // Draw hit zone line
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 217, 255, 0.8)';
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hitZoneY);
      ctx.lineTo(width, hitZoneY);
      ctx.stroke();

      // Draw perfect zone line
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, perfectZoneY);
      ctx.lineTo(width, perfectZoneY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw target indicators at hit zone
      for (let i = 0; i < LANES.COUNT; i++) {
        const centerX = (i + 0.5) * laneWidth;
        const colors = LANE_COLORS[i as keyof typeof LANE_COLORS];

        // Draw target circle
        ctx.beginPath();
        ctx.arc(centerX, perfectZoneY + (height - perfectZoneY) / 2, ARROW_SIZE * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = colors.arrow;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw arrows
      for (const arrow of currentArrows) {
        if (arrow.hit || arrow.missed) {
          // Show faded arrow for missed
          if (arrow.missed && arrow.position <= 1.2) {
            const arrowLaneX = (arrow.lane + 0.5) * laneWidth;
            const arrowY = arrow.position * height;

            // Draw faded red arrow
            if (arrow.lane === 1) {
              drawLightning(ctx, arrowLaneX, arrowY, '#ff4444', 'rgba(255, 68, 68, 0.5)', ARROW_SIZE, 0.3);
            } else {
              drawArrow(ctx, arrowLaneX, arrowY, '#ff4444', 'rgba(255, 68, 68, 0.5)', ARROW_SIZE, 0.3);
            }
          }
          continue;
        }

        const arrowLaneX = (arrow.lane + 0.5) * laneWidth;
        const arrowY = arrow.position * height;
        const colors = LANE_COLORS[arrow.lane as keyof typeof LANE_COLORS];

        // Draw arrow based on lane type
        if (arrow.lane === 1) {
          // Center lane uses lightning bolt for jump
          drawLightning(ctx, arrowLaneX, arrowY, colors.arrow, colors.glow, ARROW_SIZE);
        } else {
          // Left and right lanes use arrow shape
          drawArrow(ctx, arrowLaneX, arrowY, colors.arrow, colors.glow, ARROW_SIZE);
        }

        // Add approaching indicator when close to hit zone
        if (arrow.position >= HIT_ZONE.GOOD_START - 0.1 && arrow.position < HIT_ZONE.PERFECT_START) {
          ctx.beginPath();
          ctx.arc(arrowLaneX, perfectZoneY + (height - perfectZoneY) / 2, ARROW_SIZE * 0.8, 0, Math.PI * 2);
          ctx.strokeStyle = colors.arrow;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Draw hit explosions
      const now = Date.now();
      const activeHits = currentHits.filter(hit => now - hit.timestamp < 500);

      for (const hit of activeHits) {
        const progress = (now - hit.timestamp) / 500;
        const hitLaneX = (hit.lane + 0.5) * laneWidth;
        const hitY = perfectZoneY + (height - perfectZoneY) / 2;

        drawHitExplosion(ctx, hitLaneX, hitY, progress, hit.rating);
      }

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.9) 0%, rgba(13, 27, 42, 0.95) 100%)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
      }}
    />
  );
}
