import {
  stripUserProvidedDisplaySuffix,
  type AppliedStepAnswer,
} from "@/src/lib/recipe/provenance-selection";
import type { Ingredient } from "@/src/lib/recipe/types";

import { StepBadge } from "./traceable-step-list";

export type TraceableIngredientMeta = {
  showSourceBadge?: boolean;
  showAnsweredBadge?: boolean;
  showUnresolvedBadge?: boolean;
  showInferredBadge?: boolean;
  appliedAnswers?: AppliedStepAnswer[];
  isTraceable?: boolean;
};

type TraceableIngredientListProps = {
  ingredients: Ingredient[];
  selectedIngredientId: string | null;
  onIngredientSelect?: (ingredientId: string) => void;
  hint?: string;
  getIngredientMeta?: (ingredient: Ingredient) => TraceableIngredientMeta;
};

export function TraceableIngredientList({
  ingredients,
  selectedIngredientId,
  onIngredientSelect,
  hint,
  getIngredientMeta,
}: TraceableIngredientListProps) {
  return (
    <div>
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
      <ul className={`space-y-2 ${hint ? "mt-3" : ""}`}>
        {ingredients.map((ingredient) => {
          const isSelected = selectedIngredientId === ingredient.id;
          const meta = getIngredientMeta?.(ingredient) ?? {};
          const {
            showSourceBadge = true,
            showAnsweredBadge = false,
            showUnresolvedBadge = false,
            showInferredBadge = ingredient.isInferred,
            appliedAnswers = [],
            isTraceable = false,
          } = meta;
          const display = formatIngredientDisplay(ingredient, showAnsweredBadge);
          const isClickable = Boolean(onIngredientSelect) && isTraceable;

          const rowContent = (
            <>
              <span>
                <span className="font-medium">{display.name}</span>
                {display.quantity ? (
                  <span className="text-stone-600"> — {display.quantity}</span>
                ) : null}
                {display.preparation ? (
                  <span className="text-stone-500"> ({display.preparation})</span>
                ) : null}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {showSourceBadge ? <StepBadge label="Source" tone="source" /> : null}
                {showInferredBadge ? <StepBadge label="Inferred" tone="inferred" /> : null}
                {showAnsweredBadge ? <StepBadge label="Your answer" tone="answered" /> : null}
                {showUnresolvedBadge ? <StepBadge label="Unresolved" tone="unresolved" /> : null}
              </div>
              {appliedAnswers.length > 0 ? (
                <div className="space-y-1">
                  {appliedAnswers.map(({ question, answer }) => (
                    <p
                      key={question.id}
                      className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-stone-600"
                    >
                      <span className="font-medium text-stone-800">{question.question}</span>
                      {" — "}
                      {answer}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          );

          if (!isClickable) {
            return (
              <li
                key={ingredient.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm text-stone-800"
              >
                {rowContent}
              </li>
            );
          }

          return (
            <li key={ingredient.id}>
              <button
                type="button"
                onClick={() => onIngredientSelect?.(ingredient.id)}
                aria-pressed={isSelected}
                className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left text-sm text-stone-800 transition ${
                  isSelected
                    ? "border-amber-300 bg-amber-50 text-stone-900 ring-1 ring-amber-200"
                    : "border-amber-100 bg-amber-50/30 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                {rowContent}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatIngredientDisplay(ingredient: Ingredient, stripUserProvided: boolean) {
  const maybeStrip = (value: string) =>
    stripUserProvided ? stripUserProvidedDisplaySuffix(value) : value;

  return {
    name: ingredient.name,
    quantity: ingredient.quantity ? maybeStrip(ingredient.quantity) : undefined,
    preparation: ingredient.preparation ? maybeStrip(ingredient.preparation) : undefined,
  };
}
