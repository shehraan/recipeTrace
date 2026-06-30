import { NextResponse } from "next/server";
import { z } from "zod";

import { buildLivingRecipeFromDraft } from "@/src/lib/recipe/build-living-recipe";
import {
  followUpAnswerSchema,
  livingRecipeSchema,
  recipeDraftSchema,
  transcriptSegmentSchema,
} from "@/src/lib/recipe/schemas";
import type { FollowUpAnswer, LivingRecipe, RecipeDraft } from "@/src/lib/recipe/types";

const requestSchema = z
  .object({
    recipeDraft: recipeDraftSchema,
    transcriptSegments: z.array(transcriptSegmentSchema).min(1),
    followUpAnswers: z.union([
      z.record(z.string(), followUpAnswerSchema),
      z.array(followUpAnswerSchema),
    ]),
  })
  .strict();

const openAiChatCompletionSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().min(1).nullable(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

type ValidationDetail = {
  path: string;
  message: string;
  code?: string;
};

const FINALIZATION_SYSTEM_PROMPT = `You are finalizing a living family recipe.

Do not invent missing details.
Use follow-up answers only where they answer an open question.
Preserve original source-backed details.
Preserve transcript-backed sensory cues.
Preserve uncertainty when still unresolved.
Every final step must keep provenance from the draft step.
User answers should be labeled as user-provided, not transcript-backed.
Every resolved question must preserve appliedToStepIds and appliedToIngredientIds from the original open question relationship fields.
Match the LivingRecipe schema exactly. Use these top-level fields only: id, captureId, title, summary, familyContext, ingredients, steps, sensoryCues, resolvedQuestions, unresolvedQuestions, sourceSummary, createdAt.
Use unresolvedQuestions, not openQuestions or followUpQuestions.
Use transcriptSegmentId in every provenance link, not transcript_span_ids or transcriptSegmentIds.
Use only these enum values: confidence and priority are low, medium, or high; sensory cue type is look, smell, sound, texture, timing, or temperature; question target is ingredient, step, timing, temperature, texture, serving, or context.
Use [] for empty arrays.

Rewrite the final LivingRecipe only. Do not return a RecipeDraft.
Your primary job is to rewrite final step instructions naturally using user answers when safe.
Use fallbackLivingRecipe as the structural base. Do not add, remove, or rename ingredients, steps, sensory cues, questions, ids, sourceSummary fields, or provenance links.
For every user answer whose open question has relatedStepIds, edit the related final step instruction to include the answered detail when the answer is direct and cookable.
If a resolved question has relatedStepIds, incorporate the answer into at least one related final step instruction when safe, and into every related step where the answer directly changes that cooking action.
Example: if the original step says "Cook sliced onions in oil until the edges are golden" and the user answered heat level "high", return "Cook sliced onions in oil over high heat until the edges are golden."
Do not leave a direct step answer only in resolvedQuestions.
Never put the answer only in an evidence drawer or note if it directly changes a cooking instruction.
Never replace a step with follow-up question text.
Preserve provenance from each draft step exactly on the corresponding final step.
If an answer applies to an ingredient but cannot be represented safely on the ingredient without transcript provenance, keep the ingredient unchanged and preserve the answer in resolvedQuestions with appliedToIngredientIds.
If an answer is ambiguous, keep the original step and start the resolvedQuestions answer with "Ambiguous user-provided note:" followed by the answer.
Return strict JSON only.`;

const FINALIZATION_REPAIR_SYSTEM_PROMPT = `You repair a LivingRecipe JSON object that failed validation.

Do not invent missing details.
Repair only fields identified by the validation errors.
Preserve all ids, ordering, ingredients, sensory cues, provenance links, sourceSummary counts, questionId values, and user answer text.
Every resolved question must preserve appliedToStepIds and appliedToIngredientIds from the original open question relationship fields.
Use unresolvedQuestions, not openQuestions or followUpQuestions.
Use transcriptSegmentId in provenance links.
Do not add user-provided ingredients or transcript provenance for user answers; keep user details in resolvedQuestions unless they safely rewrite an existing step instruction.
When validation says a direct answer was not incorporated into a related final step, rewrite that step instruction naturally to include the exact user answer when safe.
Never replace a step with the follow-up question text.
Never put a direct cooking answer only in resolvedQuestions or notes.
Return strict JSON only.`;

export async function POST(request: Request) {
  devLog("Finalize route hit");

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    devLog("Using fallback in client because OpenAI API key is not configured");
    return jsonError(
      500,
      "OpenAI API key is not configured.",
      "Set OPENAI_API_KEY to enable living recipe finalization.",
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const requestResult = requestSchema.safeParse(normalizeFinalizationRequestPayload(payload));

  if (!requestResult.success) {
    return validationError("Invalid living recipe finalization request.", formatZodIssues(requestResult.error));
  }

  const { recipeDraft, transcriptSegments } = requestResult.data;
  const followUpAnswers = normalizeFollowUpAnswers(requestResult.data.followUpAnswers);
  devLog("Follow-up answer count", { count: Object.keys(followUpAnswers).length });
  const requestErrors = validateFinalizationInput(recipeDraft, transcriptSegments, followUpAnswers);

  if (requestErrors.length > 0) {
    devLog("Validation errors", { stage: "request", errors: requestErrors });
    return validationError("Invalid living recipe finalization request.", requestErrors);
  }

  const fallbackLivingRecipe = buildLivingRecipeFromDraft(
    recipeDraft,
    followUpAnswers,
    transcriptSegments.length,
  );

  const openAiResponse = await callOpenAiForLivingRecipe(apiKey, [
    {
      role: "system",
      content: FINALIZATION_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildFinalizationUserPrompt({
        recipeDraft,
        transcriptSegments,
        followUpAnswers,
        fallbackLivingRecipe,
      }),
    },
  ]);

  if (!openAiResponse.ok) {
    const detail = await readOpenAiError(openAiResponse);
    devLog("Using fallback in client because OpenAI finalization failed", {
      status: openAiResponse.status,
      detail,
    });
    return jsonError(
      502,
      "Living recipe finalization failed.",
      detail,
    );
  }

  const completionPayload: unknown = await openAiResponse.json();
  const completionResult = openAiChatCompletionSchema.safeParse(completionPayload);

  if (!completionResult.success) {
    return validationError(
      "OpenAI returned an unexpected response shape.",
      formatZodIssues(completionResult.error),
    );
  }

  const content = completionResult.data.choices[0].message.content;

  if (!content) {
    return validationError("OpenAI returned an empty living recipe response.", [
      { path: "choices.0.message.content", message: "Expected a JSON object string." },
    ]);
  }

  let modelJson: unknown;

  try {
    modelJson = JSON.parse(content);
  } catch {
    return validationError("OpenAI returned invalid JSON.", [
      { path: "livingRecipe", message: "Response content could not be parsed as JSON." },
    ]);
  }

  const normalizedModelJson = normalizeLivingRecipeResponse(
    modelJson,
    recipeDraft,
    followUpAnswers,
    fallbackLivingRecipe,
  );
  const livingRecipeResult = livingRecipeSchema.safeParse(normalizedModelJson);

  if (!livingRecipeResult.success) {
    const schemaErrors = formatZodIssues(livingRecipeResult.error);
    devLog("Validation errors", {
      stage: "schema",
      errors: schemaErrors,
    });
    devLog("First finalization attempt failed", { stage: "schema" });
    devLog("Repair pass ran", { reason: "schema validation failed" });

    const repairResult = await repairLivingRecipe({
      apiKey,
      failedLivingRecipe: normalizedModelJson,
      validationErrors: schemaErrors,
      recipeDraft,
      transcriptSegments,
      followUpAnswers,
      fallbackLivingRecipe,
    });

    if (repairResult.ok) {
      devLog("Repair attempt passed", { stage: "schema" });
      return NextResponse.json({
        livingRecipe: repairResult.livingRecipe,
        validation: { ok: true, firstAttemptPassed: false, repairRan: true },
      });
    }

    devLog("Repair attempt failed", { stage: "schema", errors: repairResult.errors });
    devLog("Fallback used", { reason: repairResult.message });
    return validationError(repairResult.message, repairResult.errors);
  }

  devLog("First finalization attempt passed schema");
  devLog("Resolved questions before validation", {
    resolvedQuestions: livingRecipeResult.data.resolvedQuestions,
  });

  const guardrailErrors = validateFinalizedLivingRecipe(
    livingRecipeResult.data,
    recipeDraft,
    fallbackLivingRecipe,
    followUpAnswers,
  );

  if (guardrailErrors.length > 0) {
    devLog("Validation errors", { stage: "guardrail", errors: guardrailErrors });
    devLog("First finalization attempt failed", { stage: "guardrail" });

    devLog("Repair pass ran", { reason: "guardrail validation failed" });
    const repairResult = await repairLivingRecipe({
      apiKey,
      failedLivingRecipe: livingRecipeResult.data,
      validationErrors: guardrailErrors,
      recipeDraft,
      transcriptSegments,
      followUpAnswers,
      fallbackLivingRecipe,
    });

    if (repairResult.ok) {
      devLog("Repair attempt passed", { stage: "guardrail" });
      return NextResponse.json({
        livingRecipe: repairResult.livingRecipe,
        validation: { ok: true, firstAttemptPassed: false, repairRan: true },
      });
    }

    devLog("Validation errors", {
      stage: "repair",
      errors: repairResult.errors,
    });
    devLog("Repair attempt failed", { stage: "guardrail", errors: repairResult.errors });
    devLog("Fallback used", { reason: repairResult.message });
    return validationError(repairResult.message, repairResult.errors);
  }

  devLog("First finalization attempt passed");
  devLog("Repair pass skipped", { reason: "initial finalization passed validation" });

  return NextResponse.json({
    livingRecipe: livingRecipeResult.data,
    validation: { ok: true, firstAttemptPassed: true, repairRan: false },
  });
}

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

async function callOpenAiForLivingRecipe(apiKey: string, messages: ChatMessage[]) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FINALIZE_MODEL ?? "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages,
    }),
  });
}

