import { NextResponse } from "next/server";
import { z } from "zod";

import { RECIPE_EXTRACTION_SYSTEM_PROMPT } from "@/src/lib/ai/prompts/recipe-extraction";
import {
  recipeDraftSchema,
  transcriptSegmentSchema,
  type TranscriptSegmentInput,
  validateRecipeDraftAgainstTranscript,
} from "@/src/lib/recipe/schemas";
import type { Confidence, QuestionTarget } from "@/src/lib/recipe/types";

const requestSchema = z
  .object({
    transcriptSegments: z.array(transcriptSegmentSchema).min(1),
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

export async function POST(request: Request) {
  logExtract("route hit");
  const apiKey = process.env.OPENAI_API_KEY;
  logExtract("OPENAI key exists", Boolean(apiKey));

  if (!apiKey) {
    logExtract("returning before OpenAI fetch", "missing OPENAI_API_KEY");
    return jsonError(
      500,
      "OpenAI API key is not configured.",
      "Set OPENAI_API_KEY to enable recipe extraction.",
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    logExtract("returning before OpenAI fetch", "invalid JSON body");
    return jsonError(400, "Request body must be valid JSON.");
  }

  logExtract("body keys", objectKeys(payload));

  const requestResult = requestSchema.safeParse(payload);

  if (!requestResult.success) {
    logExtract("returning before OpenAI fetch", {
      reason: "invalid extraction request",
      errors: formatZodIssues(requestResult.error),
    });
    return validationError("Invalid recipe extraction request.", formatZodIssues(requestResult.error));
  }

  const { transcriptSegments } = requestResult.data;
  logExtract("transcript segment count", transcriptSegments.length);
  const captureIds = new Set(transcriptSegments.map((segment) => segment.captureId));

  if (captureIds.size !== 1) {
    logExtract("returning before OpenAI fetch", "segments span multiple capture IDs");
    return validationError("Transcript segments must belong to one capture.", [
      {
        path: "transcriptSegments",
        message: "All transcript segments must share the same captureId.",
      },
    ]);
  }

  const captureId = transcriptSegments[0].captureId;
  const createdAt = new Date().toISOString();

  logExtract("before OpenAI fetch");
  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: RECIPE_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildExtractionUserPrompt({
            captureId,
            createdAt,
            transcriptSegments,
          }),
        },
      ],
    }),
  });
  logExtract("OpenAI status", openAiResponse.status);

  if (!openAiResponse.ok) {
    return jsonError(
      502,
      "Recipe extraction failed.",
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
  logExtract("raw model content", content);

  if (!content) {
    return validationError("OpenAI returned an empty recipe extraction response.", [
      { path: "choices.0.message.content", message: "Expected a JSON object string." },
    ]);
  }

  let modelJson: unknown;

  try {
    modelJson = JSON.parse(content);
  } catch {
    return validationError("OpenAI returned invalid JSON.", [
      { path: "recipeDraft", message: "Response content could not be parsed as JSON." },
    ]);
  }

  logExtract("raw model top-level keys", objectKeys(modelJson));

  const normalizedModelJson = normalizeExtractedRecipeDraft(modelJson, transcriptSegments, captureId);
  logExtract("normalized top-level keys", objectKeys(normalizedModelJson));

  const draftResult = recipeDraftSchema.safeParse(normalizedModelJson);

  if (!draftResult.success) {
    logExtract("validation failed", formatZodIssues(draftResult.error));
    return validationError("RecipeDraft failed schema validation.", formatZodIssues(draftResult.error));
  }

  if (draftResult.data.captureId !== captureId) {
    return validationError("RecipeDraft captureId does not match transcript segments.", [
      {
        path: "captureId",
        message: `Expected captureId "${captureId}" but received "${draftResult.data.captureId}".`,
      },
    ]);
  }

  const provenanceErrors = validateRecipeDraftAgainstTranscript(draftResult.data, transcriptSegments);

  if (provenanceErrors.length > 0) {
    return validationError(
      "RecipeDraft failed provenance validation.",
      provenanceErrors.map((message) => ({ path: "recipeDraft", message })),
    );
  }

  return NextResponse.json({
    recipeDraft: draftResult.data,
    validation: { ok: true },
  });
}

function buildExtractionUserPrompt({
  captureId,
  createdAt,
  transcriptSegments,
}: {
  captureId: string;
  createdAt: string;
  transcriptSegments: z.infer<typeof transcriptSegmentSchema>[];
}) {
  return `Convert the following transcript segments into a validated RecipeDraft JSON object.

Use these exact top-level fields:
- id
- captureId
- dishName
- familyContext
- summary
- ingredients
- steps
- sensoryCues
- openQuestions
- createdAt

Use captureId: ${JSON.stringify(captureId)}
Use createdAt: ${JSON.stringify(createdAt)}

Every ingredient, sensory cue, and recipe step must include at least one provenance link. Every provenance transcriptSegmentId must match one of the provided transcript segment ids. If no source segment supports a recipe step, omit that step.

Transcript segments:
${JSON.stringify(transcriptSegments, null, 2)}

Return only one strict JSON object matching the RecipeDraft schema. Do not wrap it in markdown or add explanatory text.`;
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

function normalizeExtractedRecipeDraft(
  raw: unknown,
  transcriptSegments: TranscriptSegmentInput[],
  captureId: string,
): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const transcriptSegmentsById = new Map(transcriptSegments.map((segment) => [segment.id, segment]));
  const ingredients = arrayFrom(firstKnown(raw, ["ingredients"])).map((ingredient, index) =>
    normalizeIngredient(ingredient, index, transcriptSegmentsById),
  );
  const sensoryCues = arrayFrom(firstKnown(raw, ["sensoryCues", "sensory_cues"])).map(
    (cue, index) => normalizeSensoryCue(cue, index, transcriptSegmentsById),
  );
  const cueIdList = sensoryCues
    .map((cue) => asNonEmptyString(cue.id))
    .filter((cueId): cueId is string => Boolean(cueId));
  const cueIds = new Set(cueIdList);
  const steps = arrayFrom(firstKnown(raw, ["steps"])).map((step, index) =>
    normalizeStep(step, index, transcriptSegmentsById, cueIds),
  );
  const openQuestionCandidates = arrayFrom(
    firstKnown(raw, [
      "openQuestions",
      "open_questions",
      "followUpQuestions",
      "follow_up_questions",
      "missingDetails",
      "missing_details",
    ]),
  );
  const openQuestions = openQuestionCandidates.map((question, index) =>
    normalizeOpenQuestion(question, index, {
      cueIds: cueIdList,
      ingredientIds: ingredients
        .map((ingredient) => asNonEmptyString(ingredient.id))
        .filter((ingredientId): ingredientId is string => Boolean(ingredientId)),
      stepIds: steps
        .map((step) => asNonEmptyString(step.id))
        .filter((stepId): stepId is string => Boolean(stepId)),
    }),
  );

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? `draft_${captureId}`,
    captureId: asNonEmptyString(raw.captureId) ?? captureId,
    dishName: firstString(raw, ["dishName", "dish_name", "title"]),
    ingredients,
    steps,
    sensoryCues,
    openQuestions,
    createdAt: firstString(raw, ["createdAt", "created_at"]),
  };

  addOptionalString(next, "familyContext", firstString(raw, [
    "familyContext",
    "family_context",
    "culturalOrFamilyContext",
    "cultural_or_family_context",
    "context",
  ]));
  addOptionalString(next, "summary", firstString(raw, ["summary"]));

  return next;
}

