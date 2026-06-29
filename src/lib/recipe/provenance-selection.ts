import type {
  FollowUpAnswer,
  LivingRecipe,
  OpenQuestion,
  RecipeDraft,
  RecipeStep,
} from "./types";

export type ProvenanceSelectionSource = "draft" | "living";

export type AppliedStepAnswer = {
  question: OpenQuestion;
  answer: string;
};

export type ProvenanceSelection = {
  step: RecipeStep | null;
  highlightedSegmentIds: string[];
  appliedAnswers: AppliedStepAnswer[];
  unresolvedForStep: OpenQuestion[];
};

export function resolveProvenanceStep(
  stepId: string | null,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
): RecipeStep | null {
  if (!stepId) {
    return null;
  }

  return (
    livingRecipe?.steps.find((step) => step.id === stepId) ??
    draft?.steps.find((step) => step.id === stepId) ??
    null
  );
}

export function getHighlightedSegmentIds(step: RecipeStep | null): string[] {
  if (!step) {
    return [];
  }

  return [...new Set(step.provenance.map((link) => link.transcriptSegmentId))];
}

export function buildProvenanceSelection(
  stepId: string | null,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
  followUpAnswers: Record<string, FollowUpAnswer>,
): ProvenanceSelection {
  const step = resolveProvenanceStep(stepId, draft, livingRecipe);

  if (!step || !stepId) {
    return {
      step: null,
      highlightedSegmentIds: [],
      appliedAnswers: [],
      unresolvedForStep: [],
    };
  }

  const appliedAnswers = getAppliedAnswersForStep(
    stepId,
    livingRecipe?.resolvedQuestions ?? buildResolvedFromAnswers(draft, followUpAnswers),
    draft?.openQuestions ?? [],
  );

  const unresolvedForStep = getUnresolvedForStep(
    stepId,
    livingRecipe?.unresolvedQuestions ??
      (draft?.openQuestions.filter((question) => !followUpAnswers[question.id]) ?? []),
  );

  return {
    step,
    highlightedSegmentIds: getHighlightedSegmentIds(step),
    appliedAnswers,
    unresolvedForStep,
  };
}

export function getAppliedAnswersForStep(
  stepId: string,
  resolvedQuestions: LivingRecipe["resolvedQuestions"],
  openQuestions: OpenQuestion[],
): AppliedStepAnswer[] {
  const questionsById = new Map(openQuestions.map((question) => [question.id, question]));

  return resolvedQuestions
    .filter((entry) => entry.appliedToStepIds?.includes(stepId))
    .flatMap((entry) => {
      const question = questionsById.get(entry.questionId);
      if (!question) {
        return [];
      }

      return [{ question, answer: entry.answer }];
    });
}

export function getUnresolvedForStep(
  stepId: string,
  unresolvedQuestions: OpenQuestion[],
): OpenQuestion[] {
  return unresolvedQuestions.filter((question) => question.relatedStepIds?.includes(stepId));
}

function buildResolvedFromAnswers(
  draft: RecipeDraft | null,
  followUpAnswers: Record<string, FollowUpAnswer>,
): LivingRecipe["resolvedQuestions"] {
  if (!draft) {
    return [];
  }

  return draft.openQuestions
    .filter((question) => followUpAnswers[question.id])
    .map((question) => ({
      questionId: question.id,
      answer: followUpAnswers[question.id].answer,
      appliedToStepIds: question.relatedStepIds,
      appliedToIngredientIds: question.relatedIngredientIds,
    }));
}

export function stepHasAppliedAnswers(
  stepId: string,
  resolvedQuestions: LivingRecipe["resolvedQuestions"],
): boolean {
  return resolvedQuestions.some((entry) => entry.appliedToStepIds?.includes(stepId));
}

export function stepHasUnresolvedDetails(
  stepId: string,
  unresolvedQuestions: OpenQuestion[],
): boolean {
  return unresolvedQuestions.some((question) => question.relatedStepIds?.includes(stepId));
}