async function repairLivingRecipe({
  apiKey,
  failedLivingRecipe,
  validationErrors,
  recipeDraft,
  transcriptSegments,
  followUpAnswers,
  fallbackLivingRecipe,
}: {
  apiKey: string;
  failedLivingRecipe: unknown;
  validationErrors: ValidationDetail[];
  recipeDraft: RecipeDraft;
  transcriptSegments: z.infer<typeof transcriptSegmentSchema>[];
  followUpAnswers: Record<string, FollowUpAnswer>;
  fallbackLivingRecipe: LivingRecipe;
}): Promise<
  | { ok: true; livingRecipe: LivingRecipe }
  | { ok: false; message: string; errors: ValidationDetail[] }
> {
  const repairResponse = await callOpenAiForLivingRecipe(apiKey, [
    {
      role: "system",
      content: FINALIZATION_REPAIR_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildFinalizationRepairPrompt({
        failedLivingRecipe,
        validationErrors,
        recipeDraft,
        transcriptSegments,
        followUpAnswers,
      }),
    },
  ]);

  if (!repairResponse.ok) {
    const detail = await readOpenAiError(repairResponse);
    devLog("Using fallback in client because OpenAI repair failed", {
      status: repairResponse.status,
      detail,
    });
    return {
      ok: false,
      message: "LivingRecipe failed finalization validation.",
      errors: validationErrors,
    };
  }

  const completionPayload: unknown = await repairResponse.json();
  const completionResult = openAiChatCompletionSchema.safeParse(completionPayload);

  if (!completionResult.success) {
    return {
      ok: false,
      message: "OpenAI returned an unexpected repair response shape.",
      errors: formatZodIssues(completionResult.error),
    };
  }

  const content = completionResult.data.choices[0].message.content;

  if (!content) {
    return {
      ok: false,
      message: "OpenAI returned an empty repair response.",
      errors: [{ path: "choices.0.message.content", message: "Expected a JSON object string." }],
    };
  }

  let modelJson: unknown;

  try {
    modelJson = JSON.parse(content);
  } catch {
    return {
      ok: false,
      message: "OpenAI returned invalid repair JSON.",
      errors: [{ path: "livingRecipe", message: "Repair content could not be parsed as JSON." }],
    };
  }

  const livingRecipeResult = livingRecipeSchema.safeParse(
    normalizeLivingRecipeResponse(modelJson, recipeDraft, followUpAnswers, fallbackLivingRecipe),
  );

  if (!livingRecipeResult.success) {
    return {
      ok: false,
      message: "Repaired LivingRecipe failed schema validation.",
      errors: formatZodIssues(livingRecipeResult.error),
    };
  }

  devLog("Resolved questions before validation", {
    stage: "repair",
    resolvedQuestions: livingRecipeResult.data.resolvedQuestions,
  });

  const guardrailErrors = validateFinalizedLivingRecipe(
    livingRecipeResult.data,
    recipeDraft,
    fallbackLivingRecipe,
    followUpAnswers,
  );

  if (guardrailErrors.length > 0) {
    return {
      ok: false,
      message: "Repaired LivingRecipe failed finalization validation.",
      errors: guardrailErrors,
    };
  }

  return { ok: true, livingRecipe: livingRecipeResult.data };
}

