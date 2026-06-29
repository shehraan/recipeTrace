# 8-Hour Build Sequence

This sequence assumes the goal is a polished demoable slice, not broad infrastructure.

## Hour 0-1: Contracts and Fixtures

Ship:

- shared Zod schemas for transcript, provenance, recipe draft, follow-up answers, and living recipe
- seeded transcript with 8-12 segments
- seeded `RecipeDraft` that validates
- seeded living recipe or deterministic finalizer input

Acceptance:

- `pnpm test` or a small validation script proves fixtures pass schemas
- every seeded recipe step has at least one provenance link

## Hour 1-2: Demo API and App State

Ship:

- `GET /api/demo`
- `POST /api/captures`
- app state for capture, transcript, draft, answers, final recipe
- `Try Demo` button wired end-to-end

Acceptance:

- clicking `Try Demo` populates transcript and recipe draft without external APIs

## Hour 2-3.5: Core UI Layout

Ship:

- capture workspace
- transcript panel
- recipe draft panel
- provenance panel
- responsive layout for desktop and usable mobile stacking

Acceptance:

- user can see transcript and recipe side by side
- clicking a step highlights evidence
- uncertainty and inferred labels are visually obvious

## Hour 3.5-4.5: Sensory Cues and Missing Details

Ship:

- sensory cues grouped by look, smell, sound, texture, timing, temperature
- missing detail list
- follow-up question list
- answer input for at least one question

Acceptance:

- sensory cues are not buried inside step text
- unanswered details remain visible

## Hour 4.5-5.5: Final Living Recipe

Ship:

- `POST /api/captures/:captureId/finalize`
- deterministic finalizer that merges draft plus answers
- final living recipe page or view
- unresolved questions section
- source summary

Acceptance:

- answering a follow-up changes the final recipe
- unresolved uncertainty is preserved, not hidden

## Hour 5.5-6.5: Audio/Paste Capture

Ship:

- browser recording or upload control
- paste transcript fallback
- segmentation for pasted transcript
- transcription route stub or live provider if quick

Acceptance:

- non-demo path can at least accept pasted transcript and show segments
- audio UI exists even if live provider is unavailable
- failures guide user to paste/demo path

## Hour 6.5-7.25: Live AI Extraction

Ship:

- OpenAI structured extraction route
- one repair attempt on validation failure
- provenance validation after schema validation
- graceful fallback/error copy

Acceptance:

- live extraction works when `OPENAI_API_KEY` is configured
- invalid AI output does not render as trusted recipe
- seeded demo remains stable with no key

## Hour 7.25-8: Polish and Demo Hardening

Ship:

- loading states for transcribe, extract, finalize
- empty and error states
- README demo instructions
- final pass on copy and visual hierarchy
- deployment sanity check

Acceptance:

- fresh clone can run seeded demo
- live API failure is not embarrassing
- reviewer can follow the provenance story in under one minute

## If Time Slips

Cut in this order:

1. live transcription
2. database persistence
3. LLM-based finalization
4. audio timestamp playback
5. export/copy markdown

Do not cut:

- seeded demo
- Zod validation
- provenance links
- sensory cue grouping
- uncertainty/follow-up questions

## One-Sentence Build Strategy

Build the trustworthy seeded demo first, then hang live audio and AI routes off the same schemas so the impressive path and the real path share the same spine.
