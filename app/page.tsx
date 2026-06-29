import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50/80 via-stone-50 to-stone-50">
      <header className="border-b border-amber-100/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-sm font-bold text-white shadow-sm"
            >
              RT
            </div>
            <span className="text-sm font-semibold tracking-tight text-stone-900">RecipeTrace</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 px-6 py-16 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
          Family cooking memories
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          RecipeTrace
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">
          Turn messy spoken family cooking memories into structured, source-backed living recipes.
          Preserve sensory cues, vague measurements, and uncertainty instead of inventing false
          precision.
        </p>
        <p className="mt-6 text-sm leading-relaxed text-stone-600">
          Walk through a seeded family memory — Nani&apos;s Chicken Curry — from transcript to living
          recipe with provenance tracing at every step.
        </p>
        <Link
          href="/demo/transcript"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Start seeded demo
        </Link>
      </main>
    </div>
  );
}
