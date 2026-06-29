import { z } from "zod";

import {
  captureStatusValues,
  confidenceValues,
  type RecipeDraft,
  type TranscriptSegment,
} from "./types";

const idSchema = z.string().min(1);
const isoDateStringSchema = z.string().datetime();
const optionalNonEmptyStringSchema = z.string().min(1).optional();

export const captureSourceSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("demo"),
      fixtureId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("paste"),
      transcriptText: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("audio"),
      audioUrl: optionalNonEmptyStringSchema,
      fileName: optionalNonEmptyStringSchema,
      mimeType: optionalNonEmptyStringSchema,
    })
    .strict(),
]);

export const captureSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    status: z.enum(captureStatusValues),
    source: captureSourceSchema,
    errorMessage: optionalNonEmptyStringSchema,
    createdAt: isoDateStringSchema,
    updatedAt: isoDateStringSchema,
  })
  .strict();

export const transcriptSegmentSchema = z
  .object({
    id: idSchema,
    captureId: idSchema,
    orderIndex: z.number().int().nonnegative(),
    speaker: optionalNonEmptyStringSchema,
    text: z.string().min(1),
    startMs: z.number().int().nonnegative().optional(),
    endMs: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine(
    (segment) =>
      segment.startMs === undefined ||
      segment.endMs === undefined ||
      segment.endMs >= segment.startMs,
    {
      message: "endMs must be greater than or equal to startMs",
      path: ["endMs"],
    },
  );

export const provenanceLinkSchema = z
  .object({
    transcriptSegmentId: idSchema,
    quote: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const ingredientSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    quantity: optionalNonEmptyStringSchema,
    unit: optionalNonEmptyStringSchema,
    preparation: optionalNonEmptyStringSchema,
    optional: z.boolean(),
    isInferred: z.boolean(),
    confidence: z.enum(confidenceValues),
    provenance: z.array(provenanceLinkSchema).min(1),
  })
  .strict();

const sensoryCueBaseSchema = {
  id: idSchema,
  cue: z.string().min(1),
  interpretation: optionalNonEmptyStringSchema,
  provenance: z.array(provenanceLinkSchema).min(1),
};

export const sensoryCueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("look"), ...sensoryCueBaseSchema }).strict(),
  z.object({ type: z.literal("smell"), ...sensoryCueBaseSchema }).strict(),
  z.object({ type: z.literal("sound"), ...sensoryCueBaseSchema }).strict(),
  z.object({ type: z.literal("texture"), ...sensoryCueBaseSchema }).strict(),
  z.object({ type: z.literal("timing"), ...sensoryCueBaseSchema }).strict(),
  z.object({ type: z.literal("temperature"), ...sensoryCueBaseSchema }).strict(),
]);

export const recipeStepSchema = z
  .object({
    id: idSchema,
    orderIndex: z.number().int().nonnegative(),
    instruction: z.string().min(1),
    timing: optionalNonEmptyStringSchema,
    temperature: optionalNonEmptyStringSchema,
    sensoryCueIds: z.array(idSchema),
    isInferred: z.boolean(),
    confidence: z.enum(confidenceValues),
    provenance: z.array(provenanceLinkSchema).min(1),
  })
  .strict();

const openQuestionBaseSchema = {
  id: idSchema,
  question: z.string().min(1),
  whyItMatters: z.string().min(1),
  priority: z.enum(confidenceValues),
  relatedStepIds: z.array(idSchema).optional(),
  relatedIngredientIds: z.array(idSchema).optional(),
  relatedCueIds: z.array(idSchema).optional(),
};

