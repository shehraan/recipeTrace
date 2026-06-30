"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { DemoContinueLink } from "@/src/components/demo/demo-continue-link";
import { useDemo } from "@/src/components/demo/demo-provider";
import { TranscriptSegmentsPanel } from "@/src/components/demo/transcript-segments-panel";
import { seededDemo } from "@/src/lib/demo/seeded-demo";

export default function TranscriptPage() {
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
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">
          {seededDemo.capture.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Review the numbered transcript segments captured from the family memory. Each segment has a
          stable ID used for provenance links later.
        </p>
      </div>

      <TranscriptSegmentsPanel segments={seededDemo.transcriptSegments} />

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
              Live extraction
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">
              Paste your own cooking memory
            </h2>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200 ring-inset">
            No audio yet
          </span>
        </div>

        <textarea
          value={memoryText}
          onChange={(event) => setMemoryText(event.target.value)}
          rows={8}
          className="mt-4 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-900 shadow-inner outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-200"
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

      <DemoContinueLink
        href="/demo/draft"
        label="Continue to recipe draft"
        description="See how these segments become structured steps."
      />
    </div>
  );
}
