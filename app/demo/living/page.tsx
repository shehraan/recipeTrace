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

        {showDebugStatus ? (
          <p className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {finalizeLivingRecipeStatus}
          </p>
        ) : null}
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