export const openQuestionSchema = z
  .discriminatedUnion("target", [
    z.object({ target: z.literal("ingredient"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("step"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("timing"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("temperature"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("texture"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("serving"), ...openQuestionBaseSchema }).strict(),
    z.object({ target: z.literal("context"), ...openQuestionBaseSchema }).strict(),
  ])
  .refine(
    (question) =>
      Boolean(
        question.relatedStepIds?.length ||
          question.relatedIngredientIds?.length ||
          question.relatedCueIds?.length,
      ),
    {
      message: "Open questions must point to at least one related step, ingredient, or cue",
    },
  );

export const followUpAnswerSchema = z
  .object({
    questionId: idSchema,
    answer: z.string().min(1),
    answeredAt: isoDateStringSchema,
  })
  .strict();

export const recipeDraftSchema = z
  .object({
    id: idSchema,
    captureId: idSchema,
    dishName: z.string().min(1),
    familyContext: optionalNonEmptyStringSchema,
    summary: optionalNonEmptyStringSchema,
    ingredients: z.array(ingredientSchema).min(1),
    steps: z.array(recipeStepSchema).min(1),
    sensoryCues: z.array(sensoryCueSchema),
    openQuestions: z.array(openQuestionSchema),
    createdAt: isoDateStringSchema,
  })
  .strict();

export const livingRecipeSchema = z
  .object({
    id: idSchema,
    captureId: idSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    familyContext: optionalNonEmptyStringSchema,
    ingredients: z.array(ingredientSchema).min(1),
    steps: z.array(recipeStepSchema).min(1),
    sensoryCues: z.array(sensoryCueSchema),
    resolvedQuestions: z.array(
      z
        .object({
          questionId: idSchema,
          answer: z.string().min(1),
          appliedToStepIds: z.array(idSchema).optional(),
          appliedToIngredientIds: z.array(idSchema).optional(),
        })
        .strict(),
    ),
    unresolvedQuestions: z.array(openQuestionSchema),
    sourceSummary: z
      .object({
        transcriptSegmentCount: z.number().int().nonnegative(),
        supportedStepCount: z.number().int().nonnegative(),
        inferredStepCount: z.number().int().nonnegative(),
      })
      .strict(),
    createdAt: isoDateStringSchema,
  })
  .strict();

export const recipeExtractionPayloadSchema = z
  .object({
    transcriptSegments: z.array(transcriptSegmentSchema).min(1),
    recipeDraft: recipeDraftSchema,
  })
  .strict();

export function validateRecipeDraftAgainstTranscript(
  draft: RecipeDraft,
  transcriptSegments: TranscriptSegment[],
) {
  const errors: string[] = [];
  const segmentIds = new Set(transcriptSegments.map((segment) => segment.id));
  const ingredientIds = new Set(draft.ingredients.map((ingredient) => ingredient.id));
  const stepIds = new Set(draft.steps.map((step) => step.id));
  const cueIds = new Set(draft.sensoryCues.map((cue) => cue.id));

  const checkProvenance = (owner: string, provenance: { transcriptSegmentId: string }[]) => {
    if (provenance.length === 0) {
      errors.push(`${owner} has no provenance`);
    }

    for (const link of provenance) {
      if (!segmentIds.has(link.transcriptSegmentId)) {
        errors.push(`${owner} references missing transcript segment ${link.transcriptSegmentId}`);
      }
    }
  };

  for (const ingredient of draft.ingredients) {
    checkProvenance(`Ingredient ${ingredient.id}`, ingredient.provenance);
    if (ingredient.quantity && hasUnsupportedExactQuantity(ingredient.quantity, ingredient.provenance)) {
      errors.push(`${ingredient.id} has an exact quantity that is not present in its provenance quote`);
    }
  }

  for (const cue of draft.sensoryCues) {
    checkProvenance(`Sensory cue ${cue.id}`, cue.provenance);
  }

  for (const step of draft.steps) {
    checkProvenance(`Recipe step ${step.id}`, step.provenance);

    for (const cueId of step.sensoryCueIds) {
      if (!cueIds.has(cueId)) {
        errors.push(`${step.id} references missing sensory cue ${cueId}`);
      }
    }
  }

  for (const question of draft.openQuestions) {
    for (const ingredientId of question.relatedIngredientIds ?? []) {
      if (!ingredientIds.has(ingredientId)) {
        errors.push(`${question.id} references missing ingredient ${ingredientId}`);
      }
    }

    for (const stepId of question.relatedStepIds ?? []) {
      if (!stepIds.has(stepId)) {
        errors.push(`${question.id} references missing step ${stepId}`);
      }
    }

    for (const cueId of question.relatedCueIds ?? []) {
      if (!cueIds.has(cueId)) {
        errors.push(`${question.id} references missing sensory cue ${cueId}`);
      }
    }
  }

  return errors;
}

export function parseRecipeDraftForTranscript(
  value: unknown,
  transcriptSegments: TranscriptSegment[],
) {
  const draft = recipeDraftSchema.parse(value);
  const provenanceErrors = validateRecipeDraftAgainstTranscript(draft, transcriptSegments);

  if (provenanceErrors.length > 0) {
    throw new Error(`RecipeDraft failed provenance validation: ${provenanceErrors.join("; ")}`);
  }

  return draft;
}

function hasUnsupportedExactQuantity(
  quantity: string,
  provenance: { quote: string }[],
) {
  const exactNumbers = quantity.match(/\b\d+(?:\.\d+)?\b/g);

  if (!exactNumbers) {
    return false;
  }

  const provenanceText = provenance.map((link) => link.quote.toLowerCase()).join(" ");
  return exactNumbers.some((number) => !provenanceText.includes(number));
}

export type CaptureInput = z.infer<typeof captureSchema>;
export type TranscriptSegmentInput = z.infer<typeof transcriptSegmentSchema>;
export type RecipeDraftInput = z.infer<typeof recipeDraftSchema>;
export type LivingRecipeInput = z.infer<typeof livingRecipeSchema>;
