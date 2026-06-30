import type { AppliedStepAnswer } from "@/src/lib/recipe/provenance-selection";
import type { RecipeStep } from "@/src/lib/recipe/types";

export type TraceableStepMeta = {
  showSourceBadge?: boolean;
  showAnsweredBadge?: boolean;
  showUnresolvedBadge?: boolean;
  showInferredBadge?: boolean;
  appliedAnswers?: AppliedStepAnswer[];
};

type TraceableStepListProps = {
  steps: RecipeStep[];
  selectedStepId: string | null;
  onStepSelect: (stepId: string) => void;
  hint?: string;
  getStepMeta?: (step: RecipeStep) => TraceableStepMeta;
};

export function TraceableStepList({
  steps,
  selectedStepId,
  onStepSelect,
  hint = "Click a step to open source evidence.",
  getStepMeta,
}: TraceableStepListProps) {
  const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div>
      <p className="text-xs text-stone-500">{hint}</p>
      <ol className="mt-3 space-y-2">
        {sortedSteps.map((step) => {
          const isSelected = selectedStepId === step.id;
          const meta = getStepMeta?.(step) ?? {};
          const {
            showSourceBadge = true,
            showAnsweredBadge = false,
            showUnresolvedBadge = false,
            showInferredBadge = step.isInferred,
            appliedAnswers = [],
          } = meta;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (typeof onStepSelect === "function") {
                    onStepSelect(step.id);
                  }
                }}
                aria-pressed={isSelected}
                className={`flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left text-sm leading-relaxed transition ${
                  isSelected
                    ? "border-amber-300 bg-amber-50 text-stone-900 ring-1 ring-amber-200"
                    : "border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {step.orderIndex + 1}
                  </span>
                  <span className="flex-1">{step.instruction}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-9">
                  {showSourceBadge ? <StepBadge label="Source" tone="source" /> : null}
                  {showInferredBadge ? <StepBadge label="Inferred" tone="inferred" /> : null}
                  {showAnsweredBadge ? <StepBadge label="Your answer" tone="answered" /> : null}
                  {showUnresolvedBadge ? <StepBadge label="Unresolved" tone="unresolved" /> : null}
                </div>
                {appliedAnswers.length > 0 ? (
                  <div className="space-y-1 pl-9">
                    {appliedAnswers.map(({ question, answer }) => (
                      <p
                        key={question.id}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-stone-600"
                      >
                        <span className="font-medium text-stone-800">{question.question}</span>
                        {" - "}
                        {answer}
                      </p>
                    ))}
                  </div>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepBadge({
  label,
  tone,
}: {
  label: string;
  tone: "source" | "answered" | "inferred" | "unresolved";
}) {
  const styles = {
    source: "bg-amber-100 text-amber-900",
    answered: "bg-emerald-100 text-emerald-800",
    inferred: "bg-violet-100 text-violet-800",
    unresolved: "bg-stone-200 text-stone-700",
  } as const;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[tone]}`}>
      {label}
    </span>
  );
}
