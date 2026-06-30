"use client";

import Link from "next/link";

import { DemoContinueLink } from "@/src/components/demo/demo-continue-link";
import { TranscriptSegmentsPanel } from "@/src/components/demo/transcript-segments-panel";
import { seededDemo } from "@/src/lib/demo/seeded-demo";

export default function TranscriptPage() {
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
        <Link
          href="/demo/extract"
          className="mt-3 inline-flex text-sm font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline"
        >
          Or paste your own cooking memory instead
        </Link>
      </div>

      <TranscriptSegmentsPanel segments={seededDemo.transcriptSegments} />

      <DemoContinueLink
        href="/demo/draft"
        label="Continue to recipe draft"
        description="See how these segments become structured steps."
      />
    </div>
  );
}
