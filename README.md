# RecipeTrace

Turn messy family cooking memories into structured, source-backed **living recipes** - without flattening tacit knowledge into fake precision.

Built in ~12 hours as a full-stack prototype. Not a recipe generator. A provenance-first extraction system for knowledge that usually lives in voice, gesture, and smell.

## What I built

RecipeTrace takes unstructured cooking memory (spoken, pasted, or seeded demo) and produces a validated `RecipeDraft`: ingredients, steps, sensory cues, missing details, and targeted follow-up questions. Every extracted claim links back to transcript segments you can inspect in the UI.

The demo walks through **Nani's Chicken Curry** - a family memory with vague quantities ("just enough water"), sensory cues ("until the raw smell goes away"), and deliberate gaps. You can also paste your own memory and run live extraction against OpenAI.

Stack: **Next.js 16** (App Router), **TypeScript**, **Tailwind**, **Zod**. No database. Client state + API routes.

## Why this is technically interesting

Most recipe AI optimizes for completeness. RecipeTrace optimizes for **trustworthiness under ambiguity**.

The hard problem isn't generating steps - it's preserving *tacit* cooking knowledge ("not too dark", "you'll hear it stop spluttering") while refusing to invent quantities the speaker never gave. That requires:

1. **Segment-level provenance** - the model sees numbered transcript spans, not one blob. Every step must cite real segment IDs.
2. **Schema enforcement after generation** - Zod validates structure; a second pass checks provenance integrity against the actual transcript.
3. **Uncertainty as a first-class output** - vague quantities stay vague, inferred steps are flagged, contradictions surface as follow-up questions instead of silent resolution.
4. **Evals that test behavior, not vibes** - a lightweight TypeScript suite checks provenance preservation, vague-quantity handling, and finalization invariants across clear, messy, and contradictory fixtures.

The product bet: a shorter, visibly source-backed recipe with explicit gaps beats a polished recipe that hallucinated half the measurements.

## AI pipeline

```
Memory (demo / paste / audio*) -> Transcript segments -> Extract RecipeDraft
  -> Zod + provenance validation -> [repair once if invalid]
  -> Follow-up answers -> Finalize LivingRecipe
```

| Stage | What happens |
|-------|----------------|
| **Segmentation** | Transcript split into stable `seg_001`, `seg_002`, ... spans with speaker and optional timestamps. |
| **Extraction** | `POST /api/recipes/extract` - system prompt forbids fabrication; requires provenance on every step, ingredient, and sensory cue. |
| **Validation** | `recipeDraftSchema` (Zod) + `validateRecipeDraftAgainstTranscript` - segment IDs must exist; exact quantities must appear in provenance quotes. |
| **Repair** | One retry with validation errors + original segments if the first pass fails. |
| **Follow-ups** | Model-generated questions targeting missing quantities, doneness cues, heat, timing - not "can you give more details?" |
| **Finalization** | `POST /api/recipes/finalize` - merges draft + user answers; preserves transcript-backed provenance; labels user-provided details separately. |

\* Audio capture types exist; transcription route not wired in this sprint. Paste and seeded demo are the shipped paths.

See [`docs/AI_PIPELINE.md`](./docs/AI_PIPELINE.md) for prompt templates and schema detail.

## Provenance / trust layer

Trust isn't a disclaimer - it's in the data model.

```ts
type ProvenanceLink = {
  transcriptSegmentId: string;
  quote: string;
  reason: string;
};
```

Every `RecipeStep` and `Ingredient` carries `provenance[]`. Steps also carry `isInferred` and `confidence`. Sensory cues are typed (`look`, `smell`, `sound`, `texture`, `timing`, `temperature`).

**In the UI:** click any step or ingredient -> evidence drawer opens with source quotes, support reasons, and highlighted transcript segments. No scroll-hunt.

**On the server:** provenance links are normalized from multiple model output shapes, then validated against the segment set. Finalization checks that transcript-backed provenance from the draft survives into the living recipe - user answers must not be mislabeled as transcript evidence.

**In evals:** checks for step provenance, vague quantity preservation, contradiction handling, and answer/incorporation invariants. Run static fixtures without an API key; run `--live` against local routes with `OPENAI_API_KEY` set.

## Tradeoffs (12-hour scope)

| Shipped | Deferred |
|---------|----------|
| Seeded demo works **offline** - no API keys required | Audio record/upload + transcription |
| Full 4-step demo UI with evidence drawer | Timestamp playback in provenance view |
| Live extraction + finalization via OpenAI | Database / persistence / accounts |
| Zod validation + single repair attempt | Export (markdown, print) |
| Paste-your-own-memory path | Multi-memory comparison |
| Local fallback living recipe (no API) | Production privacy / auth |

**Deliberate product cuts:** no recipe library, collaboration, nutrition, shopping lists, or image generation. Coarse but trustworthy beats polished but invented.

**Architecture cuts:** no Postgres/Supabase - fixtures and React context hold state. Evals use `jiti`, not Jest/Vitest, to keep the loop fast and readable.

## How to run

**Prerequisites:** Node 20+, [pnpm](https://pnpm.io/)

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Seeded demo** - works immediately, no env vars.

**Live extraction / finalization** - create `.env.local`:

```bash
OPENAI_API_KEY=sk-...
# optional overrides
OPENAI_MODEL=gpt-5.4-mini
OPENAI_FINALIZE_MODEL=gpt-5.4-mini
```

Then paste a memory at `/demo/extract` or hit "Generate living recipe" on the living recipe step.

**Evals:**

```bash
pnpm evals                    # static fixtures, no server
pnpm dev                      # in another terminal
pnpm evals -- --live          # hits /api/recipes/extract + /finalize
```

See [`evals/README.md`](./evals/README.md) for fixture details.

## Demo flow

1. **Transcript** (`/demo/transcript`) - Review 10 numbered segments from Nani's Chicken Curry. Each segment ID is the anchor for later provenance.
2. **Draft** (`/demo/draft`) - Inspect extracted ingredients, steps, sensory cues, and confidence. Click any step -> evidence drawer shows transcript quotes.
3. **Follow-ups** (`/demo/followups`) - Answer targeted questions (quantities, heat, timing). Unanswered questions stay visible.
4. **Living recipe** (`/demo/living`) - See the merged result with source summary (segment count, supported vs inferred steps). Optionally call the finalize API to incorporate answers with AI assistance.

**Alternate path:** Landing -> "Paste your own memory" -> extract -> same draft -> follow-ups -> living recipe flow.

Target: a reviewer understands the product in under 60 seconds by clicking one step and seeing *why* the app believes it.

## What I'd build next

1. **Audio capture -> transcription** - browser record + upload, segment with timestamps, highlight playback in the evidence drawer.
2. **Persistent captures** - store transcript + draft + living recipe versions; basic auth for family sharing.
3. **Contradiction UX** - when two relatives disagree ("garlic first" vs "onion first"), show both accounts with provenance instead of picking a winner.
4. **Export** - markdown/PDF living recipe with inline source footnotes.
5. **Eval expansion** - regression suite in CI, golden-file snapshots per model version, latency/cost tracking per pipeline stage.

---

**Docs:** [`docs/AI_PIPELINE.md`](./docs/AI_PIPELINE.md) - [`docs/BUILD_BRIEF.md`](./docs/BUILD_BRIEF.md) - [`evals/README.md`](./evals/README.md)
