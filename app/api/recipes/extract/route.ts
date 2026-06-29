import { NextResponse } from "next/server";
import { z } from "zod";

import { RECIPE_EXTRACTION_SYSTEM_PROMPT } from "@/src/lib/ai/prompts/recipe-extraction";
import {
  recipeDraftSchema,
  transcriptSegmentSchema,
  validateRecipeDraftAgainstTranscript,
} from "@/src/lib/recipe/schemas";

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
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
    return jsonError(400, "Request body must be valid JSON.");
  }

  const requestResult = requestSchema.safeParse(payload);

  if (!requestResult.success) {
    return validationError("Invalid recipe extraction request.", formatZodIssues(requestResult.error));
  }

  const { transcriptSegments } = requestResult.data;
  const captureIds = new Set(transcriptSegments.map((segment) => segment.captureId));

  if (captureIds.size !== 1) {
    return validationError("Transcript segments must belong to one capture.", [
      {
        path: "transcriptSegments",
        message: "All transcript segments must share the same captureId.",
      },
    ]);
  }

  const captureId = transcriptSegments[0].captureId;
  const createdAt = new Date().toISOString();

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
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

  const draftResult = recipeDraftSchema.safeParse(modelJson);

  if (!draftResult.success) {
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
