import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-12 text-center">
        <h1 className="neon-text text-5xl font-bold tracking-tight sm:text-6xl">
          Ian&apos;s AI Games
        </h1>

        <p className="max-w-md text-lg text-white/70">
          Fun games powered by AI and motion detection!
        </p>

        <div className="grid gap-6 sm:grid-cols-1">
          <Link
            href="/dance-game"
            className="glass-card group flex flex-col items-center gap-4 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:border-sonic-speed/50"
          >
            <div className="text-6xl">
              <span role="img" aria-label="Dance">💃</span>
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Dance Game
            </h2>
            <p className="text-white/60">
              Wave your hands and jump to match the arrows!
            </p>
            <span className="mt-2 rounded-full bg-sonic-speed/20 px-4 py-1 text-sm text-sonic-speed">
              Coming Soon
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
