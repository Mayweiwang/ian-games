'use client';

import { useRouter } from 'next/navigation';
import { DanceGame } from '@/components/DanceGame';
import { SonicBackground } from '@/components/shared/SonicBackground';

/**
 * Dance Game Page - Full-screen game experience
 */
export default function DanceGamePage() {
  const router = useRouter();

  const handleBackToMenu = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <SonicBackground particleCount={40} />

      {/* Main game component */}
      <DanceGame
        initialDifficulty="easy"
        onBackToMenu={handleBackToMenu}
      />
    </div>
  );
}
