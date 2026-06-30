import {
  livingRecipeSchema,
  recipeDraftSchema,
  validateRecipeDraftAgainstTranscript,
} from "../src/lib/recipe/schemas";
import type {
  FollowUpAnswer,
  LivingRecipe,
  RecipeDraft,
  RecipeStep,
  TranscriptSegment,
} from "../src/lib/recipe/types";
import type { EvalFixture } from "./fixtures";

export type CheckResult = {
  name: string;
  passed: boolean;
  reasons: string[];
};

export type PhaseResult = {
  phase: "extraction" | "finalization";
  fixtureId: string;
  fixtureName: string;
  checks: CheckResult[];
};

export function evaluateExtraction(
  fixture: EvalFixture,
  draft: unknown,
): PhaseResult {
  const parsedDraft = recipeDraftSchema.safeParse(draft);
  const typedDraft = parsedDraft.success ? parsedDraft.data : undefined;

  const checks: CheckResult[] = [
    makeCheck(
      "passes RecipeDraft schema",
      parsedDraft.success,
      parsedDraft.success ? [] : parsedDraft.error.issues.map(formatIssue),
    ),
  ];

  if (!typedDraft) {
    return phaseResult(fixture, "extraction", checks);
  }

  const provenanceErrors = validateRecipeDraftAgainstTranscript(
    typedDraft,
    fixture.transcriptSegments,
  );

  checks.push(
    makeCheck("has dish name", typedDraft.dishName.trim().length > 0, [
      "dishName is empty.",
    ]),
    makeCheck(
      `extracts at least ${fixture.expectations.minSteps} steps`,
      typedDraft.steps.length >= fixture.expectations.minSteps,
      [`Expected ${fixture.expectations.minSteps}+ steps, received ${typedDraft.steps.length}.`],
    ),
    makeCheck(
      `produces at least ${fixture.expectations.minIngredients} ingredients`,
      typedDraft.ingredients.length >= fixture.expectations.minIngredients,
      [
        `Expected ${fixture.expectations.minIngredients}+ ingredients, received ${typedDraft.ingredients.length}.`,
      ],
    ),
    makeCheck(
      `produces at least ${fixture.expectations.minSensoryCues} sensory cues`,
      typedDraft.sensoryCues.length >= fixture.expectations.minSensoryCues,
      [
        `Expected ${fixture.expectations.minSensoryCues}+ sensory cues, received ${typedDraft.sensoryCues.length}.`,
      ],
    ),
    makeCheck(
      `produces at least ${fixture.expectations.minFollowUpQuestions} follow-up questions`,
      typedDraft.openQuestions.length >= fixture.expectations.minFollowUpQuestions,
      [
        `Expected ${fixture.expectations.minFollowUpQuestions}+ questions, received ${typedDraft.openQuestions.length}.`,
      ],
    ),
    makeCheck(
      "every step has transcript provenance",
      typedDraft.steps.every((step) => step.provenance.length > 0),
      typedDraft.steps
        .filter((step) => step.provenance.length === 0)
        .map((step) => `${step.id} has no provenance.`),
    ),
    makeCheck(
      "all provenance links reference real transcript segments",
      provenanceErrors.length === 0,
      provenanceErrors,
    ),
    checkVagueQuantities(fixture, typedDraft),
    checkContradictionsAndUncertainty(fixture, typedDraft),
    checkFollowUpQuestionQuality(typedDraft),
  );

  return phaseResult(fixture, "extraction", checks);
}

