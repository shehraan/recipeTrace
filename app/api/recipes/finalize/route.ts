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

Rewrite the final LivingRecipe only. Do not return a RecipeDraft.
Incorporate user answers into step text when safe and natural.
Never replace a step with follow-up question text.
If an answer is ambiguous, keep the original step and add a small user-provided note in the resolvedQuestions entry.
Return strict JSON only.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
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

  const requestResult = requestSchema.safeParse(payload);

  if (!requestResult.success) {
    return validationError("Invalid living recipe finalization request.", formatZodIssues(requestResult.error));
  }

  const { recipeDraft, transcriptSegments } = requestResult.data;
  const followUpAnswers = normalizeFollowUpAnswers(requestResult.data.followUpAnswers);
  const requestErrors = validateFinalizationInput(recipeDraft, transcriptSegments, followUpAnswers);

  if (requestErrors.length > 0) {
    return validationError("Invalid living recipe finalization request.", requestErrors);
  }

  const fallbackLivingRecipe = buildLivingRecipeFromDraft(
    recipeDraft,
    followUpAnswers,
    transcriptSegments.length,
  );

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FINALIZE_MODEL ?? "gpt-5.5",
      response_format: { type: "json_object" },
      messages: [
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
      ],
    }),
  });

  if (!openAiResponse.ok) {
    return jsonError(
      502,
      "Living recipe finalization failed.",
      await readOpenAiError(openAiResponse),
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

  const livingRecipeResult = livingRecipeSchema.safeParse(modelJson);

  if (!livingRecipeResult.success) {
    return validationError(
      "LivingRecipe failed schema validation.",
      formatZodIssues(livingRecipeResult.error),
    );
  }

  const guardrailErrors = validateFinalizedLivingRecipe(
    livingRecipeResult.data,
    recipeDraft,
    fallbackLivingRecipe,
    followUpAnswers,
  );

  if (guardrailErrors.length > 0) {
    return validationError("LivingRecipe failed finalization validation.", guardrailErrors);
  }

  return NextResponse.json({
    livingRecipe: livingRecipeResult.data,
    validation: { ok: true },
  });
}

function normalizeFollowUpAnswers(
  followUpAnswers: Record<string, FollowUpAnswer> | FollowUpAnswer[],
) {
  if (!Array.isArray(followUpAnswers)) {
    return followUpAnswers;
  }

  return Object.fromEntries(followUpAnswers.map((answer) => [answer.questionId, answer]));
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

Use the fallbackLivingRecipe as the structural base. You may rewrite the final step instruction text to naturally incorporate safe user-provided answers, but keep the same step ids, order, ingredients, sensory cues, and provenance links.

Important:
- Return a LivingRecipe object, not a RecipeDraft.
- Preserve all transcript-backed details from recipeDraft.
- Preserve all step provenance links exactly from recipeDraft.
- Put user-provided answer evidence in resolvedQuestions.
- Do not treat user answers as transcript evidence.
- Never replace a step instruction with a follow-up question.
- If a user answer is ambiguous, leave the step instruction mostly unchanged and include a small user-provided note in that resolvedQuestions answer.
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

function validationError(message: string, details: ValidationDetail[]) {
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
