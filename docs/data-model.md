# Data Model

## Core Types

Use these as the shared contract for Zod schemas, fixtures, API responses, and UI rendering.

```ts
export type Confidence = "low" | "medium" | "high";

export type CueType =
  | "look"
  | "smell"
  | "sound"
  | "texture"
  | "timing"
  | "temperature";

export type CaptureStatus =
  | "created"
  | "transcribed"
  | "extracted"
  | "finalized"
  | "failed";

export type TranscriptSegment = {
  id: string;
  captureId: string;
  orderIndex: number;
  speaker?: string;
  text: string;
  startMs?: number;
  endMs?: number;
};

export type ProvenanceLink = {
  transcriptSegmentId: string;
  quote: string;
  reason: string;
};

export type SensoryCue = {
  id: string;
  type: CueType;
  cue: string;
  interpretation?: string;
  provenance: ProvenanceLink[];
};

export type Ingredient = {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  preparation?: string;
  optional: boolean;
  isInferred: boolean;
  confidence: Confidence;
  provenance: ProvenanceLink[];
};

export type RecipeStep = {
  id: string;
  orderIndex: number;
  instruction: string;
  timing?: string;
  temperature?: string;
  sensoryCueIds: string[];
  isInferred: boolean;
  confidence: Confidence;
  provenance: ProvenanceLink[];
};

export type MissingDetail = {
  id: string;
  label: string;
  whyItMatters: string;
  target:
    | "ingredient"
    | "step"
    | "timing"
    | "temperature"
    | "texture"
    | "serving"
    | "context";
  severity: "low" | "medium" | "high";
  relatedStepIds?: string[];
  relatedIngredientIds?: string[];
};

export type FollowUpQuestion = {
  id: string;
  question: string;
  whyItMatters: string;
  target: MissingDetail["target"];
  priority: "low" | "medium" | "high";
  relatedMissingDetailIds: string[];
};

export type FollowUpAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
};

export type RecipeDraft = {
  id: string;
  captureId: string;
  dishName: string;
  familyContext?: string;
  summary?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sensoryCues: SensoryCue[];
  missingDetails: MissingDetail[];
  followUpQuestions: FollowUpQuestion[];
  createdAt: string;
};

export type LivingRecipe = {
  id: string;
  captureId: string;
  title: string;
  summary: string;
  familyContext?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sensoryCues: SensoryCue[];
  resolvedDetails: {
    questionId: string;
    answer: string;
    appliedTo?: string[];
  }[];
  unresolvedQuestions: FollowUpQuestion[];
  sourceSummary: {
    transcriptSegmentCount: number;
    supportedStepCount: number;
    inferredStepCount: number;
  };
  createdAt: string;
};
```

## Zod Validation Rules

Minimum validation:

- `RecipeDraft.dishName` is required
- seeded demo has at least 5 steps
- every `RecipeStep.provenance` has at least one link
- every provenance link references an existing transcript segment
- every `SensoryCue.type` is one of the six cue types
- every inferred ingredient or step has `isInferred: true`
- no exact quantity should appear unless transcript provenance supports it
- follow-up questions must connect to at least one missing detail

## Database Tables

For the narrow prototype, the JSON fields can hold validated payloads. Normalize transcript segments because provenance depends on stable segment IDs.

### `captures`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid/text | Primary key |
| `title` | text | Dish/session title |
| `source_type` | text | `demo`, `audio`, `upload`, `paste` |
| `audio_url` | text nullable | Supabase storage URL if used |
| `status` | text | CaptureStatus |
| `error_message` | text nullable | For failed live paths |
| `created_at` | timestamp | Server-generated |
| `updated_at` | timestamp | Server-generated |

### `transcript_segments`

| Column | Type | Notes |
|---|---|---|
| `id` | text | Stable segment ID such as `seg_001` |
| `capture_id` | uuid/text | Parent capture |
| `order_index` | integer | Transcript order |
| `speaker` | text nullable | Optional |
| `text` | text | Segment text |
| `start_ms` | integer nullable | Optional |
| `end_ms` | integer nullable | Optional |

### `recipe_drafts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid/text | Primary key |
| `capture_id` | uuid/text | Parent capture |
| `json` | jsonb | Validated `RecipeDraft` |
| `created_at` | timestamp | Server-generated |

### `follow_up_answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid/text | Primary key |
| `capture_id` | uuid/text | Parent capture |
| `question_id` | text | Generated question ID |
| `answer` | text | User answer |
| `created_at` | timestamp | Server-generated |

### `living_recipes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid/text | Primary key |
| `capture_id` | uuid/text | Parent capture |
| `json` | jsonb | Validated `LivingRecipe` |
| `markdown` | text nullable | Optional export text |
| `created_at` | timestamp | Server-generated |

## Fixture Files

Commit these before wiring providers:

- `src/lib/demo/transcript.ts`
- `src/lib/demo/recipe-draft.ts`
- `src/lib/demo/follow-up-answers.ts`
- `src/lib/demo/living-recipe.ts`

The demo fixtures should pass the exact same Zod schemas as live extraction.