export function evaluateFinalization(
  fixture: EvalFixture,
  draft: RecipeDraft,
  followUpAnswers: Record<string, FollowUpAnswer>,
  livingRecipe: unknown,
): PhaseResult {
  const parsedRecipe = livingRecipeSchema.safeParse(livingRecipe);
  const typedRecipe = parsedRecipe.success ? parsedRecipe.data : undefined;
  const checks: CheckResult[] = [
    makeCheck(
      "passes LivingRecipe schema",
      parsedRecipe.success,
      parsedRecipe.success ? [] : parsedRecipe.error.issues.map(formatIssue),
    ),
  ];

  if (!typedRecipe) {
    return phaseResult(fixture, "finalization", checks);
  }

  checks.push(
    checkFollowUpAnswersAppliedToSteps(fixture, typedRecipe),
    checkStepsAreNotQuestionText(draft, typedRecipe),
    checkStepProvenancePreserved(draft.steps, typedRecipe.steps),
    checkUserDetailsMarkedSeparately(followUpAnswers, typedRecipe),
    checkUnansweredQuestionsRemainVisible(draft, followUpAnswers, typedRecipe),
    checkNoInventedFinalDetails(fixture, draft, typedRecipe),
  );

  return phaseResult(fixture, "finalization", checks);
}

export function countFailures(results: PhaseResult[]) {
  return results.reduce(
    (total, result) =>
      total + result.checks.filter((check) => !check.passed).length,
    0,
  );
}

export function countChecks(results: PhaseResult[]) {
  return results.reduce((total, result) => total + result.checks.length, 0);
}

function checkVagueQuantities(
  fixture: EvalFixture,
  draft: RecipeDraft,
): CheckResult {
  const text = normalize(collectDraftText(draft));
  const forbiddenMatches = fixture.expectations.forbiddenInventedQuantities.filter(
    (quantity) => text.includes(normalize(quantity)),
  );

  if (!fixture.expectations.shouldPreserveVagueQuantities) {
    return makeCheck(
      "does not invent configured forbidden quantities",
      forbiddenMatches.length === 0,
      forbiddenMatches.map((quantity) => `Found suspicious invented quantity "${quantity}".`),
    );
  }

  const missingVagueTerms = fixture.expectations.expectedVagueTerms.filter(
    (term) => !text.includes(normalize(term)),
  );
  const reasons = [
    ...missingVagueTerms.map((term) => `Missing vague source term "${term}".`),
    ...forbiddenMatches.map((quantity) => `Found suspicious invented quantity "${quantity}".`),
  ];

  return makeCheck("preserves vague quantities instead of exact guesses", reasons.length === 0, reasons);
}

function checkContradictionsAndUncertainty(
  fixture: EvalFixture,
  draft: RecipeDraft,
): CheckResult {
  const text = normalize(
    [
      draft.summary,
      ...draft.steps.map((step) => step.instruction),
      ...draft.ingredients.map((ingredient) => ingredient.quantity ?? ""),
      ...draft.openQuestions.map((question) => `${question.question} ${question.whyItMatters}`),
    ].join(" "),
  );

  const missingTerms = fixture.expectations.expectedUncertaintyTerms.filter(
    (term) => !text.includes(normalize(term)),
  );

  if (!fixture.expectations.shouldDetectContradictions) {
    return makeCheck(
      "surfaces missing or uncertain details",
      missingTerms.length < fixture.expectations.expectedUncertaintyTerms.length,
      ["No expected uncertainty language was found."],
    );
  }

  const hasHighPriorityQuestion = draft.openQuestions.some(
    (question) => question.priority === "high",
  );
  const reasons = [
    ...missingTerms.map((term) => `Missing contradiction/uncertainty term "${term}".`),
    ...(hasHighPriorityQuestion
      ? []
      : ["Expected at least one high-priority follow-up question for contradiction resolution."]),
  ];

  return makeCheck("surfaces contradictions instead of silently resolving them", reasons.length === 0, reasons);
}