function normalizeFollowUpAnswers(
  followUpAnswers: Record<string, FollowUpAnswer> | FollowUpAnswer[],
) {
  if (!Array.isArray(followUpAnswers)) {
    return followUpAnswers;
  }

  return Object.fromEntries(followUpAnswers.map((answer) => [answer.questionId, answer]));
}

function normalizeFinalizationRequestPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    recipeDraft: normalizeRecipeDraftAliases(value.recipeDraft),
  };
}

function normalizeRecipeDraftAliases(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const next: Record<string, unknown> = { ...value };

  if (!Array.isArray(next.openQuestions)) {
    next.openQuestions = Array.isArray(next.followUpQuestions)
      ? next.followUpQuestions
      : next.follow_up_questions;
  }

  next.openQuestions = normalizeOpenQuestionRelationshipAliases(next.openQuestions);

  delete next.followUpQuestions;
  delete next.follow_up_questions;

  next.ingredients = normalizeProvenanceOwners(next.ingredients, new Map());
  next.steps = normalizeProvenanceOwners(next.steps, new Map());
  next.sensoryCues = normalizeProvenanceOwners(next.sensoryCues, new Map());

  return next;
}

function normalizeLivingRecipeResponse(
  value: unknown,
  recipeDraft: RecipeDraft,
  followUpAnswers: Record<string, FollowUpAnswer>,
  fallbackLivingRecipe: LivingRecipe,
): unknown {
  const candidate = isRecord(value) && isRecord(value.livingRecipe) ? value.livingRecipe : value;

  if (!isRecord(candidate)) {
    return candidate;
  }

  const next: Record<string, unknown> = {
    id: fallbackLivingRecipe.id,
    captureId: fallbackLivingRecipe.captureId,
    title: firstNonEmptyString(candidate.title, fallbackLivingRecipe.title),
    summary: firstNonEmptyString(candidate.summary, fallbackLivingRecipe.summary),
    familyContext: firstNonEmptyString(candidate.familyContext, fallbackLivingRecipe.familyContext),
    createdAt: firstNonEmptyString(candidate.createdAt, fallbackLivingRecipe.createdAt),
    sourceSummary: fallbackLivingRecipe.sourceSummary,
  };

  next.ingredients = normalizeLivingIngredients(fallbackLivingRecipe);
  next.steps = normalizeLivingSteps(candidate.steps, fallbackLivingRecipe);
  next.sensoryCues = normalizeLivingSensoryCues(fallbackLivingRecipe);
  next.resolvedQuestions = normalizeResolvedQuestions(
    candidate.resolvedQuestions,
    recipeDraft,
    followUpAnswers,
    fallbackLivingRecipe,
  );
  next.unresolvedQuestions = fallbackLivingRecipe.unresolvedQuestions;

  return next;
}

