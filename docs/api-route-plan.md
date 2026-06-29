# API Route Plan

## Route Philosophy

Keep routes small and stage-based. Each route returns typed JSON that the UI can render immediately.

All extraction outputs must pass Zod validation before returning to the client.

## Routes

### `GET /api/demo`

Loads the complete seeded demo.

Returns:

```ts
{
  capture: Capture;
  transcriptSegments: TranscriptSegment[];
  recipeDraft: RecipeDraft;
  livingRecipe?: LivingRecipe;
}
```

Use this for the guaranteed demo path.

### `POST /api/captures`

Creates a capture from one of:

- `demo`
- pasted transcript
- uploaded audio metadata

Request:

```ts
{
  sourceType: "demo" | "paste" | "audio";
  title?: string;
  transcriptText?: string;
}
```

Returns:

```ts
{
  capture: Capture;
  transcriptSegments?: TranscriptSegment[];
}
```

For `demo`, this can redirect internally to fixture data. For `paste`, segment immediately.

### `POST /api/captures/:captureId/transcribe`

Transcribes uploaded or recorded audio.

Request:

```ts
{
  audioUrl?: string;
  fileName?: string;
}
```

Returns:

```ts
{
  captureId: string;
  transcriptSegments: TranscriptSegment[];
}
```

Failure behavior:

- return a clear error
- do not fabricate transcript text for user audio
- keep seeded demo available in the UI

### `POST /api/captures/:captureId/extract`

Extracts and validates a `RecipeDraft`.

Request:

```ts
{
  transcriptSegments: TranscriptSegment[];
  useDemoFallback?: boolean;
}
```

Returns:

```ts
{
  recipeDraft: RecipeDraft;
  validation: {
    ok: true;
  };
}
```

Failure behavior:

- attempt one repair if live AI returns invalid JSON
- if still invalid, return validation errors
- only use seeded fallback when `capture.sourceType === "demo"`

### `POST /api/captures/:captureId/followups`

Stores follow-up answers.

Request:

```ts
{
  answers: FollowUpAnswer[];
}
```

Returns:

```ts
{
  answers: FollowUpAnswer[];
}
```

For local-only prototype state, this can simply echo validated answers.

### `POST /api/captures/:captureId/finalize`

Creates the final living recipe.

Request:

```ts
{
  recipeDraft: RecipeDraft;
  answers: FollowUpAnswer[];
}
```

Returns:

```ts
{
  livingRecipe: LivingRecipe;
}
```

Prototype recommendation:

- deterministic merge first
- optional LLM polish only after core flow works

### `POST /api/validate-draft`

Developer/demo helper route.

Request:

```ts
{
  transcriptSegments: TranscriptSegment[];
  recipeDraft: unknown;
}
```

Returns:

```ts
{
  ok: boolean;
  errors: string[];
}
```

This is useful while building fixtures and can be hidden from UI.

## Shared Server Utilities

Recommended modules:

- `src/lib/schema/recipe.ts`
- `src/lib/transcript/segment.ts`
- `src/lib/ai/transcribe.ts`
- `src/lib/ai/extract-recipe.ts`
- `src/lib/ai/repair-extraction.ts`
- `src/lib/recipe/finalize.ts`
- `src/lib/provenance/validate.ts`
- `src/lib/demo/*`

## Environment Variables

Use optional provider configuration:

```txt
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The app must run the seeded demo without any provider keys.

## API Acceptance Checks

- `GET /api/demo` returns valid `RecipeDraft`
- extraction rejects missing step provenance
- extraction rejects invalid cue types
- finalization preserves unresolved questions
- provider failure does not break seeded demo
