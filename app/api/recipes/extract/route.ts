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

type NormalizationWarning = {
  path: string;
  message: string;
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

  const normalizationResult = normalizeExtractedRecipeDraft(modelJson, transcriptSegments, captureId);
  const normalizedModelJson = normalizationResult.value;
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
    validation: { ok: true, warnings: normalizationResult.warnings },
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
): { value: unknown; warnings: NormalizationWarning[] } {
  const warnings: NormalizationWarning[] = [];

  if (!isRecord(raw)) {
    return { value: raw, warnings };
  }

  const transcriptSegmentsById = new Map(transcriptSegments.map((segment) => [segment.id, segment]));
  const ingredients = arrayFrom(firstKnown(raw, ["ingredients"]), "ingredients", warnings).map(
    (ingredient, index) =>
      normalizeIngredient(ingredient, index, transcriptSegmentsById, `ingredients.${index}`, warnings),
  );
  const sensoryCues = arrayFrom(
    firstKnown(raw, ["sensoryCues", "sensory_cues"]),
    "sensoryCues",
    warnings,
  ).map(
    (cue, index) =>
      normalizeSensoryCue(cue, index, transcriptSegmentsById, `sensoryCues.${index}`, warnings),
  );
  const cueIdList = sensoryCues
    .map((cue) => asNonEmptyString(cue.id))
    .filter((cueId): cueId is string => Boolean(cueId));
  const cueIds = new Set(cueIdList);
  const steps = arrayFrom(firstKnown(raw, ["steps"]), "steps", warnings).map((step, index) =>
    normalizeStep(step, index, transcriptSegmentsById, cueIds, `steps.${index}`, warnings),
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
    "openQuestions",
    warnings,
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
    }, `openQuestions.${index}`, warnings),
  );

  if (!asNonEmptyString(raw.id)) {
    addWarning(warnings, "id", `Filled missing draft id with draft_${captureId}.`);
  }

  if (!asNonEmptyString(raw.captureId)) {
    addWarning(warnings, "captureId", `Filled missing captureId with ${captureId}.`);
  }

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

  return { value: next, warnings };
}