function normalizeLivingIngredients(fallbackLivingRecipe: LivingRecipe) {
  return fallbackLivingRecipe.ingredients;
}

function normalizeLivingSteps(
  value: unknown,
  fallbackLivingRecipe: LivingRecipe,
) {
  const candidatesById = recordArrayById(value);

  return fallbackLivingRecipe.steps.map((fallbackStep) => {
    const candidate = candidatesById.get(fallbackStep.id);

    if (!candidate) {
      return fallbackStep;
    }

    return {
      ...fallbackStep,
      instruction: firstNonEmptyString(
        candidate.instruction,
        candidate.text,
        fallbackStep.instruction,
      ),
      timing: fallbackStep.timing,
      temperature: fallbackStep.temperature,
      sensoryCueIds: fallbackStep.sensoryCueIds,
      isInferred: fallbackStep.isInferred,
      confidence: fallbackStep.confidence,
      provenance: fallbackStep.provenance,
    };
  });
}

function normalizeLivingSensoryCues(fallbackLivingRecipe: LivingRecipe) {
  return fallbackLivingRecipe.sensoryCues;
}

function recordArrayById(value: unknown) {
  return new Map(
    (Array.isArray(value) ? value : [])
      .filter(isRecord)
      .flatMap((item) => (typeof item.id === "string" ? [[item.id, item] as const] : [])),
  );
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeUserProvidedAnswer(candidateAnswer: string | undefined, submittedAnswer: string) {
  const answer = candidateAnswer?.includes(submittedAnswer) ? candidateAnswer : submittedAnswer;

  if (isAmbiguousResolvedAnswer(answer) || /\buser-provided\b/i.test(answer)) {
    return answer;
  }

  return `User-provided: ${answer}`;
}

function normalizeOpenQuestionRelationshipAliases(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((question) => {
    if (!isRecord(question)) {
      return question;
    }

    const next: Record<string, unknown> = { ...question };

    if (!Array.isArray(next.relatedStepIds)) {
      next.relatedStepIds = firstStringArray(
        next.appliedToStepIds,
        next.targetStepIds,
        next.stepIds,
      );
    }

    if (!Array.isArray(next.relatedIngredientIds)) {
      next.relatedIngredientIds = firstStringArray(
        next.appliedToIngredientIds,
        next.targetIngredientIds,
        next.ingredientIds,
      );
    }

    delete next.appliedToStepIds;
    delete next.targetStepIds;
    delete next.stepIds;
    delete next.appliedToIngredientIds;
    delete next.targetIngredientIds;
    delete next.ingredientIds;

    return next;
  });
}

function normalizeResolvedQuestions(
  value: unknown,
  recipeDraft: RecipeDraft,
  followUpAnswers: Record<string, FollowUpAnswer>,
  fallbackLivingRecipe: LivingRecipe,
): unknown {
  const draftQuestionsById = new Map(recipeDraft.openQuestions.map((question) => [question.id, question]));
  const candidatesByQuestionId = new Map(
    (Array.isArray(value) ? value : [])
      .filter(isRecord)
      .flatMap((entry) =>
        typeof entry.questionId === "string" ? [[entry.questionId, entry] as const] : [],
      ),
  );

  return fallbackLivingRecipe.resolvedQuestions.map((fallbackEntry) => {
    const questionId = fallbackEntry.questionId;
    const candidate = candidatesByQuestionId.get(questionId);
    const draftQuestion = draftQuestionsById.get(questionId);
    const submittedAnswer = followUpAnswers[questionId]?.answer;
    const candidateAnswer = firstNonEmptyString(candidate?.answer);
    const answer = normalizeUserProvidedAnswer(candidateAnswer, submittedAnswer ?? fallbackEntry.answer);
    const draftStepIds = draftQuestion ? getQuestionStepIds(draftQuestion) : undefined;
    const draftIngredientIds = draftQuestion ? getQuestionIngredientIds(draftQuestion) : undefined;

    return {
      questionId,
      answer,
      appliedToStepIds: draftStepIds ?? fallbackEntry.appliedToStepIds ?? [],
      appliedToIngredientIds: draftIngredientIds ?? fallbackEntry.appliedToIngredientIds ?? [],
    };
  });
}

function normalizeProvenanceOwners(
  value: unknown,
  sourceProvenanceById: Map<string, unknown>,
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return item;
    }

    const next: Record<string, unknown> = { ...item };
    const sourceProvenance =
      typeof next.id === "string" ? sourceProvenanceById.get(next.id) : undefined;

    if (Array.isArray(sourceProvenance) && shouldUseSourceProvenance(next)) {
      next.provenance = sourceProvenance;
    } else {
      next.provenance = normalizeProvenanceLinks(next.provenance ?? next.provenance_links);
    }

    delete next.provenance_links;
    delete next.transcript_span_ids;
    delete next.transcriptSegmentIds;

    return next;
  });
}

