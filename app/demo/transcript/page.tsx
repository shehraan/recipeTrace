"use client";

import { DemoContinueLink } from "@/src/components/demo/demo-continue-link";
import { useDemo } from "@/src/components/demo/demo-provider";
import { TranscriptSegmentsPanel } from "@/src/components/demo/transcript-segments-panel";

export default function TranscriptPage() {
  const { capture, transcriptSegments } = useDemo();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 1</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{capture.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Review the numbered transcript segments captured from the family memory. Each segment has a
          stable ID used for provenance links later.
        </p>
      </div>

      <TranscriptSegmentsPanel segments={transcriptSegments} />

      <DemoContinueLink
        href="/demo/draft"
        label="Continue to recipe draft"
        description="See how these segments become structured steps."
      />
    </div>
  );
}
