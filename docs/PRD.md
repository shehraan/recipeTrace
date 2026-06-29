# RecipeTrace PRD

## Product summary

RecipeTrace is a voice-to-living-recipe prototype that turns messy family cooking memories into structured, cookable recipes while preserving uncertainty and source evidence.

The product is not a generic recipe generator. The core product bet is that family cooking knowledge is often tacit: people say things like "cook it until it smells right," "add enough water so it loosens," or "you'll know when the onions get glossy." RecipeTrace captures those details, separates facts from inference, asks follow-up questions, and links every generated recipe step back to the original transcript.

## Why this exists

Most family recipes are not fully written down. They live in memory, repetition, sensory judgment, and apprenticeship. When someone tries to document them after the fact, the result usually loses the exact cues that made the dish work.

RecipeTrace exists to preserve:

- ingredients and quantities
- sequence and timing
- sensory cues: look, smell, sound, texture, temperature
- cultural or family context
- uncertainty and missing details
- source evidence for each generated instruction

## Target users

### 1. The family knowledge keeper

Usually a parent, grandparent, aunt, uncle, or older sibling who knows how to cook a family dish but may not have a written recipe.

Needs:

- a low-friction way to speak naturally
- no pressure to produce a polished recipe
- confidence that the system will not erase nuance

### 2. The learner

Usually a child, grandchild, or younger family member trying to recreate a dish.

Needs:

- clear steps
- sensory guidance
- follow-up questions to ask the expert
- source snippets to understand the original wording

### 3. The family archivist

Someone collecting recipes, memories, and family food traditions.

Needs:

- context, not just instructions
- a repeatable capture workflow
- a shareable final artifact

## Problem statement

Unstructured family cooking memories contain useful cooking knowledge, but standard recipe formats flatten them into clean instructions and often hallucinate missing precision. Users need a system that converts voice memories into structured recipes without pretending uncertain details are known.

## MVP goal

Build an end-to-end prototype where a user can:

1. Record or upload a cooking memory.
2. See the transcript segmented into source chunks.
3. Extract a structured recipe draft.
4. See ingredients, steps, sensory cues, uncertainties, and missing details.
5. Answer follow-up questions.
6. Generate a final living recipe.
7. Click a generated recipe step and see the original transcript segment that supports it.

## Non-goals

The MVP will not include:

- user accounts
- payments
- collaboration
- mobile-native app
- nutrition calculation
- shopping lists
- perfect culinary accuracy
- support for every cuisine and recipe format
- long-term family recipe library

## Core product principles

### Preserve uncertainty

The system should say "unknown" or "ask the cook" instead of inventing false precision.

### Preserve tacit knowledge

The product should capture sensory and procedural cues, not just ingredients and steps.

### Preserve provenance

Every generated recipe step should link to transcript evidence.

### Optimize for one magical flow

The MVP should make one seeded demo feel excellent instead of supporting many weak flows.

## User stories

### Capture

As a user, I can record or upload a voice memory about a dish so that I do not need to write a recipe manually.

### Transcript review

As a user, I can see the transcript broken into readable segments so that I can understand what the system heard.

### Recipe extraction

As a user, I can convert the transcript into ingredients, steps, sensory cues, missing details, and follow-up questions.

### Source-backed recipe

As a user, I can click a recipe step and see the original transcript segment that supports it.

### Follow-up questions

As a learner, I can see the most important missing details to ask the family cook.

### Living recipe

As a user, I can generate a final recipe that combines the original memory, known details, answered follow-ups, and unresolved uncertainty.

## MVP feature set

### Must-have

- seeded demo capture
- audio upload or browser recording
- transcript view
- transcript segmentation
- structured extraction using a validated schema
- ingredients list
- step list
- sensory cue list
- missing detail list
- follow-up question generation
- provenance links from recipe steps to transcript segments
- final living recipe view
- basic loading and error states

### Should-have

- answer follow-up questions inline
- compare original draft vs final living recipe
- export/copy markdown recipe
- API failure fallback using seeded data

### Nice-to-have

- timestamp-level audio playback
- multi-memory comparison
- confidence scores
- dish timeline
- image upload for dish photos

## Success criteria

The prototype is successful if:

- A reviewer understands the product in under 60 seconds.
- The seeded demo works end-to-end without manual setup.
- The extracted recipe preserves vague/tacit details instead of over-normalizing them.
- Every generated step has at least one source segment.
- The product visibly distinguishes confirmed information from inferred or missing information.
- The README explains the technical decisions and tradeoffs clearly.

## Demo path

Use a seeded family dish transcript with natural ambiguity.

Example flow:

1. Open homepage.
2. Click "Try seeded demo."
3. Show the messy transcript.
4. Click "Extract living recipe."
5. Show recipe draft with:
   - ingredients
   - steps
   - sensory cues
   - missing details
   - follow-up questions
6. Click a recipe step.
7. Evidence panel highlights the original transcript segment.
8. Answer one follow-up question.
9. Generate final living recipe.
10. Copy/export the recipe.

## Data requirements

The seeded transcript should include:

- incomplete quantities
- sensory cues
- family context
- at least one ambiguous step
- at least one cooking order detail
- at least one inferred but uncertain detail
- enough material for 5-8 recipe steps

## Key risks

### Risk: AI hallucinates exact quantities

Mitigation:

- strict prompt rules
- schema fields for `is_inferred`, `confidence`, and `missing_details`
- eval checks for vague quantity preservation

### Risk: Prototype feels like a basic wrapper

Mitigation:

- make provenance the hero feature
- add evals
- add typed schemas
- show transcript-to-recipe traceability

### Risk: Audio transcription fails during demo

Mitigation:

- seeded demo mode
- fallback transcript fixtures
- graceful error states

### Risk: Too many features, not enough polish

Mitigation:

- ship one strong flow
- cut accounts, collaboration, mobile polish, and advanced exports
