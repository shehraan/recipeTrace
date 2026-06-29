"use client";

import type { RecipeDraft } from "@/src/lib/recipe/types";

import { useDemo } from "./demo-provider";
import { TraceableStepList } from "./traceable-step-list";

type RecipeDraftPageCardProps = {
  draft: RecipeDraft;
};

export function RecipeDraftPageCard({ draft }: RecipeDraftPageCardProps) {
  const { selectedStepId, selectionSource, openEvidenceDrawer } = useDemo();
  const activeStepId = selectionSource === "draft" ? selectedStepId : null;

  return (
    <article className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Recipe draft
          </p>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">{draft.dishName}</h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80 ring-inset">
          Source-backed
        </span>
      </div>

      {draft.summary ? (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{draft.summary}</p>
      ) : null}

      {draft.familyContext ? (
        <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600">
          {draft.familyContext}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ingredients" value={draft.ingredients.length} />
        <Stat label="Steps" value={draft.steps.length} />
        <Stat label="Sensory cues" value={draft.sensoryCues.length} />
        <Stat label="Open questions" value={draft.openQuestions.length} />
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-stone-900">Steps</h3>
        <TraceableStepList
          steps={draft.steps}
          selectedStepId={activeStepId}
          onStepSelect={(stepId) => openEvidenceDrawer(stepId, "draft")}
          getStepMeta={(step) => ({
            showSourceBadge: true,
            showInferredBadge: step.isInferred,
          })}
        />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
