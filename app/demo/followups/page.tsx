"use client";

import { useRouter } from "next/navigation";

import { useDemo } from "@/src/components/demo/demo-provider";
import { FollowUpQuestionsPanel } from "@/src/components/demo/follow-up-questions-panel";

export default function FollowupsPage() {
  const {
    recipeDraft,
    followUpAnswers,
    setFollowUpAnswers,
    finalizeLivingRecipe,
    isFinalizingLivingRecipe,
    finalizeLivingRecipeError,
    finalizeLivingRecipeStatus,
  } = useDemo();
  const router = useRouter();
  const answeredCount = Object.keys(followUpAnswers).length;
  const showDebugStatus = process.env.NODE_ENV !== "production";

  const handleGenerateLivingRecipe = async () => {
    const generated = await finalizeLivingRecipe();

    if (generated) {
      router.push("/demo/living");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 3</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Follow-up questions</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Answer what you can from memory or follow-up with the cook. Unresolved questions stay
          visible in the final living recipe.
        </p>
      </div>

      <FollowUpQuestionsPanel
        questions={recipeDraft.openQuestions}
        answers={followUpAnswers}
        onAnswersChange={setFollowUpAnswers}
      />

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-stone-200 pt-6">
        <button
          type="button"
          onClick={handleGenerateLivingRecipe}
          disabled={isFinalizingLivingRecipe}
          className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isFinalizingLivingRecipe ? "Generating..." : "Generate living recipe"}
        </button>
        <p className="text-sm text-stone-500">
          {answeredCount > 0
            ? `${answeredCount} answer${answeredCount === 1 ? "" : "s"} will be included.`
            : "You can generate without answers — unresolved details stay explicit."}
        </p>
      </div>

      {finalizeLivingRecipeError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
          {finalizeLivingRecipeError}
        </p>
      ) : null}
      {showDebugStatus ? (
        <p className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
          {finalizeLivingRecipeStatus}
        </p>
      ) : null}
    </div>
  );
}
