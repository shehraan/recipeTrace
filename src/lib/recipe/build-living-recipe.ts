import type { FollowUpAnswer, LivingRecipe, RecipeDraft } from "./types";

export function buildLivingRecipeFromDraft(
  draft: RecipeDraft,
  answers: Record<string, FollowUpAnswer>,
  transcriptSegmentCount: number,
): LivingRecipe {
  const answeredQuestionIds = new Set(Object.keys(answers));

  const resolvedQuestions = draft.openQuestions
    .filter((question) => answeredQuestionIds.has(question.id))
    .map((question) => ({
      questionId: question.id,
      answer: answers[question.id].answer,
      appliedToStepIds: question.relatedStepIds,
      appliedToIngredientIds: question.relatedIngredientIds,
    }));

  const unresolvedQuestions = draft.openQuestions.filter(
    (question) => !answeredQuestionIds.has(question.id),
  );

  return {
    id: `living_${draft.id}`,
    captureId: draft.captureId,
    title: draft.dishName,
    summary:
      draft.summary ??
      "A living recipe built from transcript-backed steps with follow-up answers applied where available.",
    familyContext: draft.familyContext,
    ingredients: draft.ingredients,
    steps: draft.steps,
    sensoryCues: draft.sensoryCues,
    resolvedQuestions,
    unresolvedQuestions,
    sourceSummary: {
      transcriptSegmentCount,
      supportedStepCount: draft.steps.length,
      inferredStepCount: draft.steps.filter((step) => step.isInferred).length,
    },
    createdAt: new Date().toISOString(),
  };
}
