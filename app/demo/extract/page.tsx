"use client";

import Link from "next/link";
import { useState } from "react";

import { useRouter } from "next/navigation";

import { useDemo } from "@/src/components/demo/demo-provider";

export default function ExtractPage() {
  const {
    extractRecipeDraftFromMemory,
    isExtractingRecipeDraft,
    extractRecipeDraftError,
    extractRecipeDraftStatus,
    hasLiveRecipeDraft,
  } = useDemo();
  const router = useRouter();
  const [memoryText, setMemoryText] = useState("");

  const handleExtractRecipeDraft = async () => {
    const extracted = await extractRecipeDraftFromMemory(memoryText);

    if (extracted) {
      router.push("/demo/draft");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 1</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Paste your own cooking memory</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Paste a family cooking memory in your own words. RecipeTrace will extract a structured
          recipe draft while preserving vague measurements, sensory cues, and uncertainty.
        </p>
        <Link
          href="/demo/transcript"
          className="mt-3 inline-flex text-sm font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline"
        >
          Or explore the seeded Nani&apos;s Chicken Curry demo
        </Link>
      </div>

      <section className="rounded-2xl border-2 border-amber-400 bg-amber-50/60 p-6 shadow-md ring-4 ring-amber-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
              Live extraction
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">Your cooking memory</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-300 ring-inset">
            No audio yet
          </span>
        </div>

        <textarea
          value={memoryText}
          onChange={(event) => setMemoryText(event.target.value)}
          rows={10}
          autoFocus
          className="mt-4 w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 shadow-inner outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          placeholder="Example: I remember she warmed oil until it shimmered, added onions, waited for them to go soft and sweet, then stirred in the spices until the kitchen smelled toasted..."
        />

        {extractRecipeDraftError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
            {extractRecipeDraftError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-500">
            {hasLiveRecipeDraft ? "Live draft ready." : extractRecipeDraftStatus}
          </p>
          <button
            type="button"
            onClick={handleExtractRecipeDraft}
            disabled={isExtractingRecipeDraft}
            className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isExtractingRecipeDraft ? "Extracting..." : "Extract recipe draft"}
          </button>
        </div>
      </section>
    </div>
  );
}