function checkFollowUpQuestionQuality(draft: RecipeDraft): CheckResult {
  const genericPatterns = [
    /can you provide more details/i,
    /what else should we know/i,
    /can you clarify the recipe/i,
  ];
  const badQuestions = draft.openQuestions.filter((question) =>
    genericPatterns.some((pattern) => pattern.test(question.question)),
  );
  const unlinkedQuestions = draft.openQuestions.filter(
    (question) =>
      !(question.relatedStepIds?.length) &&
      !(question.relatedIngredientIds?.length) &&
      !(question.relatedCueIds?.length),
  );

  const reasons = [
    ...badQuestions.map((question) => `${question.id} is too generic.`),
    ...unlinkedQuestions.map((question) => `${question.id} is not linked to recipe evidence.`),
  ];

  return makeCheck("follow-up questions are specific and evidence-linked", reasons.length === 0, reasons);
}

function checkFollowUpAnswersAppliedToSteps(
  fixture: EvalFixture,
  livingRecipe: LivingRecipe,
): CheckResult {
  const stepText = normalize(livingRecipe.steps.map((step) => step.instruction).join(" "));
  const missingSnippets = fixture.expectations.expectedAnswerSnippets.filter(
    (snippet) => !stepText.includes(normalize(snippet)),
  );

  return makeCheck(
    "safe follow-up answers are incorporated into final step text",
    missingSnippets.length === 0,
    missingSnippets.map((snippet) => `Final steps do not include "${snippet}".`),
  );
}

function checkStepsAreNotQuestionText(
  draft: RecipeDraft,
  livingRecipe: LivingRecipe,
): CheckResult {
  const questions = draft.openQuestions.map((question) => normalize(question.question));
  const badSteps = livingRecipe.steps.filter((step) => {
    const instruction = normalize(step.instruction);
    return questions.some(
      (question) => instruction === question || instruction.startsWith(question),
    );
  });

  return makeCheck(
    "final steps are not replaced with follow-up question text",
    badSteps.length === 0,
    badSteps.map((step) => `${step.id} appears to contain question text instead of an instruction.`),
  );
}

function checkStepProvenancePreserved(
  draftSteps: RecipeStep[],
  finalSteps: RecipeStep[],
): CheckResult {
  const finalStepsById = new Map(finalSteps.map((step) => [step.id, step]));
  const reasons: string[] = [];

  for (const draftStep of draftSteps) {
    const finalStep = finalStepsById.get(draftStep.id);

    if (!finalStep) {
      reasons.push(`Final recipe is missing draft step ${draftStep.id}.`);
      continue;
    }

    for (const draftLink of draftStep.provenance) {
      const preserved = finalStep.provenance.some(
        (finalLink) =>
          finalLink.transcriptSegmentId === draftLink.transcriptSegmentId &&
          finalLink.quote === draftLink.quote &&
          finalLink.reason === draftLink.reason,
      );

      if (!preserved) {
        reasons.push(`${draftStep.id} is missing transcript provenance ${draftLink.transcriptSegmentId}.`);
      }
    }
  }

  return makeCheck("transcript-backed provenance is preserved", reasons.length === 0, reasons);
}

function checkUserDetailsMarkedSeparately(
  answers: Record<string, FollowUpAnswer>,
  livingRecipe: LivingRecipe,
): CheckResult {
  const resolvedById = new Map(
    livingRecipe.resolvedQuestions.map((question) => [question.questionId, question]),
  );
  const provenanceText = normalize(
    livingRecipe.steps
      .flatMap((step) => step.provenance)
      .map((link) => `${link.quote} ${link.reason}`)
      .join(" "),
  );
  const reasons: string[] = [];

  for (const answer of Object.values(answers)) {
    const resolved = resolvedById.get(answer.questionId);
    const answerText = normalize(answer.answer);

    if (!resolved) {
      reasons.push(`${answer.questionId} is missing from resolvedQuestions.`);
      continue;
    }

    if (!normalize(resolved.answer).includes(answerText)) {
      reasons.push(`${answer.questionId} resolved answer does not preserve the user's answer.`);
    }

    if (!normalize(resolved.answer).includes("user-provided")) {
      reasons.push(`${answer.questionId} is not marked as user-provided.`);
    }

    if (provenanceText.includes(answerText)) {
      reasons.push(`${answer.questionId} answer appears in transcript provenance text.`);
    }
  }

  return makeCheck("user-provided details are marked separately", reasons.length === 0, reasons);
}

