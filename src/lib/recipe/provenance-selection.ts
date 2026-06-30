import type {
  FollowUpAnswer,
  Ingredient,
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
  ingredient: Ingredient | null;
  highlightedSegmentIds: string[];
  appliedAnswers: AppliedStepAnswer[];
  unresolvedForStep: OpenQuestion[];
  unresolvedForIngredient: OpenQuestion[];
};

const emptyProvenanceSelection = (): ProvenanceSelection => ({
  step: null,
  ingredient: null,
  highlightedSegmentIds: [],
  appliedAnswers: [],
  unresolvedForStep: [],
  unresolvedForIngredient: [],
});

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

export function getHighlightedSegmentIdsForIngredient(ingredient: Ingredient | null): string[] {
  if (!ingredient) {
    return [];
  }

  return [...new Set(ingredient.provenance.map((link) => link.transcriptSegmentId))];
}

export function resolveProvenanceIngredient(
  ingredientId: string | null,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
): Ingredient | null {
  if (!ingredientId) {
    return null;
  }

  return (
    livingRecipe?.ingredients.find((ingredient) => ingredient.id === ingredientId) ??
    draft?.ingredients.find((ingredient) => ingredient.id === ingredientId) ??
    null
  );
}

export function buildProvenanceSelection(
  stepId: string | null,
  ingredientId: string | null,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
  followUpAnswers: Record<string, FollowUpAnswer>,
): ProvenanceSelection {
  if (ingredientId) {
    return buildIngredientProvenanceSelection(ingredientId, draft, livingRecipe, followUpAnswers);
  }

  if (stepId) {
    return buildStepProvenanceSelection(stepId, draft, livingRecipe, followUpAnswers);
  }

  return emptyProvenanceSelection();
}

function buildStepProvenanceSelection(
  stepId: string,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
  followUpAnswers: Record<string, FollowUpAnswer>,
): ProvenanceSelection {
  const step = resolveProvenanceStep(stepId, draft, livingRecipe);

  if (!step) {
    return emptyProvenanceSelection();
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
    ingredient: null,
    highlightedSegmentIds: getHighlightedSegmentIds(step),
    appliedAnswers,
    unresolvedForStep,
    unresolvedForIngredient: [],
  };
}

function buildIngredientProvenanceSelection(
  ingredientId: string,
  draft: RecipeDraft | null,
  livingRecipe: LivingRecipe | null,
  followUpAnswers: Record<string, FollowUpAnswer>,
): ProvenanceSelection {
  const ingredient = resolveProvenanceIngredient(ingredientId, draft, livingRecipe);

  if (!ingredient) {
    return emptyProvenanceSelection();
  }

  const openQuestions = draft?.openQuestions ?? [];
  const appliedAnswers = getAppliedAnswersForIngredient(
    ingredientId,
    livingRecipe?.resolvedQuestions ?? buildResolvedFromAnswers(draft, followUpAnswers),
    openQuestions,
  );

  const unresolvedForIngredient = getUnresolvedForIngredient(
    ingredientId,
    livingRecipe?.unresolvedQuestions ??
      (draft?.openQuestions.filter((question) => !followUpAnswers[question.id]) ?? []),
  );

  return {
    step: null,
    ingredient,
    highlightedSegmentIds: getHighlightedSegmentIdsForIngredient(ingredient),
    appliedAnswers,
    unresolvedForStep: [],
    unresolvedForIngredient,
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

function resolvedEntryAppliesToIngredient(
  entry: LivingRecipe["resolvedQuestions"][number],
  ingredientId: string,
  questionsById: Map<string, OpenQuestion>,
): boolean {
  if (entry.appliedToIngredientIds?.includes(ingredientId)) {
    return true;
  }

  const question = questionsById.get(entry.questionId);
  return question?.relatedIngredientIds?.includes(ingredientId) ?? false;
}

export function getAppliedAnswersForIngredient(
  ingredientId: string,
  resolvedQuestions: LivingRecipe["resolvedQuestions"],
  openQuestions: OpenQuestion[],
): AppliedStepAnswer[] {
  const questionsById = new Map(openQuestions.map((question) => [question.id, question]));

  return resolvedQuestions
    .filter((entry) => resolvedEntryAppliesToIngredient(entry, ingredientId, questionsById))
    .flatMap((entry) => {
      const question = questionsById.get(entry.questionId);
      if (!question) {
        return [];
      }

      return [{ question, answer: entry.answer }];
    });
}

export function getUnresolvedForIngredient(
  ingredientId: string,
  unresolvedQuestions: OpenQuestion[],
): OpenQuestion[] {
  return unresolvedQuestions.filter((question) =>
    question.relatedIngredientIds?.includes(ingredientId),
  );
}

export function ingredientHasAppliedAnswers(
  ingredientId: string,
  resolvedQuestions: LivingRecipe["resolvedQuestions"],
  openQuestions: OpenQuestion[],
): boolean {
  const questionsById = new Map(openQuestions.map((question) => [question.id, question]));

  return resolvedQuestions.some((entry) =>
    resolvedEntryAppliesToIngredient(entry, ingredientId, questionsById),
  );
}

export function ingredientHasUnresolvedDetails(
  ingredientId: string,
  unresolvedQuestions: OpenQuestion[],
): boolean {
  return unresolvedQuestions.some((question) =>
    question.relatedIngredientIds?.includes(ingredientId),
  );
}

export function ingredientHasSourceEvidence(ingredient: Ingredient): boolean {
  return ingredient.provenance.length > 0;
}

export function ingredientIsTraceable(
  ingredient: Ingredient,
  resolvedQuestions: LivingRecipe["resolvedQuestions"],
  unresolvedQuestions: OpenQuestion[],
  openQuestions: OpenQuestion[],
): boolean {
  return (
    ingredientHasSourceEvidence(ingredient) ||
    ingredientHasAppliedAnswers(ingredient.id, resolvedQuestions, openQuestions) ||
    ingredientHasUnresolvedDetails(ingredient.id, unresolvedQuestions)
  );
}

export function stripUserProvidedDisplaySuffix(value: string): string {
  return value.replace(/\s*\(user-provided\)\s*$/i, "").trim();
}