function normalizeIngredient(
  value: unknown,
  index: number,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
) {
  const raw = isRecord(value) ? value : {};
  const quantity = asQuantityString(raw.quantity) ?? "unspecified";
  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("ing", index),
    name: firstString(raw, ["name", "ingredient"]),
    quantity,
    optional: typeof raw.optional === "boolean" ? raw.optional : false,
    isInferred: readBooleanAlias(raw, ["isInferred", "inferred"]) ?? false,
    confidence: normalizeConfidence(raw.confidence),
    provenance: normalizeProvenance(
      firstKnown(raw, [
        "provenance",
        "provenanceLinks",
        "provenance_links",
        "transcriptSegmentIds",
        "transcript_segment_ids",
      ]),
      transcriptSegmentsById,
    ),
  };

  addOptionalString(next, "unit", asNonEmptyString(raw.unit));
  addOptionalString(next, "preparation", asNonEmptyString(raw.preparation));

  return next;
}

function normalizeStep(
  value: unknown,
  index: number,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
  cueIds: Set<string>,
) {
  const raw = isRecord(value) ? value : {};
  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("step", index),
    orderIndex: normalizeOrderIndex(raw.orderIndex, raw.order, index),
    instruction: firstString(raw, ["instruction", "text", "description"]),
    sensoryCueIds: arrayFrom(raw.sensoryCueIds)
      .map(asNonEmptyString)
      .filter((cueId): cueId is string => Boolean(cueId && cueIds.has(cueId))),
    isInferred: readBooleanAlias(raw, ["isInferred", "inferred"]) ?? false,
    confidence: normalizeConfidence(raw.confidence),
    provenance: normalizeProvenance(
      firstKnown(raw, [
        "provenance",
        "provenanceLinks",
        "provenance_links",
        "transcriptSegmentIds",
        "transcript_segment_ids",
      ]),
      transcriptSegmentsById,
    ),
  };

  addOptionalString(next, "timing", asNonEmptyString(raw.timing));
  addOptionalString(next, "temperature", asNonEmptyString(raw.temperature));

  return next;
}

