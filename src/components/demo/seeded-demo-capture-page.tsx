"use client";

import { useEffect, useRef, useState } from "react";

import type { Capture, RecipeDraft, TranscriptSegment } from "@/src/lib/recipe/types";

import { FollowUpQuestionsPanel } from "./follow-up-questions-panel";
import { ProvenanceEvidencePanel } from "./provenance-evidence-panel";
import { RecipeDraftPreviewCard } from "./recipe-draft-preview-card";
import { TranscriptSegmentsPanel } from "./transcript-segments-panel";

type SeededDemoCapturePageProps = {
  capture: Capture;
  transcriptSegments: TranscriptSegment[];
  recipeDraft: RecipeDraft | null;
};

export function SeededDemoCapturePage({
  capture,
  transcriptSegments,
  recipeDraft,
}: SeededDemoCapturePageProps) {
  const [hasStartedDemo, setHasStartedDemo] = useState(false);
  const [isWorkspaceHighlighted, setIsWorkspaceHighlighted] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const segmentsById = new Map(transcriptSegments.map((segment) => [segment.id, segment]));
  const selectedStep =
    recipeDraft?.steps.find((step) => step.id === selectedStepId) ?? null;
  const highlightedSegmentIds = selectedStep
    ? [...new Set(selectedStep.provenance.map((link) => link.transcriptSegmentId))]
    : [];

  useEffect(() => {
    if (!hasStartedDemo) {
      return;
    }

    setIsWorkspaceHighlighted(true);

    const scrollTimer = window.setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      workspaceRef.current?.focus({ preventScroll: true });
    }, 80);

    const highlightTimer = window.setTimeout(() => {
      setIsWorkspaceHighlighted(false);
    }, 2200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [hasStartedDemo]);

  const handleStartDemo = () => {
    setHasStartedDemo(true);
  };

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
          <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 sm:inline">
            Seeded demo · no API keys
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <section className="max-w-2xl">
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

          {!hasStartedDemo ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm leading-relaxed text-stone-600">
                Start with a ready-made family memory —{" "}
                <span className="font-medium text-stone-800">{capture.title}</span> — to see how
                transcript segments become a source-backed recipe draft.
              </p>
              <button
                type="button"
                onClick={handleStartDemo}
                className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                Start with seeded demo
              </button>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                Demo workspace active
              </span>
              <p className="text-sm text-stone-600">
                Review the transcript and recipe draft preview below.
              </p>
            </div>
          )}
        </section>

        {hasStartedDemo ? (
          <section
            ref={workspaceRef}
            id="seeded-demo"
            tabIndex={-1}
            aria-label="Seeded demo workspace"
            className={`mt-16 scroll-mt-24 space-y-8 rounded-3xl p-4 outline-none transition-all duration-500 sm:p-6 ${
              isWorkspaceHighlighted
                ? "bg-amber-50/70 ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-50 shadow-md"
                : "bg-transparent"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">{capture.title}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Transcript segments and recipe draft preview are ready to explore.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                Demo active
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <TranscriptSegmentsPanel
                segments={transcriptSegments}
                highlightedSegmentIds={highlightedSegmentIds}
              />
              {recipeDraft ? (
                <RecipeDraftPreviewCard
                  draft={recipeDraft}
                  selectedStepId={selectedStepId}
                  onStepSelect={setSelectedStepId}
                />
              ) : (
                <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6">
                  <h3 className="text-lg font-semibold text-stone-900">Recipe draft</h3>
                  <p className="mt-2 text-sm text-stone-500">
                    No recipe draft is available for this capture yet.
                  </p>
                </section>
              )}
            </div>

            <ProvenanceEvidencePanel step={selectedStep} segmentsById={segmentsById} />

            {recipeDraft ? (
              <FollowUpQuestionsPanel questions={recipeDraft.openQuestions} />
            ) : null}

            <p className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
              Next up: record audio, transcribe, and extract a draft from your own memory. For now,
              this page uses the seeded fixture only.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