function normalizeIngredient(
  value: unknown,
  index: number,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
  path: string,
  warnings: NormalizationWarning[],
) {
  const raw = isRecord(value) ? value : {};
  if (!isRecord(value)) {
    addWarning(warnings, path, "Expected ingredient object; normalized from an empty object.");
  }

  if (!asNonEmptyString(raw.id)) {
    addWarning(warnings, `${path}.id`, "Filled missing ingredient id.");
  }

  const quantity = asQuantityString(raw.quantity) ?? "unspecified";
  if (!asQuantityString(raw.quantity)) {
    addWarning(warnings, `${path}.quantity`, 'Defaulted missing ingredient quantity to "unspecified".');
  }

  if (typeof raw.optional !== "boolean") {
    addWarning(warnings, `${path}.optional`, "Defaulted missing ingredient optional flag to false.");
  }

  if (readBooleanAlias(raw, ["isInferred", "inferred"]) === undefined) {
    addWarning(warnings, `${path}.isInferred`, "Defaulted missing ingredient inference flag to false.");
  }

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("ing", index),
    name: firstString(raw, ["name", "ingredient"]),
    quantity,
    optional: typeof raw.optional === "boolean" ? raw.optional : false,
    isInferred: readBooleanAlias(raw, ["isInferred", "inferred"]) ?? false,
    confidence: normalizeConfidence(raw.confidence, `${path}.confidence`, warnings),
    provenance: normalizeProvenance(
      firstKnown(raw, [
        "provenance",
        "provenanceLinks",
        "provenance_links",
        "transcriptSegmentIds",
        "transcript_segment_ids",
      ]),
      transcriptSegmentsById,
      `${path}.provenance`,
      warnings,
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
  path: string,
  warnings: NormalizationWarning[],
) {
  const raw = isRecord(value) ? value : {};
  if (!isRecord(value)) {
    addWarning(warnings, path, "Expected step object; normalized from an empty object.");
  }

  if (!asNonEmptyString(raw.id)) {
    addWarning(warnings, `${path}.id`, "Filled missing step id.");
  }

  if (readBooleanAlias(raw, ["isInferred", "inferred"]) === undefined) {
    addWarning(warnings, `${path}.isInferred`, "Defaulted missing step inference flag to false.");
  }

  const sensoryCueIds = arrayFrom(raw.sensoryCueIds, `${path}.sensoryCueIds`, warnings)
    .map(asNonEmptyString)
    .filter((cueId): cueId is string => Boolean(cueId && cueIds.has(cueId)));
  warnForDroppedIds(raw.sensoryCueIds, sensoryCueIds, `${path}.sensoryCueIds`, warnings);

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("step", index),
    orderIndex: normalizeOrderIndex(raw.orderIndex, raw.order, index, `${path}.orderIndex`, warnings),
    instruction: firstString(raw, ["instruction", "text", "description"]),
    sensoryCueIds,
    isInferred: readBooleanAlias(raw, ["isInferred", "inferred"]) ?? false,
    confidence: normalizeConfidence(raw.confidence, `${path}.confidence`, warnings),
    provenance: normalizeProvenance(
      firstKnown(raw, [
        "provenance",
        "provenanceLinks",
        "provenance_links",
        "transcriptSegmentIds",
        "transcript_segment_ids",
      ]),
      transcriptSegmentsById,
      `${path}.provenance`,
      warnings,
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
  path: string,
  warnings: NormalizationWarning[],
) {
  const raw = isRecord(value) ? value : {};
  if (!isRecord(value) && typeof value !== "string") {
    addWarning(warnings, path, "Expected sensory cue object or string; normalized from an empty object.");
  }

  const cue = typeof value === "string" ? value : firstString(raw, ["cue", "text", "description"]);
  const cueText = asNonEmptyString(cue);
  if (!asNonEmptyString(raw.id)) {
    addWarning(warnings, `${path}.id`, "Filled missing sensory cue id.");
  }

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("cue", index),
    type: normalizeCueType(raw.type, cueText ?? "", `${path}.type`, warnings),
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
      `${path}.provenance`,
      warnings,
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
  path: string,
  warnings: NormalizationWarning[],
) {
  const raw = isRecord(value) ? value : {};
  if (!isRecord(value) && typeof value !== "string") {
    addWarning(warnings, path, "Expected open question object or string; normalized from an empty object.");
  }

  const question = typeof value === "string" ? value : firstString(raw, ["question", "text"]);
  const target = normalizeQuestionTarget(
    firstKnown(raw, ["target", "targetField", "target_field"]),
    question,
    `${path}.target`,
    warnings,
  );
  const relatedIngredientIds = filterKnownIds(
    raw.relatedIngredientIds,
    relatedIds.ingredientIds,
    `${path}.relatedIngredientIds`,
    warnings,
  );
  const relatedStepIds = filterKnownIds(
    raw.relatedStepIds,
    relatedIds.stepIds,
    `${path}.relatedStepIds`,
    warnings,
  );
  const relatedCueIds = filterKnownIds(raw.relatedCueIds, relatedIds.cueIds, `${path}.relatedCueIds`, warnings);
  addDefaultQuestionRelation(target, { relatedCueIds, relatedIngredientIds, relatedStepIds }, relatedIds, path, warnings);

  if (!asNonEmptyString(raw.id)) {
    addWarning(warnings, `${path}.id`, "Filled missing open question id.");
  }

  const next: Record<string, unknown> = {
    id: asNonEmptyString(raw.id) ?? stableNumberedId("q", index),
    question: asNonEmptyString(question),
    whyItMatters:
      firstString(raw, ["whyItMatters", "why_it_matters", "reason"]) ?? defaultWhyItMatters(target),
    target,
    priority: normalizeConfidence(raw.priority, `${path}.priority`, warnings),
  };

  if (!firstString(raw, ["whyItMatters", "why_it_matters", "reason"])) {
    addWarning(warnings, `${path}.whyItMatters`, "Defaulted missing whyItMatters text.");
  }

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
  path: string,
  warnings: NormalizationWarning[],
) {
  return arrayFrom(value, path, warnings)
    .map((link, index) => normalizeProvenanceLink(link, transcriptSegmentsById, `${path}.${index}`, warnings))
    .filter((link): link is { transcriptSegmentId: string; quote: string; reason: string } =>
      Boolean(link),
    );
}

function normalizeProvenanceLink(
  value: unknown,
  transcriptSegmentsById: Map<string, TranscriptSegmentInput>,
  path: string,
  warnings: NormalizationWarning[],
) {
  if (typeof value === "string") {
    const segment = transcriptSegmentsById.get(value);

    if (!segment) {
      return null;
    }

    addWarning(warnings, path, "Expanded string provenance segment id into a full provenance link.");
    return {
      transcriptSegmentId: segment.id,
      quote: segment.text,
      reason: "Supports this extracted recipe detail.",
    };
  }

  if (!isRecord(value)) {
    addWarning(warnings, path, "Dropped invalid provenance link.");
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
    addWarning(warnings, `${path}.transcriptSegmentId`, "Dropped provenance link without transcript segment id.");
    return null;
  }

  const segment = transcriptSegmentsById.get(transcriptSegmentId);

  if (!segment) {
    addWarning(warnings, `${path}.transcriptSegmentId`, `Dropped provenance link for unknown segment ${transcriptSegmentId}.`);
    return null;
  }

  if (!firstString(value, ["quote", "sourceQuote", "source_quote", "text"])) {
    addWarning(warnings, `${path}.quote`, "Filled missing provenance quote with full transcript segment text.");
  }

  if (!firstString(value, ["reason", "rationale"])) {
    addWarning(warnings, `${path}.reason`, "Filled missing provenance reason with a generic support reason.");
  }

  return {
    transcriptSegmentId,
    quote: firstString(value, ["quote", "sourceQuote", "source_quote", "text"]) ?? segment.text,
    reason: firstString(value, ["reason", "rationale"]) ?? "Supports this extracted recipe detail.",
  };
}

function normalizeOrderIndex(
  orderIndex: unknown,
  order: unknown,
  fallbackIndex: number,
  path: string,
  warnings: NormalizationWarning[],
) {
  if (typeof orderIndex === "number" && Number.isInteger(orderIndex) && orderIndex >= 0) {
    return orderIndex;
  }

  if (typeof order === "number" && Number.isInteger(order)) {
    addWarning(warnings, path, "Normalized one-based order field into zero-based orderIndex.");
    return order > 0 ? order - 1 : order;
  }

  addWarning(warnings, path, "Defaulted missing step orderIndex from array position.");
  return fallbackIndex;
}

function normalizeConfidence(
  value: unknown,
  path: string,
  warnings: NormalizationWarning[],
): Confidence {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  addWarning(warnings, path, 'Defaulted missing or invalid confidence/priority to "medium".');
  return "medium";
}

function normalizeCueType(
  value: unknown,
  cue: string,
  path: string,
  warnings: NormalizationWarning[],
) {
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
    addWarning(warnings, path, 'Inferred sensory cue type "smell" from cue text.');
    return "smell";
  }

  if (/\b(sound|sizzle|crackle|hiss|pop|hear)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred sensory cue type "sound" from cue text.');
    return "sound";
  }

  if (/\b(temperature|hot|warm|cold|heat|low flame|medium flame|high flame)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred sensory cue type "temperature" from cue text.');
    return "temperature";
  }

  if (/\b(time|timing|minute|hour|until|after|before|simmer)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred sensory cue type "timing" from cue text.');
    return "timing";
  }

  if (/\b(texture|tender|soft|crisp|crunch|thick|thin|coated)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred sensory cue type "texture" from cue text.');
    return "texture";
  }

  addWarning(warnings, path, 'Defaulted missing or invalid sensory cue type to "look".');
  return "look";
}

function normalizeQuestionTarget(
  value: unknown,
  question: unknown,
  path: string,
  warnings: NormalizationWarning[],
): QuestionTarget {
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
    addWarning(warnings, path, 'Inferred question target "ingredient" from question text.');
    return "ingredient";
  }

  if (/\b(how long|when|time|timing|minute|hour)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred question target "timing" from question text.');
    return "timing";
  }

  if (/\b(temperature|heat|hot|flame|stove)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred question target "temperature" from question text.');
    return "temperature";
  }

  if (/\b(texture|tender|soft|crisp|crunch|thick|thin|glossy)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred question target "texture" from question text.');
    return "texture";
  }

  if (/\b(serve|serving|plate|with rice|garnish)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred question target "serving" from question text.');
    return "serving";
  }

  if (/\b(family|story|who|where|occasion|context)\b/.test(text)) {
    addWarning(warnings, path, 'Inferred question target "context" from question text.');
    return "context";
  }

  addWarning(warnings, path, 'Defaulted missing or invalid question target to "step".');
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
  path: string,
  warnings: NormalizationWarning[],
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
    addWarning(warnings, `${path}.relatedIngredientIds`, "Defaulted missing question relation to the first ingredient.");
    return;
  }

  if (target === "texture" && availableIds.cueIds[0]) {
    relation.relatedCueIds.push(availableIds.cueIds[0]);
    addWarning(warnings, `${path}.relatedCueIds`, "Defaulted missing question relation to the first sensory cue.");
    return;
  }

  if (availableIds.stepIds[0]) {
    relation.relatedStepIds.push(availableIds.stepIds[0]);
    addWarning(warnings, `${path}.relatedStepIds`, "Defaulted missing question relation to the first step.");
  }
}