function normalizeSensoryCue(
  value: unknown,
  index: number,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
) {
  const raw = isRecord(value) ? value : {};
  const cue = typeof value === "string" ? value : firstString(raw, ["cue", "text", "description"]);
  const cueText = asNonEmptyString(cue);
  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("cue", index),
    type: normalizeCueType(raw.type, cueText ?? ""),
    cue: cueText,
    provenance: normalizeProvenance(
      firstKnown(raw, [
        "provenance",
        "provenanceLinks",
        "provenance_links",
        "transcriptSegmentIds",
        "transcript_segment_ids",
      ]),
      transcriptSegmentsById,
    ),
  };

  addOptionalString(next, "interpretation", asNonEmptyString(raw.interpretation));

  return next;
}

function normalizeOpenQuestion(
  value: unknown,
  index: number,
  relatedIds: {
    cueIds: string[];
    ingredientIds: string[];
    stepIds: string[];
  },
) {
  const raw = isRecord(value) ? value : {};
  const question = typeof value === "string" ? value : firstString(raw, ["question", "text"]);
  const target = normalizeQuestionTarget(firstKnown(raw, ["target", "targetField", "target_field"]), question);
  const relatedIngredientIds = filterKnownIds(raw.relatedIngredientIds, relatedIds.ingredientIds);
  const relatedStepIds = filterKnownIds(raw.relatedStepIds, relatedIds.stepIds);
  const relatedCueIds = filterKnownIds(raw.relatedCueIds, relatedIds.cueIds);
  addDefaultQuestionRelation(target, { relatedCueIds, relatedIngredientIds, relatedStepIds }, relatedIds);

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("q", index),
    question: asNonEmptyString(question),
    whyItMatters:
      firstString(raw, ["whyItMatters", "why_it_matters", "reason"]) ?? defaultWhyItMatters(target),
    target,
    priority: normalizeConfidence(raw.priority),
  };

  if (relatedStepIds.length > 0) {
    next.relatedStepIds = relatedStepIds;
  }

  if (relatedIngredientIds.length > 0) {
    next.relatedIngredientIds = relatedIngredientIds;
  }

  if (relatedCueIds.length > 0) {
    next.relatedCueIds = relatedCueIds;
  }

  return next;
}

function normalizeProvenance(
  value: unknown,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
) {
  return arrayFrom(value)
    .map((link) => normalizeProvenanceLink(link, transcriptSegmentsById))
    .filter((link): link is { transcriptSegmentId: string; quote: string; reason: string } =>
      Boolean(link),
    );
}

