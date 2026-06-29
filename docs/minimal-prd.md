# Minimal PRD

## Product

RecipeTrace turns a messy spoken family cooking memory into a structured, trustworthy living recipe. It preserves what matters in oral cooking knowledge: sensory cues, vague measurements, uncertainty, family context, and evidence from the original transcript.

This prototype is not a generic recipe generator. It should feel like an extraction and preservation tool, not a content spinner.

## Primary User

A family member trying to preserve or recreate a dish from someone else's memory.

They need:

- a low-friction way to capture messy voice input
- a clear transcript they can inspect
- a structured recipe that does not invent false precision
- follow-up questions they can ask the original cook
- visible links from generated recipe instructions back to the transcript

## MVP Promise

Given a recorded, uploaded, pasted, or seeded cooking memory, the app produces:

- transcript segments
- ingredients
- ordered steps
- sensory cues across look, smell, sound, texture, timing, and temperature
- missing details
- follow-up questions
- a final living recipe
- provenance links from every recipe step to transcript spans

## Hero Demo Flow

1. User lands directly on the capture workspace.
2. User clicks `Try Demo` or records/uploads audio.
3. App shows a messy transcript split into numbered segments.
4. User clicks `Extract`.
5. App shows a recipe draft with:
   - ingredients
   - steps
   - sensory cues
   - missing details
   - follow-up questions
6. User clicks a recipe step.
7. Transcript evidence highlights the supporting segment and quote.
8. User answers one follow-up question.
9. User clicks `Create Living Recipe`.
10. App shows the final recipe with unresolved uncertainty preserved.

## Must Ship

- Seeded demo path that works without live APIs
- Audio upload or browser recording
- Transcript display with stable segment IDs
- Zod-validated `RecipeDraft` JSON
- Sensory cue extraction by cue type
- Uncertainty and missing detail detection
- Follow-up question generation
- Final living recipe page
- Provenance map from generated steps to transcript spans
- Polished loading, empty, and error states for the main flow

## Cut Scope

- Accounts
- Recipe library
- Collaboration
- Nutrition
- Shopping lists
- Image generation
- Timestamp audio playback
- Multi-recipe comparison
- Complex editing history
- Production privacy controls beyond basic API key safety

## Demo Quality Bar

The prototype succeeds if a reviewer can understand the core idea in under one minute and verify that each generated step is source-backed.

The seeded demo must include:

- 8-12 transcript segments
- a named family dish
- vague quantities
- sensory cues in at least four cue categories
- at least three missing details
- at least three useful follow-up questions
- 5-7 generated recipe steps
- provenance on every step

## Product Principles

- Preserve uncertainty over inventing precision.
- Preserve tacit sensory knowledge as first-class recipe data.
- Make provenance visible, clickable, and central.
- Prefer one excellent flow over many shallow features.
