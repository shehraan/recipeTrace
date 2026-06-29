# RecipeTrace Tradeoffs

## Core tradeoff

RecipeTrace intentionally chooses source-backed, uncertainty-preserving extraction over polished but unsupported recipe generation.

A normal AI recipe app tries to produce a complete recipe. RecipeTrace tries to produce a trustworthy one.

That means the system should sometimes say:

```txt
Quantity unspecified. Ask the cook.
```

instead of pretending it knows:

```txt
Use 2 teaspoons.
```

## What is optimized

The prototype optimizes for:

- one excellent seeded demo flow
- visible technical judgment
- typed AI outputs
- schema validation
- provenance links
- sensory cue extraction
- useful follow-up questions
- clear product story

## What is intentionally not optimized

The prototype does not optimize for:

- supporting every recipe type
- perfect transcription
- full account system
- advanced recipe management
- collaboration
- native mobile
- beautiful long-term archive
- nutrition/shopping features

## Build vs. buy

### Transcription

Decision:

- use an existing transcription API

Reason:

- speech recognition is not the core technical risk
- faster to ship
- lets the prototype focus on recipe intelligence and trust

### Recipe extraction

Decision:

- use LLM structured outputs with validation

Reason:

- flexible enough for messy family memories
- validates the product hypothesis quickly
- schema + evals reduce wrapper risk

### Provenance

Decision:

- build manually as a first-class feature

Reason:

- this is the main differentiator
- it shows trust and reliability thinking
- it turns the project from "AI recipe generator" into "source-backed knowledge capture"

## Scope cuts

### Cut: user accounts

Reason:

- not needed for the demo
- adds auth complexity without improving the core insight

### Cut: recipe library

Reason:

- storing many recipes matters later
- one capture-to-living-recipe flow matters now

### Cut: collaboration

Reason:

- family collaboration is important long term
- too expensive for a 12-hour prototype

### Cut: perfect audio timestamp playback

Reason:

- text provenance is enough for MVP
- timestamp playback is valuable only after the extraction flow works

### Cut: exact culinary normalization

Reason:

- the app should preserve family language first
- over-normalization risks erasing tacit knowledge

## Product tradeoffs

### Completeness vs. honesty

A complete recipe feels satisfying, but an honest recipe is more valuable for preserving family knowledge.

Decision:

- show unresolved questions visibly
- avoid fabricating measurements
- keep inferred details marked

### Magic vs. control

A magical one-click recipe is easier to understand, but source-backed editing builds trust.

Decision:

- make extraction one-click
- make evidence inspectable
- make follow-ups editable

### Broad inputs vs. polished seeded demo

Supporting arbitrary audio is impressive only if it works. A reliable seeded demo is better for proof-of-work.

Decision:

- build real upload/record if time allows
- keep seeded demo as the guaranteed path

## Engineering tradeoffs

### Database vs. local state

Option A:

- local JSON state

Pros:

- faster
- fewer moving parts

Cons:

- less production-like
- weaker architecture signal

Option B:

- Supabase/Postgres

Pros:

- stronger full-stack signal
- easier persistence
- better for future recipe library

Cons:

- setup time
- deployment complexity

Recommended approach:

- start with local seeded JSON
- add database only after core flow works

### One big AI call vs. pipeline

Option A:

- one call: transcript to final recipe

Pros:

- faster to implement

Cons:

- less reliable
- harder to debug
- weaker provenance
- more likely to hallucinate

Option B:

- segmented pipeline

Pros:

- easier validation
- better trust
- easier evals
- stronger engineering signal

Cons:

- more code
- more state transitions

Decision:

- use segmented pipeline

### Strict validation vs. permissive rendering

Option A:

- render whatever the model returns

Pros:

- fewer failed demos

Cons:

- hidden errors
- untrustworthy output

Option B:

- validate and repair/reject

Pros:

- better engineering signal
- safer output
- clearer failure handling

Cons:

- more implementation work

Decision:

- strict validation with one repair attempt

## Time-boxing plan

### First 2 hours

Ship:

- docs
- schema
- seeded transcript
- static recipe draft UI

### Hours 3-5

Ship:

- extraction API
- Zod validation
- seeded demo extraction
- loading/error states

### Hours 6-8

Ship:

- provenance interaction
- follow-up questions
- final recipe view

### Hours 9-10

Ship:

- audio record/upload or paste transcript
- markdown export
- UI polish

### Hours 11-12

Ship:

- eval fixtures
- README
- demo video
- final deployment

## If time is running out

### By hour 4

If extraction is unstable:

- hard-code seeded extraction output
- keep extraction route as best-effort
- make the UI/provenance excellent

### By hour 6

If audio is unstable:

- cut recording
- use paste transcript + seeded demo
- mention audio is next

### By hour 8

If finalization is unstable:

- cut final recipe generation
- keep recipe draft + follow-up questions + provenance

### By hour 10

If deployment is unstable:

- record local demo video
- keep README and screenshots

## What to show in the demo

The demo should emphasize:

1. messy input
2. structured extraction
3. sensory cues
4. missing details
5. follow-up questions
6. provenance click-through
7. final living recipe

Do not spend demo time explaining generic tech stack choices. Show the trust layer.

## What to say about limitations

Use direct language:

```txt
I optimized for one trustworthy end-to-end flow. The current system handles short family cooking memories well, but it does not yet solve long multi-speaker sessions, perfect audio timestamps, or cross-family collaboration.
```

This sounds stronger than pretending the MVP is complete.

## What this project demonstrates

RecipeTrace demonstrates:

- fast product scoping
- full-stack implementation
- AI pipeline design
- structured outputs
- schema validation
- eval mindset
- user-centered UX
- trust/provenance thinking
- ability to build from ambiguous founder/customer insight

## Main failure to avoid

Do not let the project become a generic recipe generator.

The strongest version is:

```txt
Voice memory -> transcript -> structured recipe -> uncertainty -> follow-up questions -> source-backed living recipe
```

That is the product.