function checkUnansweredQuestionsRemainVisible(
  draft: RecipeDraft,
  answers: Record<string, FollowUpAnswer>,
  livingRecipe: LivingRecipe,
): CheckResult {
  const answeredIds = new Set(Object.keys(answers));
  const unresolvedIds = new Set(livingRecipe.unresolvedQuestions.map((question) => question.id));
  const reasons = draft.openQuestions
    .filter((question) => !answeredIds.has(question.id))
    .filter((question) => !unresolvedIds.has(question.id))
    .map((question) => `${question.id} is unanswered but missing from unresolvedQuestions.`);

  return makeCheck("unanswered questions remain visible as unresolved", reasons.length === 0, reasons);
}

function checkNoInventedFinalDetails(
  fixture: EvalFixture,
  draft: RecipeDraft,
  livingRecipe: LivingRecipe,
): CheckResult {
  const finalStepIds = new Set(livingRecipe.steps.map((step) => step.id));
  const draftStepIds = new Set(draft.steps.map((step) => step.id));
  const text = normalize(collectLivingText(livingRecipe));
  const inventedQuantities = fixture.expectations.forbiddenInventedQuantities.filter(
    (quantity) => text.includes(normalize(quantity)),
  );
  const unknownStepIds = [...finalStepIds].filter((stepId) => !draftStepIds.has(stepId));
  const missingStepIds = [...draftStepIds].filter((stepId) => !finalStepIds.has(stepId));
  const reasons = [
    ...inventedQuantities.map((quantity) => `Final recipe includes suspicious invented quantity "${quantity}".`),
    ...unknownStepIds.map((stepId) => `Final recipe added unsupported step ${stepId}.`),
    ...missingStepIds.map((stepId) => `Final recipe dropped transcript-backed step ${stepId}.`),
  ];

  return makeCheck("the system does not invent missing details", reasons.length === 0, reasons);
}

function phaseResult(
  fixture: EvalFixture,
  phase: PhaseResult["phase"],
  checks: CheckResult[],
): PhaseResult {
  return {
    phase,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    checks,
  };
}

function makeCheck(name: string, passed: boolean, reasons: string[]): CheckResult {
  return {
    name,
    passed,
    reasons: passed ? [] : reasons,
  };
}

function collectDraftText(draft: RecipeDraft) {
  return [
    draft.dishName,
    draft.summary,
    draft.familyContext,
    ...draft.ingredients.map((ingredient) =>
      [
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.preparation,
        ingredient.confidence,
      ].join(" "),
    ),
    ...draft.steps.map((step) => [step.instruction, step.timing, step.temperature].join(" ")),
    ...draft.sensoryCues.map((cue) => [cue.cue, cue.interpretation].join(" ")),
    ...draft.openQuestions.map((question) => `${question.question} ${question.whyItMatters}`),
  ].join(" ");
}

function collectLivingText(livingRecipe: LivingRecipe) {
  return [
    livingRecipe.title,
    livingRecipe.summary,
    livingRecipe.familyContext,
    ...livingRecipe.ingredients.map((ingredient) =>
      [ingredient.name, ingredient.quantity, ingredient.unit, ingredient.preparation].join(" "),
    ),
    ...livingRecipe.steps.map((step) => [step.instruction, step.timing, step.temperature].join(" ")),
    ...livingRecipe.resolvedQuestions.map((question) => question.answer),
    ...livingRecipe.unresolvedQuestions.map((question) => `${question.question} ${question.whyItMatters}`),
  ].join(" ");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatIssue(issue: { path: PropertyKey[]; message: string }) {
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `${path}: ${issue.message}`;
}
