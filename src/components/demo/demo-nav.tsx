"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DEMO_STEPS = [
  { href: "/demo/transcript", label: "Transcript" },
  { href: "/demo/draft", label: "Draft" },
  { href: "/demo/followups", label: "Follow-ups" },
  { href: "/demo/living", label: "Living Recipe" },
] as const;

export function DemoNav() {
  const pathname = usePathname();
  const activeIndex = DEMO_STEPS.findIndex((step) => pathname === step.href);

  return (
    <nav aria-label="Demo progress" className="border-b border-amber-100/80 bg-white/90">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-3">
        {DEMO_STEPS.map((step, index) => {
          const isActive = pathname === step.href;
          const isComplete = activeIndex > index;

          return (
            <div key={step.href} className="flex items-center gap-2">
              {index > 0 ? (
                <span className="hidden text-stone-300 sm:inline" aria-hidden>
                  →
                </span>
              ) : null}
              <Link
                href={step.href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  isActive
                    ? "bg-amber-600 text-white shadow-sm"
                    : isComplete
                      ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200 ring-inset"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {step.label}
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function DemoHeader() {
  return (
    <header className="border-b border-amber-100/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-sm font-bold text-white shadow-sm"
          >
            RT
          </div>
          <span className="text-sm font-semibold tracking-tight text-stone-900">RecipeTrace</span>
        </Link>
        <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 sm:inline">
          Seeded demo · no API keys
        </span>
      </div>
    </header>
  );
}
