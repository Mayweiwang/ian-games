import Link from "next/link";
import { SonicBackground } from "@/components/shared/SonicBackground";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
      {/* Animated background */}
      <SonicBackground particleCount={30} />

      <main className="relative z-10 flex flex-col items-center gap-12 text-center">
        <h1 className="neon-text text-5xl font-bold tracking-tight sm:text-6xl">
          Sean and Ian&apos;s AI Games
        </h1>

        <p className="max-w-md text-lg text-white/70">
          Fun games powered by AI and motion detection!
        </p>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Dance Game Card */}
          <Link
            href="/dance-game"
            className="glass-card group flex flex-col items-center gap-4 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:border-sonic-speed/50"
          >
            {/* Animated icon */}
            <div className="relative text-6xl">
              <span
                role="img"
                aria-label="Dance"
                className="inline-block transition-transform duration-300 group-hover:animate-bounce"
              >
                {"<^>"}
              </span>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 -z-10 rounded-full bg-sonic-speed/20 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <h2 className="text-2xl font-semibold text-white group-hover:text-sonic-speed transition-colors">
              Motion Dance
            </h2>

            <p className="text-white/60 text-sm max-w-xs">
              Use your camera to wave your hands and jump to hit the arrows!
              Test your reflexes with AI-powered motion detection.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <span className="rounded-full bg-sonic-speed/20 px-3 py-1 text-xs text-sonic-speed">
                Motion Control
              </span>
              <span className="rounded-full bg-sonic-accent/20 px-3 py-1 text-xs text-sonic-accent">
                AI Powered
              </span>
            </div>

            {/* Play button indicator */}
            <div className="mt-4 flex items-center gap-2 rounded-full bg-sonic-speed/10 px-6 py-2 text-sonic-speed transition-all group-hover:bg-sonic-speed/20">
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Play Now</span>
            </div>
          </Link>

          {/* Placeholder for future games */}
          <div className="glass-card flex flex-col items-center gap-4 rounded-2xl p-8 opacity-50">
            <div className="text-6xl text-white/30">?</div>
            <h2 className="text-2xl font-semibold text-white/50">
              More Coming Soon
            </h2>
            <p className="text-white/40 text-sm">
              New AI-powered games in development!
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-sm text-white/40">
          <p>Best experienced in Chrome with a webcam</p>
        </div>
      </main>
    </div>
  );
}
