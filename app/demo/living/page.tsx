"use client";

import { useDemo } from "@/src/components/demo/demo-provider";
import { LivingRecipePanel } from "@/src/components/demo/living-recipe-panel";

export default function LivingPage() {
  const { livingRecipe, questionsById, openEvidenceDrawer, selectedStepId, selectionSource } =
    useDemo();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 4</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Living recipe</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          The final recipe combines source-backed steps with your follow-up answers. Click any step
          to trace it in the evidence drawer.
        </p>
      </div>

      <LivingRecipePanel
        recipe={livingRecipe}
        questionsById={questionsById}
        selectedStepId={selectionSource === "living" ? selectedStepId : null}
        onStepSelect={(stepId) => openEvidenceDrawer(stepId, "living")}
      />
    </div>
  );
}