function shouldUseSourceProvenance(value: Record<string, unknown>) {
  return (
    !Array.isArray(value.provenance) ||
    Array.isArray(value.transcript_span_ids) ||
    Array.isArray(value.transcriptSegmentIds) ||
    hasProvenanceAliases(value.provenance)
  );
}

function hasProvenanceAliases(value: unknown) {
  return (
    Array.isArray(value) &&
    value.some(
      (link) =>
        isRecord(link) &&
        !("transcriptSegmentId" in link) &&
        ("transcript_segment_id" in link ||
          "transcript_span_id" in link ||
          "transcript_span_ids" in link ||
          "transcriptSegmentIds" in link),
    )
  );
}

function normalizeProvenanceLinks(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((link) => {
    if (!isRecord(link)) {
      return link;
    }

    const next: Record<string, unknown> = { ...link };

    if (!next.transcriptSegmentId) {
      next.transcriptSegmentId =
        next.transcript_segment_id ??
        next.transcript_span_id ??
        (Array.isArray(next.transcript_span_ids) ? next.transcript_span_ids[0] : undefined) ??
        (Array.isArray(next.transcriptSegmentIds) ? next.transcriptSegmentIds[0] : undefined);
    }

    delete next.transcript_segment_id;
    delete next.transcript_span_id;
    delete next.transcript_span_ids;
    delete next.transcriptSegmentIds;

    return next;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFinalizationInput(
  recipeDraft: RecipeDraft,
  transcriptSegments: z.infer<typeof transcriptSegmentSchema>[],
  followUpAnswers: Record<string, FollowUpAnswer>,
): ValidationDetail[] {
  const errors: ValidationDetail[] = [];
  const segmentCaptureIds = new Set(transcriptSegments.map((segment) => segment.captureId));
  const questionIds = new Set(recipeDraft.openQuestions.map((question) => question.id));

  if (segmentCaptureIds.size !== 1 || !segmentCaptureIds.has(recipeDraft.captureId)) {
    errors.push({
      path: "transcriptSegments",
      message: "Transcript segments must all belong to recipeDraft.captureId.",
    });
  }

  for (const [key, answer] of Object.entries(followUpAnswers)) {
    if (key !== answer.questionId) {
      errors.push({
        path: `followUpAnswers.${key}.questionId`,
        message: "Follow-up answer record keys must match questionId values.",
      });
    }

    if (!questionIds.has(answer.questionId)) {
      errors.push({
        path: `followUpAnswers.${key}.questionId`,
        message: `Follow-up answer references unknown question ${answer.questionId}.`,
      });
    }
  }

  return errors;
}

function validateFinalizedLivingRecipe(
  livingRecipe: LivingRecipe,
  recipeDraft: RecipeDraft,
  fallbackLivingRecipe: LivingRecipe,
  followUpAnswers: Record<string, FollowUpAnswer>,
): ValidationDetail[] {
  const errors: ValidationDetail[] = [];
  const draftStepsById = new Map(recipeDraft.steps.map((step) => [step.id, step]));
  const finalStepsById = new Map(livingRecipe.steps.map((step) => [step.id, step]));
  const draftQuestionsById = new Map(recipeDraft.openQuestions.map((question) => [question.id, question]));
  const answeredQuestionIds = new Set(Object.keys(followUpAnswers));
  const resolvedQuestionIds = new Set(livingRecipe.resolvedQuestions.map((entry) => entry.questionId));
  const fallbackResolvedById = new Map(
    fallbackLivingRecipe.resolvedQuestions.map((entry) => [entry.questionId, entry]),
  );
  const unresolvedQuestionIds = new Set(
    livingRecipe.unresolvedQuestions.map((question) => question.id),
  );
  const fallbackUnresolvedQuestionIds = new Set(
    fallbackLivingRecipe.unresolvedQuestions.map((question) => question.id),
  );

  if (livingRecipe.captureId !== recipeDraft.captureId) {
    errors.push({
      path: "captureId",
      message: `Expected captureId "${recipeDraft.captureId}" but received "${livingRecipe.captureId}".`,
    });
  }

  for (const draftStep of recipeDraft.steps) {
    const finalStep = finalStepsById.get(draftStep.id);

    if (!finalStep) {
      errors.push({
        path: "steps",
        message: `Final recipe is missing draft step ${draftStep.id}.`,
      });
      continue;
    }

    const missingProvenance = draftStep.provenance.filter(
      (draftLink) =>
        !finalStep.provenance.some(
          (finalLink) =>
            finalLink.transcriptSegmentId === draftLink.transcriptSegmentId &&
            finalLink.quote === draftLink.quote &&
            finalLink.reason === draftLink.reason,
        ),
    );

    if (missingProvenance.length > 0) {
      errors.push({
        path: `steps.${draftStep.id}.provenance`,
        message: `Final step ${draftStep.id} must preserve all draft provenance links.`,
      });
    }
  }

  for (const finalStep of livingRecipe.steps) {
    if (!draftStepsById.has(finalStep.id)) {
      errors.push({
        path: `steps.${finalStep.id}`,
        message: `Final recipe includes unknown step ${finalStep.id}.`,
      });
    }
  }

  for (const questionId of answeredQuestionIds) {
    if (!resolvedQuestionIds.has(questionId)) {
      errors.push({
        path: "resolvedQuestions",
        message: `Answered question ${questionId} must be represented as a user-provided resolved detail.`,
      });
    }
  }

  for (const entry of livingRecipe.resolvedQuestions) {
    const submittedAnswer = followUpAnswers[entry.questionId];

    if (!submittedAnswer) {
      errors.push({
        path: `resolvedQuestions.${entry.questionId}`,
        message: `Resolved question ${entry.questionId} was not provided by the user.`,
      });
      continue;
    }

    if (!entry.answer.includes(submittedAnswer.answer)) {
      errors.push({
        path: `resolvedQuestions.${entry.questionId}.answer`,
        message: "Resolved detail must preserve the user's answer text.",
      });
    }

    const fallbackEntry = fallbackResolvedById.get(entry.questionId);
    const draftQuestion = draftQuestionsById.get(entry.questionId);

    if (
      fallbackEntry &&
      !haveSameStringValues(entry.appliedToStepIds, fallbackEntry.appliedToStepIds)
    ) {
      errors.push({
        path: `resolvedQuestions.${entry.questionId}.appliedToStepIds`,
        message: "Resolved detail must preserve its related step links for evidence display.",
      });
    }

    if (
      fallbackEntry &&
      !haveSameStringValues(entry.appliedToIngredientIds, fallbackEntry.appliedToIngredientIds)
    ) {
      errors.push({
        path: `resolvedQuestions.${entry.questionId}.appliedToIngredientIds`,
        message: "Resolved detail must preserve its related ingredient links for evidence display.",
      });
    }

    if (
      draftQuestion &&
      fallbackEntry?.appliedToStepIds?.length &&
      isDirectStepAnswer(draftQuestion.target, submittedAnswer.answer) &&
      !isAmbiguousResolvedAnswer(entry.answer)
    ) {
      for (const stepId of fallbackEntry.appliedToStepIds) {
        const finalStep = finalStepsById.get(stepId);

        if (finalStep && !textIncludesAnswer(finalStep.instruction, submittedAnswer.answer)) {
          errors.push({
            path: `steps.${stepId}.instruction`,
            message: `Direct answer for ${entry.questionId} must be incorporated into related final step ${stepId}.`,
          });
        }
      }
    }
  }

  for (const questionId of fallbackUnresolvedQuestionIds) {
    if (!unresolvedQuestionIds.has(questionId)) {
      errors.push({
        path: "unresolvedQuestions",
        message: `Unanswered question ${questionId} must remain unresolved.`,
      });
    }
  }

  for (const questionId of unresolvedQuestionIds) {
    if (!fallbackUnresolvedQuestionIds.has(questionId)) {
      errors.push({
        path: "unresolvedQuestions",
        message: `Answered question ${questionId} must not remain unresolved.`,
      });
    }
  }

  if (
    livingRecipe.sourceSummary.transcriptSegmentCount !==
    fallbackLivingRecipe.sourceSummary.transcriptSegmentCount
  ) {
    errors.push({
      path: "sourceSummary.transcriptSegmentCount",
      message: "Source summary transcript count must match the provided transcript segments.",
    });
  }

  if (livingRecipe.sourceSummary.supportedStepCount !== recipeDraft.steps.length) {
    errors.push({
      path: "sourceSummary.supportedStepCount",
      message: "Source summary supported step count must match the draft step count.",
    });
  }

  if (livingRecipe.sourceSummary.inferredStepCount !== fallbackLivingRecipe.sourceSummary.inferredStepCount) {
    errors.push({
      path: "sourceSummary.inferredStepCount",
      message: "Source summary inferred step count must match the draft inferred step count.",
    });
  }

  return errors;
}

function haveSameStringValues(left: string[] | undefined, right: string[] | undefined) {
  const leftValues = new Set(left ?? []);
  const rightValues = new Set(right ?? []);

  if (leftValues.size !== rightValues.size) {
    return false;
  }

  for (const value of leftValues) {
    if (!rightValues.has(value)) {
      return false;
    }
  }

  return true;
}

function firstStringArray(...values: unknown[]) {
  for (const value of values) {
    const stringArray = getStringArray(value);

    if (stringArray) {
      return stringArray;
    }
  }

  return undefined;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }

  return value;
}

function getQuestionStepIds(question: RecipeDraft["openQuestions"][number]) {
  return firstStringArray(
    question.relatedStepIds,
    (question as Record<string, unknown>).appliedToStepIds,
    (question as Record<string, unknown>).targetStepIds,
  );
}

function getQuestionIngredientIds(question: RecipeDraft["openQuestions"][number]) {
  return firstStringArray(
    question.relatedIngredientIds,
    (question as Record<string, unknown>).appliedToIngredientIds,
    (question as Record<string, unknown>).targetIngredientIds,
  );
}

function isDirectStepAnswer(target: RecipeDraft["openQuestions"][number]["target"], answer: string) {
  if (!["step", "timing", "temperature", "texture"].includes(target)) {
    return false;
  }

  const normalized = answer.trim().toLowerCase();

  if (!normalized || /\b(i do not know|don't know|not sure|maybe|depends|unclear)\b/.test(normalized)) {
    return false;
  }

  return normalized.split(/\s+/).length <= 5;
}

function isAmbiguousResolvedAnswer(answer: string) {
  return answer.trim().toLowerCase().startsWith("ambiguous user-provided note:");
}

function textIncludesAnswer(text: string, answer: string) {
  return normalizeComparableText(text).includes(normalizeComparableText(answer));
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildFinalizationUserPrompt({
  recipeDraft,
  transcriptSegments,
  followUpAnswers,
  fallbackLivingRecipe,
}: {
  recipeDraft: RecipeDraft;
  transcriptSegments: z.infer<typeof transcriptSegmentSchema>[];
  followUpAnswers: Record<string, FollowUpAnswer>;
  fallbackLivingRecipe: LivingRecipe;
}) {
  return `Finalize this LivingRecipe JSON object.

Use the fallbackLivingRecipe as the structural base. You must rewrite related final step instruction text to naturally incorporate direct, safe user-provided answers, while keeping the same step ids, order, ingredients, sensory cues, and provenance links.

Important:
- Return a LivingRecipe object, not a RecipeDraft.
- Preserve all transcript-backed details from recipeDraft.
- Preserve all step provenance links exactly from recipeDraft.
- Put user-provided answer evidence in resolvedQuestions.
- Do not treat user answers as transcript evidence.
- For answered questions with relatedStepIds, merge the user's answer into each related step instruction when it is direct and cookable.
- Never replace a step instruction with a follow-up question.
- If a user answer is ambiguous, leave the step instruction mostly unchanged and prefix that resolvedQuestions answer with "Ambiguous user-provided note:".
- Keep unanswered questions in unresolvedQuestions.

recipeDraft:
${JSON.stringify(recipeDraft, null, 2)}

transcriptSegments:
${JSON.stringify(transcriptSegments, null, 2)}

followUpAnswers:
${JSON.stringify(followUpAnswers, null, 2)}

fallbackLivingRecipe:
${JSON.stringify(fallbackLivingRecipe, null, 2)}

Return only one strict JSON object matching the LivingRecipe schema. Do not wrap it in markdown or add explanatory text.`;
}

function buildFinalizationRepairPrompt({
  failedLivingRecipe,
  validationErrors,
  recipeDraft,
  transcriptSegments,
  followUpAnswers,
}: {
  failedLivingRecipe: unknown;
  validationErrors: ValidationDetail[];
  recipeDraft: RecipeDraft;
  transcriptSegments: z.infer<typeof transcriptSegmentSchema>[];
  followUpAnswers: Record<string, FollowUpAnswer>;
}) {
  return `Repair this LivingRecipe JSON object.

Only change fields required by validationErrors. In particular, if a direct answer was not incorporated into a related step instruction, rewrite that step instruction to include the user answer naturally while preserving the original instruction's transcript-backed cues.

Validation errors:
${JSON.stringify(validationErrors, null, 2)}

failedLivingRecipe:
${JSON.stringify(failedLivingRecipe, null, 2)}

recipeDraft:
${JSON.stringify(recipeDraft, null, 2)}

transcriptSegments:
${JSON.stringify(transcriptSegments, null, 2)}

followUpAnswers:
${JSON.stringify(followUpAnswers, null, 2)}

Return only one strict JSON object matching the LivingRecipe schema. Do not wrap it in markdown or add explanatory text.`;
}

function devLog(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (details) {
    console.info(`[RecipeTrace] ${message}`, JSON.stringify(details, null, 2));
  } else {
    console.info(`[RecipeTrace] ${message}`);
  }
}

function validationError(message: string, details: ValidationDetail[]) {
  if (process.env.NODE_ENV !== "production") {
    devLog("Fallback used", { reason: message });
    console.warn("[RecipeTrace] Living recipe finalization validation failed", {
      message,
      details,
    });
  }

  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status: 422 },
  );
}

function jsonError(status: number, message: string, detail?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(detail ? { detail } : {}),
    },
    { status },
  );
}

function formatZodIssues(error: z.ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

async function readOpenAiError(response: Response) {
  try {
    const payload: unknown = await response.json();
    const parsed = z
      .object({
        error: z
          .object({
            message: z.string().optional(),
          })
          .optional(),
      })
      .passthrough()
      .safeParse(payload);

    return parsed.success && parsed.data.error?.message
      ? parsed.data.error.message
      : `OpenAI returned status ${response.status}.`;
  } catch {
    return `OpenAI returned status ${response.status}.`;
  }
}
