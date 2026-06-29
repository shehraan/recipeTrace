# RecipeTrace Architecture

## Overview

RecipeTrace is a full-stack web prototype with a narrow AI pipeline:

```mermaid
flowchart LR
  A[Audio recording/upload] --> B[Transcription]
  B --> C[Transcript segmentation]
  C --> D[Structured recipe extraction]
  D --> E[Zod validation]
  E --> F[Recipe draft]
  F --> G[Follow-up questions]
  G --> H[Living recipe]
  H --> I[Provenance viewer]
```

The important architectural idea is that the LLM is not trusted as a black box. It produces structured JSON that is validated, normalized, and displayed with source evidence.

## Recommended stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zod
- Supabase or Postgres
- Prisma or Drizzle
- OpenAI/Deepgram/Whisper for transcription
- OpenAI structured outputs or JSON-mode extraction
- Vercel deployment

## System components

### Web client

Responsible for:

- audio recording/upload
- seeded demo entry point
- transcript review
- recipe draft rendering
- follow-up question UI
- provenance interaction
- final recipe view

Important client states:

- selected transcript segment
- selected recipe step
- extraction status
- follow-up answers
- active view: capture, transcript, draft, final

### API routes

Recommended routes:

| Route | Method | Purpose |
|---|---:|---|
| `/api/captures` | POST | Create a capture session |
| `/api/captures/:id/transcribe` | POST | Transcribe uploaded audio |
| `/api/captures/:id/extract` | POST | Extract structured recipe from transcript |
| `/api/captures/:id/followups` | POST | Save follow-up answers |
| `/api/captures/:id/finalize` | POST | Generate final living recipe |
| `/api/demo` | GET | Load seeded demo data |

### Database

A database is optional for the first prototype, but using one gives better engineering signal. If speed matters, start with in-memory or JSON fixtures and add persistence later.

Recommended tables:

#### `captures`

| Field | Type | Notes |
|---|---|---|
| `id` | string | primary key |
| `title` | string | dish or session title |
| `audio_url` | string nullable | source audio |
| `status` | enum | `created`, `transcribed`, `extracted`, `finalized`, `failed` |
| `created_at` | datetime | created time |

#### `transcript_segments`

| Field | Type | Notes |
|---|---|---|
| `id` | string | stable segment ID |
| `capture_id` | string | parent capture |
| `speaker` | string nullable | optional speaker |
| `text` | string | transcript text |
| `start_ms` | number nullable | audio start |
| `end_ms` | number nullable | audio end |
| `order_index` | number | transcript order |

#### `recipe_drafts`

| Field | Type | Notes |
|---|---|---|
| `id` | string | primary key |
| `capture_id` | string | parent capture |
| `json` | json | validated draft |
| `created_at` | datetime | created time |

#### `follow_up_answers`

| Field | Type | Notes |
|---|---|---|
| `id` | string | primary key |
| `capture_id` | string | parent capture |
| `question_id` | string | generated question |
| `answer` | string | user answer |

#### `living_recipes`

| Field | Type | Notes |
|---|---|---|
| `id` | string | primary key |
| `capture_id` | string | parent capture |
| `json` | json | finalized recipe |
| `markdown` | string | exportable recipe |

## Core TypeScript model

```ts
export type TranscriptSegment = {
  id: string;
  speaker?: string;
  text: string;
  startMs?: number;
  endMs?: number;
  orderIndex: number;
};

export type ProvenanceLink = {
  transcriptSegmentId: string;
  quote: string;
  reason: string;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity?: string;
  preparation?: string;
  isInferred: boolean;
  confidence: "low" | "medium" | "high";
  provenance: ProvenanceLink[];
};

export type RecipeStep = {
  id: string;
  orderIndex: number;
  instruction: string;
  sensoryCues: string[];
  timing?: string;
  temperature?: string;
  isInferred: boolean;
  confidence: "low" | "medium" | "high";
  provenance: ProvenanceLink[];
};

export type OpenQuestion = {
  id: string;
  question: string;
  whyItMatters: string;
  targetField: "ingredient" | "step" | "timing" | "temperature" | "texture" | "serving" | "context";
  priority: "low" | "medium" | "high";
};

export type RecipeDraft = {
  dishName: string;
  familyContext?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sensoryCues: string[];
  missingDetails: string[];
  followUpQuestions: OpenQuestion[];
};
```

## AI pipeline architecture

The AI pipeline should be split into small steps instead of one large generation call.

### Step 1: Transcribe

Input:

- audio file

Output:

- raw transcript
- optional word or segment timestamps

### Step 2: Segment

Input:

- raw transcript

Output:

- stable transcript segments

Why:

- source evidence needs stable IDs
- the UI can highlight source segments
- evals can check provenance coverage

### Step 3: Extract

Input:

- transcript segments

Output:

- structured recipe draft JSON

Important:

- strict schema validation
- no fabricated quantities
- required provenance links

### Step 4: Repair or reject

If the output fails schema validation:

- attempt one repair call
- otherwise fall back to seeded demo or show a clear error

### Step 5: Ask follow-up questions

Input:

- recipe draft
- missing details

Output:

- prioritized questions

### Step 6: Finalize

Input:

- recipe draft
- follow-up answers
- unresolved missing details

Output:

- final living recipe
- unresolved uncertainty preserved

## Provenance design

Provenance is the main trust feature.

Each generated recipe step should include:

- source transcript segment IDs
- short source quote
- explanation of why that segment supports the step

UI behavior:

- clicking a recipe step highlights relevant transcript segment(s)
- evidence panel shows original quote
- if timestamps exist, the user can play that audio range
- if timestamps do not exist, show text-only evidence

## Failure modes

### Transcription failure

Fallback:

- allow paste transcript
- allow seeded demo

### AI extraction returns invalid JSON

Fallback:

- repair once
- show validation error
- allow seeded demo

### Missing provenance

Fallback:

- reject the step or mark it as unsupported
- never silently show unsupported generated instructions

### API latency

Fallback:

- optimistic loading states
- progress text explaining current stage
- seeded demo path for reliable walkthrough

## Deployment

Recommended fast deployment:

- Vercel for app
- Supabase for Postgres and file storage
- environment variables for AI providers
- seeded demo data committed to repo

## Observability

Add simple console or analytics events:

- `capture_created`
- `audio_uploaded`
- `transcription_completed`
- `extraction_started`
- `extraction_validated`
- `recipe_step_selected`
- `followup_answered`
- `living_recipe_finalized`

## Security and privacy

The MVP should avoid overclaiming privacy. At minimum:

- do not expose API keys to the client
- avoid storing audio longer than needed
- make seeded demo data clearly fake or permission-safe
- document that this is a prototype, not a production privacy system
