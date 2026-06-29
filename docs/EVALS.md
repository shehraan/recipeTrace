# RecipeTrace Evals

## Why evals matter

RecipeTrace uses AI to transform messy family cooking memories into structured recipes. The risk is not just bad output. The real risk is false confidence: hallucinated quantities, unsupported steps, and erased uncertainty.

The eval suite exists to check whether the system:

- preserves vague information
- extracts tacit sensory cues
- asks useful follow-up questions
- links generated steps to transcript evidence
- avoids unsupported recipe instructions

## Eval philosophy

This is a lightweight prototype eval suite, not a full benchmark.

The goal is to prove engineering judgment:

- define expected behavior
- create fixtures
- validate outputs programmatically
- catch the worst AI failure modes
- make reliability visible in the repo

## Eval fixtures

Create three transcript fixtures.

### Fixture 1: Clear memory

Purpose:

- confirms the happy path works

Expected characteristics:

- explicit dish name
- clear ingredient list
- clear sequence
- some timing details
- low ambiguity

Expected checks:

- has dish name
- has at least 4 ingredients
- has at least 5 steps
- each step has provenance
- produces at least 2 sensory cues

### Fixture 2: Messy family memory

Purpose:

- tests tacit knowledge preservation

Expected characteristics:

- vague quantities
- phrases like "until it smells right"
- family/cultural context
- missing heat and timing details

Expected checks:

- does not hallucinate exact quantities
- extracts at least 3 sensory cues
- produces at least 3 follow-up questions
- marks uncertain details as missing
- every step has provenance

### Fixture 3: Contradictory memory

Purpose:

- tests uncertainty handling

Expected characteristics:

- conflicting details
- uncertain order of operations
- speaker corrections
- incomplete ingredient amounts

Expected checks:

- captures contradiction in missing details or notes
- avoids choosing one unsupported answer as fact
- asks follow-up question to resolve contradiction
- marks inferred steps as low/medium confidence
- every step has provenance

## Programmatic checks

### Basic structure checks

- output is valid JSON
- output passes Zod schema
- `dishName` is non-empty
- `ingredients.length >= 1`
- `steps.length >= 3`
- `followUpQuestions.length >= 1` for ambiguous fixtures

### Provenance checks

For every recipe step:

- `provenance.length >= 1`
- every `transcriptSegmentId` exists in the input fixture
- every provenance quote is non-empty
- unsupported steps are rejected or marked clearly

### Uncertainty checks

For vague fixtures:

- no exact quantities are invented when the transcript does not provide them
- missing quantities are represented as `"unspecified"`, `"to taste"`, or omitted
- sensory phrases are preserved
- inferred fields are marked `isInferred: true`

### Follow-up quality checks

Follow-up questions should be:

- specific
- tied to missing details
- useful for making the dish cookable
- prioritized

Bad follow-up questions:

- "Can you provide more details?"
- "What else should we know?"
- "Can you clarify the recipe?"

Good follow-up questions:

- "How much water do you add after frying the spices?"
- "What should the onions look like before adding the ginger garlic?"
- "Is the heat low, medium, or high during the simmer?"

## Suggested eval file structure

```txt
/evals
  fixtures/
    clear-memory.json
    messy-family-memory.json
    contradictory-memory.json
  run-evals.ts
  checks.ts
  README.md
```

## Fixture format

```ts
type EvalFixture = {
  id: string;
  name: string;
  description: string;
  transcriptSegments: TranscriptSegment[];
  expectations: {
    minIngredients: number;
    minSteps: number;
    minSensoryCues: number;
    minFollowUpQuestions: number;
    shouldPreserveVagueQuantities: boolean;
    shouldDetectContradictions: boolean;
  };
};
```

## Example fixture: messy family memory

```json
{
  "id": "messy-family-memory",
  "name": "Messy family chicken curry memory",
  "description": "Tests vague quantities, sensory cues, and family context.",
  "transcriptSegments": [
    {
      "id": "seg_001",
      "text": "My grandmother never measured this, but she always started with onions sliced thin.",
      "orderIndex": 0
    },
    {
      "id": "seg_002",
      "text": "You fry them until they are golden, not brown, and the kitchen starts smelling sweet.",
      "orderIndex": 1
    },
    {
      "id": "seg_003",
      "text": "Then ginger garlic goes in, just wait until the raw smell disappears.",
      "orderIndex": 2
    },
    {
      "id": "seg_004",
      "text": "The spices go next, but only a little chili because my brother could not handle too much.",
      "orderIndex": 3
    },
    {
      "id": "seg_005",
      "text": "Add chicken and stir until it stops looking pink on the outside.",
      "orderIndex": 4
    },
    {
      "id": "seg_006",
      "text": "Then add enough water so it loosens, not so much that it becomes soup.",
      "orderIndex": 5
    },
    {
      "id": "seg_007",
      "text": "Cover it and let it go until the oil comes up a bit on top.",
      "orderIndex": 6
    }
  ],
  "expectations": {
    "minIngredients": 5,
    "minSteps": 5,
    "minSensoryCues": 4,
    "minFollowUpQuestions": 3,
    "shouldPreserveVagueQuantities": true,
    "shouldDetectContradictions": false
  }
}
```

## Example eval checks

```ts
export function checkEveryStepHasProvenance(recipe: RecipeDraft, segmentIds: Set<string>) {
  const failures: string[] = [];

  for (const step of recipe.steps) {
    if (!step.provenance || step.provenance.length === 0) {
      failures.push(`${step.id} has no provenance`);
      continue;
    }

    for (const link of step.provenance) {
      if (!segmentIds.has(link.transcriptSegmentId)) {
        failures.push(`${step.id} references missing segment ${link.transcriptSegmentId}`);
      }
    }
  }

  return failures;
}
```

```ts
export function checkNoInventedExactQuantities(recipe: RecipeDraft) {
  const suspicious = recipe.ingredients.filter((ingredient) => {
    const q = ingredient.quantity?.toLowerCase() ?? "";
    const hasExactNumber = /\b\d+(\.\d+)?\b/.test(q);
    return hasExactNumber && ingredient.isInferred;
  });

  return suspicious.map(
    (ingredient) =>
      `${ingredient.name} has inferred exact quantity: ${ingredient.quantity}`
  );
}
```

## Scoring

Use a simple scoring system.

| Category | Points |
|---|---:|
| Valid schema | 20 |
| Minimum useful recipe structure | 20 |
| Provenance coverage | 25 |
| Uncertainty preservation | 20 |
| Follow-up question quality | 15 |

Passing threshold:

```txt
80 / 100
```

Seeded demo should score:

```txt
90+ / 100
```

## Manual eval checklist

Before submitting/demoing:

- Run the seeded demo twice.
- Confirm no exact quantity is invented from vague input.
- Click every recipe step and verify evidence appears.
- Confirm follow-up questions are specific.
- Confirm loading states work.
- Confirm API failure path does not break the app.
- Confirm README explains known limitations.

## Known limitations

The MVP evals do not prove:

- culinary correctness across cuisines
- production reliability
- perfect transcription quality
- accurate audio timestamps
- robustness to very long conversations

That is acceptable. The purpose is to show the first layer of AI product reliability.
