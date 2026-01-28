'use client';

import { useRef, useCallback, useEffect } from 'react';

interface SoundEffects {
  perfect: HTMLAudioElement | null;
  good: HTMLAudioElement | null;
}

interface UseSoundEffectsReturn {
  /** Play perfect hit sound */
  playPerfect: () => void;
  /** Play good hit sound */
  playGood: () => void;
  /** Set volume for all sound effects (0-1) */
  setVolume: (volume: number) => void;
  /** Whether sounds are loaded and ready */
  isReady: boolean;
}

/**
 * Hook for playing game sound effects
 */
export function useSoundEffects(initialVolume: number = 0.5): UseSoundEffectsReturn {
  const soundsRef = useRef<SoundEffects>({
    perfect: null,
    good: null,
  });
  const volumeRef = useRef(initialVolume);
  const isReadyRef = useRef(false);

  // Initialize audio elements
  useEffect(() => {
    // Create audio elements
    const perfectSound = new Audio('/sounds/perfect.mp3');
    const goodSound = new Audio('/sounds/good.mp3');

    // Set initial volume
    perfectSound.volume = initialVolume;
    goodSound.volume = initialVolume;

    // Preload
    perfectSound.preload = 'auto';
    goodSound.preload = 'auto';

    soundsRef.current = {
      perfect: perfectSound,
      good: goodSound,
    };

    // Mark as ready when both are loaded
    let loadedCount = 0;
    const onCanPlay = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        isReadyRef.current = true;
      }
    };

    perfectSound.addEventListener('canplaythrough', onCanPlay);
    goodSound.addEventListener('canplaythrough', onCanPlay);

    // Trigger load
    perfectSound.load();
    goodSound.load();

    return () => {
      perfectSound.removeEventListener('canplaythrough', onCanPlay);
      goodSound.removeEventListener('canplaythrough', onCanPlay);
      soundsRef.current = { perfect: null, good: null };
    };
  }, [initialVolume]);

  const playPerfect = useCallback(() => {
    const sound = soundsRef.current.perfect;
    if (sound) {
      // Reset to start if already playing
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  const playGood = useCallback(() => {
    const sound = soundsRef.current.good;
    if (sound) {
      // Reset to start if already playing
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    volumeRef.current = clampedVolume;

    if (soundsRef.current.perfect) {
      soundsRef.current.perfect.volume = clampedVolume;
    }
    if (soundsRef.current.good) {
      soundsRef.current.good.volume = clampedVolume;
    }
  }, []);

  return {
    playPerfect,
    playGood,
    setVolume,
    isReady: isReadyRef.current,
  };
}