function normalizeProvenanceLink(
  value: unknown,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
) {
  if (typeof value === "string") {
    const segment = transcriptSegmentsById.get(value);

    if (!segment) {
      return null;
    }

    return {
      transcriptSegmentId: segment.id,
      quote: segment.text,
      reason: "Supports this extracted recipe detail.",
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const transcriptSegmentId = firstString(value, [
    "transcriptSegmentId",
    "transcript_segment_id",
    "segmentId",
    "segment_id",
    "id",
  ]);

  if (!transcriptSegmentId) {
    return null;
  }

  const segment = transcriptSegmentsById.get(transcriptSegmentId);

  if (!segment) {
    return null;
  }

  return {
    transcriptSegmentId,
    quote: firstString(value, ["quote", "sourceQuote", "source_quote", "text"]) ?? segment.text,
    reason: firstString(value, ["reason", "rationale"]) ?? "Supports this extracted recipe detail.",
  };
}

function normalizeOrderIndex(orderIndex: unknown, order: unknown, fallbackIndex: number) {
  if (typeof orderIndex === "number" && Number.isInteger(orderIndex) && orderIndex >= 0) {
    return orderIndex;
  }

  if (typeof order === "number" && Number.isInteger(order)) {
    return order > 0 ? order - 1 : order;
  }

  return fallbackIndex;
}

function normalizeConfidence(value: unknown): Confidence {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function normalizeCueType(value: unknown, cue: string) {
  if (
    value === "look" ||
    value === "smell" ||
    value === "sound" ||
    value === "texture" ||
    value === "timing" ||
    value === "temperature"
  ) {
    return value;
  }

  const text = cue.toLowerCase();

  if (/\b(smell|aroma|fragrant|scent)\b/.test(text)) {
    return "smell";
  }

  if (/\b(sound|sizzle|crackle|hiss|pop|hear)\b/.test(text)) {
    return "sound";
  }

  if (/\b(temperature|hot|warm|cold|heat|low flame|medium flame|high flame)\b/.test(text)) {
    return "temperature";
  }

  if (/\b(time|timing|minute|hour|until|after|before|simmer)\b/.test(text)) {
    return "timing";
  }

  if (/\b(texture|tender|soft|crisp|crunch|thick|thin|coated)\b/.test(text)) {
    return "texture";
  }

  return "look";
}

function normalizeQuestionTarget(value: unknown, question: unknown): QuestionTarget {
  if (
    value === "ingredient" ||
    value === "step" ||
    value === "timing" ||
    value === "temperature" ||
    value === "texture" ||
    value === "serving" ||
    value === "context"
  ) {
    return value;
  }

  const text = typeof question === "string" ? question.toLowerCase() : "";

  if (/\b(ingredient|quantity|amount|how much|cup|spoon|teaspoon|tablespoon)\b/.test(text)) {
    return "ingredient";
  }

  if (/\b(how long|when|time|timing|minute|hour)\b/.test(text)) {
    return "timing";
  }

  if (/\b(temperature|heat|hot|flame|stove)\b/.test(text)) {
    return "temperature";
  }

  if (/\b(texture|tender|soft|crisp|crunch|thick|thin|glossy)\b/.test(text)) {
    return "texture";
  }

  if (/\b(serve|serving|plate|with rice|garnish)\b/.test(text)) {
    return "serving";
  }

  if (/\b(family|story|who|where|occasion|context)\b/.test(text)) {
    return "context";
  }

  return "step";
}

function defaultWhyItMatters(target: QuestionTarget) {
  switch (target) {
    case "ingredient":
      return "Clarifies the ingredient or amount needed before cooking.";
    case "timing":
      return "Clarifies when to move to the next step.";
    case "temperature":
      return "Clarifies the heat level needed for the step.";
    case "texture":
      return "Clarifies the sensory target for doneness or texture.";
    case "serving":
      return "Clarifies how the finished dish should be served.";
    case "context":
      return "Clarifies family context that should be preserved.";
    case "step":
      return "Clarifies a missing step detail needed to cook reliably.";
  }
}

function addDefaultQuestionRelation(
  target: QuestionTarget,
  relation: {
    relatedCueIds: string[];
    relatedIngredientIds: string[];
    relatedStepIds: string[];
  },
  availableIds: {
    cueIds: string[];
    ingredientIds: string[];
    stepIds: string[];
  },
) {
  if (
    relation.relatedCueIds.length > 0 ||
    relation.relatedIngredientIds.length > 0 ||
    relation.relatedStepIds.length > 0
  ) {
    return;
  }

  if (target === "ingredient" && availableIds.ingredientIds[0]) {
    relation.relatedIngredientIds.push(availableIds.ingredientIds[0]);
    return;
  }

  if (target === "texture" && availableIds.cueIds[0]) {
    relation.relatedCueIds.push(availableIds.cueIds[0]);
    return;
  }

  if (availableIds.stepIds[0]) {
    relation.relatedStepIds.push(availableIds.stepIds[0]);
  }
}

function filterKnownIds(value: unknown, knownIds: string[]) {
  const knownIdSet = new Set(knownIds);

  return arrayFrom(value)
    .map(asNonEmptyString)
    .filter((id): id is string => Boolean(id && knownIdSet.has(id)));
}

function firstKnown(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) {
      return value[key];
    }
  }

  return undefined;
}

function firstString(value: Record<string, unknown>, keys: string[]) {
  return asNonEmptyString(firstKnown(value, keys));
}

function readBooleanAlias(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof value[key] === "boolean") {
      return value[key];
    }
  }

  return undefined;
}

function addOptionalString(target: Record<string, unknown>, key: string, value: string | undefined) {
  if (value) {
    target[key] = value;
  }
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asQuantityString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return asNonEmptyString(value);
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stableNumberedId(prefix: string, index: number) {
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function objectKeys(value: unknown) {
  return isRecord(value) ? Object.keys(value) : [];
}

function logExtract(message: string, value?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (value === undefined) {
    console.log(`[extract] ${message}`);
    return;
  }

  console.log(`[extract] ${message}`, value);
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