function filterKnownIds(
  value: unknown,
  knownIds: string[],
  path: string,
  warnings: NormalizationWarning[],
) {
  const knownIdSet = new Set(knownIds);

  const ids = arrayFrom(value, path, warnings)
    .map(asNonEmptyString)
    .filter((id): id is string => Boolean(id && knownIdSet.has(id)));

  warnForDroppedIds(value, ids, path, warnings);
  return ids;
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

function arrayFrom(value: unknown, path: string, warnings: NormalizationWarning[]) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value !== undefined && value !== null) {
    addWarning(warnings, path, "Expected an array; normalized to an empty array.");
  }

  return [];
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

function warnForDroppedIds(
  sourceValue: unknown,
  keptIds: string[],
  path: string,
  warnings: NormalizationWarning[],
) {
  if (!Array.isArray(sourceValue)) {
    return;
  }

  const sourceIds = sourceValue.map(asNonEmptyString).filter((id): id is string => Boolean(id));
  const keptIdSet = new Set(keptIds);
  const droppedIds = sourceIds.filter((id) => !keptIdSet.has(id));

  if (droppedIds.length > 0) {
    addWarning(warnings, path, `Dropped unknown relation ids: ${droppedIds.join(", ")}.`);
  }
}

function addWarning(warnings: NormalizationWarning[], path: string, message: string) {
  warnings.push({ path, message });
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
