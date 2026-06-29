import type { RecipeDraft } from "@/src/lib/recipe/types";

type RecipeDraftPreviewCardProps = {
  draft: RecipeDraft;
  selectedStepId: string | null;
  onStepSelect: (stepId: string) => void;
};

export function RecipeDraftPreviewCard({
  draft,
  selectedStepId,
  onStepSelect,
}: RecipeDraftPreviewCardProps) {
  const sortedSteps = [...draft.steps].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <article className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Recipe draft preview
          </p>
          <h3 className="mt-1 text-xl font-semibold text-stone-900">{draft.dishName}</h3>
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
        <h4 className="text-sm font-medium text-stone-900">Steps</h4>
        <p className="mt-1 text-xs text-stone-500">Click a step to trace it back to the transcript.</p>
        <ol className="mt-3 space-y-2">
          {sortedSteps.map((step) => {
            const isSelected = selectedStepId === step.id;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onStepSelect(step.id)}
                  aria-pressed={isSelected}
                  className={`flex w-full gap-3 rounded-xl border px-3 py-3 text-left text-sm leading-relaxed transition ${
                    isSelected
                      ? "border-amber-300 bg-amber-50 text-stone-900 ring-1 ring-amber-200"
                      : "border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected
                        ? "bg-amber-600 text-white"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {step.orderIndex + 1}
                  </span>
                  <span>{step.instruction}</span>
                </button>
              </li>
            );
          })}
        </ol>
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
