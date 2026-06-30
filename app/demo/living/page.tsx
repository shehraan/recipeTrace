"use client";

import { useDemo } from "@/src/components/demo/demo-provider";
import { LivingRecipePanel } from "@/src/components/demo/living-recipe-panel";

export default function LivingPage() {
  const {
    livingRecipe,
    questionsById,
    openEvidenceDrawer,
    openIngredientEvidenceDrawer,
    selectedStepId,
    selectedIngredientId,
    selectionSource,
    finalizeLivingRecipe,
    isFinalizingLivingRecipe,
    finalizeLivingRecipeError,
    finalizeLivingRecipeStatus,
  } = useDemo();
  const showDebugStatus = process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 4</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900">Living recipe</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            The final recipe combines source-backed steps and ingredients with your follow-up
            answers. Click any step or ingredient to trace it in the evidence drawer.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={finalizeLivingRecipe}
            disabled={isFinalizingLivingRecipe}
            className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isFinalizingLivingRecipe ? "Generating..." : "Generate living recipe"}
          </button>
          {finalizeLivingRecipeError ? (
            <p className="max-w-sm text-sm leading-relaxed text-amber-800">
              {finalizeLivingRecipeError}
            </p>
          ) : null}
          {showDebugStatus ? (
            <p className="max-w-sm rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
              {finalizeLivingRecipeStatus}
            </p>
          ) : null}
        </div>
      </div>

      <LivingRecipePanel
        recipe={livingRecipe}
        questionsById={questionsById}
        selectedStepId={selectionSource === "living" ? selectedStepId : null}
        onStepSelect={(stepId) => openEvidenceDrawer(stepId, "living")}
        selectedIngredientId={selectionSource === "living" ? selectedIngredientId : null}
        onIngredientSelect={(ingredientId) => openIngredientEvidenceDrawer(ingredientId, "living")}
      />
    </div>
  );
}
