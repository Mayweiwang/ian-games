'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseBackgroundMusicOptions {
  /** Music file path */
  src: string;
  /** Initial volume (0-1) */
  volume?: number;
  /** Whether to loop the music */
  loop?: boolean;
  /** Auto-play when component mounts */
  autoPlay?: boolean;
}

interface UseBackgroundMusicReturn {
  /** Whether music is currently playing */
  isPlaying: boolean;
  /** Current volume (0-1) */
  volume: number;
  /** Start playing music */
  play: () => void;
  /** Pause music */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Whether audio is loaded and ready */
  isReady: boolean;
}

/**
 * Hook for playing background music
 */
export function useBackgroundMusic({
  src,
  volume: initialVolume = 0.5,
  loop = true,
  autoPlay = false,
}: UseBackgroundMusicOptions): UseBackgroundMusicReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [isReady, setIsReady] = useState(false);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = initialVolume;

    audio.addEventListener('canplaythrough', () => {
      setIsReady(true);
    });

    audio.addEventListener('ended', () => {
      if (!loop) {
        setIsPlaying(false);
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src, loop, initialVolume]);

  // Handle autoplay (needs user interaction first on most browsers)
  useEffect(() => {
    if (autoPlay && isReady && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked - will need user interaction
        console.log('Autoplay blocked - click to start music');
      });
    }
  }, [autoPlay, isReady]);

  const play = useCallback(() => {
    if (audioRef.current && isReady) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Play error:', err);
      });
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  return {
    isPlaying,
    volume,
    play,
    pause,
    toggle,
    setVolume,
    isReady,
  };
}
