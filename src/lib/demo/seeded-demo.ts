import { livingRecipeSchema, parseRecipeDraftForTranscript } from "../recipe/schemas";
import type {
  Capture,
  LivingRecipe,
  RecipeDraft,
  TranscriptSegment,
} from "../recipe/types";

const captureId = "cap_demo_chicken_curry";
const createdAt = "2026-06-29T14:45:00.000Z";

export const seededCapture: Capture = {
  id: captureId,
  title: "Nani's Chicken Curry",
  status: "finalized",
  source: {
    type: "demo",
    fixtureId: "nanis-chicken-curry",
  },
  createdAt,
  updatedAt: createdAt,
};

export const seededTranscriptSegments: TranscriptSegment[] = [
  {
    id: "seg_001",
    captureId,
    orderIndex: 0,
    speaker: "Auntie",
    text: "Nani never wrote this chicken curry down, she just showed us. She always said the onions tell you when to move on.",
  },
  {
    id: "seg_002",
    captureId,
    orderIndex: 1,
    speaker: "Auntie",
    text: "Start with sliced onions in oil and let them go until they are golden at the edges, not brown, and the kitchen smells sweet.",
  },
  {
    id: "seg_003",
    captureId,
    orderIndex: 2,
    speaker: "Auntie",
    text: "Then add ginger garlic paste. Stir it until that sharp raw smell disappears.",
  },
  {
    id: "seg_004",
    captureId,
    orderIndex: 3,
    speaker: "Auntie",
    text: "The spices go in next: turmeric, coriander, cumin, and only a little chili because your uncle could not handle heat.",
  },
  {
    id: "seg_005",
    captureId,
    orderIndex: 4,
    speaker: "Auntie",
    text: "If it catches, splash in a bit of water. You want the masala glossy, not dusty.",
  },
  {
    id: "seg_006",
    captureId,
    orderIndex: 5,
    speaker: "Auntie",
    text: "Put the chicken in and stir until the outside stops looking pink and the pieces are coated.",
  },
  {
    id: "seg_007",
    captureId,
    orderIndex: 6,
    speaker: "Auntie",
    text: "Add just enough water so everything loosens, but it should not become soup.",
  },
  {
    id: "seg_008",
    captureId,
    orderIndex: 7,
    speaker: "Auntie",
    text: "Cover it and simmer until the chicken is tender and you see a little oil come back on top.",
  },
  {
    id: "seg_009",
    captureId,
    orderIndex: 8,
    speaker: "Auntie",
    text: "At the end she would crush dried fenugreek in her hands, add cilantro, and taste for salt.",
  },
  {
    id: "seg_010",
    captureId,
    orderIndex: 9,
    speaker: "Auntie",
    text: "We ate it with rice, but I do not remember exactly how long she simmered it or how much chicken she used.",
  },
];

const rawSeededRecipeDraft: RecipeDraft = {
  id: "draft_demo_chicken_curry",
  captureId,
  dishName: "Nani's Chicken Curry",
  familyContext:
    "A family chicken curry learned by watching Nani cook rather than from written measurements.",
  summary:
    "A source-backed curry draft that preserves vague quantities, smell and texture cues, and missing timing details.",
  ingredients: [
    {
      id: "ing_onions",
      name: "onions",
      quantity: "unspecified",
      preparation: "sliced",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_002",
          quote: "Start with sliced onions in oil",
          reason: "The speaker explicitly names sliced onions as the starting ingredient.",
        },
      ],
    },
    {
      id: "ing_oil",
      name: "oil",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_002",
          quote: "sliced onions in oil",
          reason: "Oil is directly mentioned as the cooking fat for the onions.",
        },
      ],
    },
    {
      id: "ing_ginger_garlic",
      name: "ginger garlic paste",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_003",
          quote: "Then add ginger garlic paste",
          reason: "The speaker directly identifies ginger garlic paste.",
        },
      ],
    },
    {
      id: "ing_spices",
      name: "turmeric, coriander, cumin, and chili",
      quantity: "unspecified; use only a little chili",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_004",
          quote: "turmeric, coriander, cumin, and only a little chili",
          reason: "The speaker lists the spices and gives a vague chili amount.",
        },
      ],
    },
    {
      id: "ing_chicken",
      name: "chicken",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_006",
          quote: "Put the chicken in",
          reason: "Chicken is directly named as the main protein.",
        },
      ],
    },
    {
      id: "ing_water",
      name: "water",
      quantity: "just enough so everything loosens",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_007",
          quote: "Add just enough water so everything loosens",
          reason: "The speaker gives a sensory quantity cue for water.",
        },
      ],
    },
    {
      id: "ing_fenugreek_cilantro_salt",
      name: "dried fenugreek, cilantro, and salt",
      quantity: "fenugreek and cilantro unspecified; salt to taste",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "seg_009",
          quote: "crush dried fenugreek in her hands, add cilantro, and taste for salt",
          reason: "The speaker names the finishing ingredients but not exact amounts.",
        },
      ],
    },
  ],
  steps: [
    {
      id: "step_001",
      orderIndex: 0,
      instruction:
        "Cook sliced onions in oil until the edges are golden, not brown, and the kitchen smells sweet.",
      sensoryCueIds: ["cue_onion_color", "cue_onion_smell"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_002",
          quote: "golden at the edges, not brown, and the kitchen smells sweet",
          reason: "This directly supports the onion doneness cues.",
        },
      ],
    },
    {
      id: "step_002",
      orderIndex: 1,
      instruction: "Add ginger garlic paste and stir until the sharp raw smell disappears.",
      sensoryCueIds: ["cue_raw_smell"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_003",
          quote: "Stir it until that sharp raw smell disappears",
          reason: "This directly supports the step and its smell cue.",
        },
      ],
    },
    {
      id: "step_003",
      orderIndex: 2,
      instruction:
        "Add turmeric, coriander, cumin, and a little chili. If the spices catch, splash in water until the masala looks glossy, not dusty.",
      sensoryCueIds: ["cue_masala_texture"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_004",
          quote: "The spices go in next: turmeric, coriander, cumin, and only a little chili",
          reason: "This segment gives the spice list and order.",
        },
        {
          transcriptSegmentId: "seg_005",
          quote: "You want the masala glossy, not dusty",
          reason: "This segment gives the texture cue for the spice mixture.",
        },
      ],
    },
    {
      id: "step_004",
      orderIndex: 3,
      instruction:
        "Add the chicken and stir until the outside no longer looks pink and the pieces are coated in masala.",
      sensoryCueIds: ["cue_chicken_color", "cue_chicken_coated"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_006",
          quote: "stir until the outside stops looking pink and the pieces are coated",
          reason: "This directly supports the chicken step and doneness cue.",
        },
      ],
    },
    {
      id: "step_005",
      orderIndex: 4,
      instruction: "Add just enough water to loosen the mixture without making it soupy.",
      sensoryCueIds: ["cue_water_texture"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "seg_007",
          quote: "everything loosens, but it should not become soup",
          reason: "This directly supports the water amount and texture target.",
        },
      ],
    },
    {
      id: "step_006",
      orderIndex: 5,
      instruction:
        "Cover and simmer until the chicken is tender and a little oil rises back to the top.",
      timing: "unspecified",
      sensoryCueIds: ["cue_oil_rises", "cue_simmer_timing"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "seg_008",
          quote: "simmer until the chicken is tender and you see a little oil come back on top",
          reason: "This directly supports the simmering instruction and visual cue.",
        },
      ],
    },
    {
      id: "step_007",
      orderIndex: 6,
      instruction:
        "Finish with crushed dried fenugreek, cilantro, and salt to taste. Serve with rice.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "seg_009",
          quote: "crush dried fenugreek in her hands, add cilantro, and taste for salt",
          reason: "This directly supports the finishing ingredients.",
        },
        {
          transcriptSegmentId: "seg_010",
          quote: "We ate it with rice",
          reason: "This directly supports the serving suggestion.",
        },
      ],
    },
  ],
  sensoryCues: [
    {
      id: "cue_onion_color",
      type: "look",
      cue: "onions are golden at the edges, not brown",
      interpretation: "Move on before the onions darken too much.",
      provenance: [
        {
          transcriptSegmentId: "seg_002",
          quote: "golden at the edges, not brown",
          reason: "The phrase is a direct visual cue for onion doneness.",
        },
      ],
    },
    {
      id: "cue_onion_smell",
      type: "smell",
      cue: "the kitchen smells sweet",
      provenance: [
        {
          transcriptSegmentId: "seg_002",
          quote: "the kitchen smells sweet",
          reason: "The phrase is a direct smell cue.",
        },
      ],
    },
    {
      id: "cue_raw_smell",
      type: "smell",
      cue: "sharp raw smell disappears",
      provenance: [
        {
          transcriptSegmentId: "seg_003",
          quote: "that sharp raw smell disappears",
          reason: "The phrase is a direct smell cue for ginger garlic.",
        },
      ],
    },
    {
      id: "cue_masala_texture",
      type: "texture",
      cue: "masala is glossy, not dusty",
      provenance: [
        {
          transcriptSegmentId: "seg_005",
          quote: "glossy, not dusty",
          reason: "The phrase is a direct texture cue for the masala.",
        },
      ],
    },
    {
      id: "cue_chicken_color",
      type: "look",
      cue: "outside of chicken stops looking pink",
      provenance: [
        {
          transcriptSegmentId: "seg_006",
          quote: "outside stops looking pink",
          reason: "The phrase is a direct visual cue for the chicken.",
        },
      ],
    },
    {
      id: "cue_chicken_coated",
      type: "texture",
      cue: "chicken pieces are coated",
      provenance: [
        {
          transcriptSegmentId: "seg_006",
          quote: "the pieces are coated",
          reason: "The phrase describes how the chicken should be covered in masala.",
        },
      ],
    },
    {
      id: "cue_water_texture",
      type: "texture",
      cue: "mixture loosens but does not become soup",
      provenance: [
        {
          transcriptSegmentId: "seg_007",
          quote: "loosens, but it should not become soup",
          reason: "The phrase gives a texture cue for water quantity.",
        },
      ],
    },
    {
      id: "cue_oil_rises",
      type: "look",
      cue: "a little oil comes back on top",
      provenance: [
        {
          transcriptSegmentId: "seg_008",
          quote: "a little oil come back on top",
          reason: "The phrase is a visual cue for the simmered curry.",
        },
      ],
    },
    {
      id: "cue_simmer_timing",
      type: "timing",
      cue: "simmer duration is not exact; cook until chicken is tender",
      provenance: [
        {
          transcriptSegmentId: "seg_008",
          quote: "simmer until the chicken is tender",
          reason: "The phrase gives a condition-based timing cue.",
        },
        {
          transcriptSegmentId: "seg_010",
          quote: "I do not remember exactly how long she simmered it",
          reason: "The phrase confirms that exact timing is missing.",
        },
      ],
    },
  ],
  openQuestions: [
    {
      id: "q_chicken_amount",
      target: "ingredient",
      question: "How much chicken did Nani usually use for one batch?",
      whyItMatters:
        "The transcript names chicken but explicitly says the amount is not remembered.",
      priority: "high",
      relatedIngredientIds: ["ing_chicken"],
    },
    {
      id: "q_simmer_time",
      target: "timing",
      question:
        "About how long should the curry simmer before the chicken is tender and oil appears on top?",
      whyItMatters:
        "The transcript gives doneness cues but says the exact simmer time is unknown.",
      priority: "high",
      relatedStepIds: ["step_006"],
      relatedCueIds: ["cue_simmer_timing", "cue_oil_rises"],
    },
    {
      id: "q_heat_level",
      target: "temperature",
      question: "What heat level should be used while frying the onions and simmering the curry?",
      whyItMatters:
        "The transcript gives visual and smell cues but never states heat level.",
      priority: "medium",
      relatedStepIds: ["step_001", "step_006"],
    },
    {
      id: "q_spice_amounts",
      target: "ingredient",
      question: "What are the usual amounts for turmeric, coriander, cumin, and chili?",
      whyItMatters:
        "The transcript lists spices but only gives a vague amount for chili.",
      priority: "medium",
      relatedIngredientIds: ["ing_spices"],
    },
  ],
  createdAt,
};

export const seededRecipeDraft = parseRecipeDraftForTranscript(
  rawSeededRecipeDraft,
  seededTranscriptSegments,
);

const rawSeededLivingRecipe: LivingRecipe = {
  id: "living_demo_chicken_curry",
  captureId,
  title: "Nani's Chicken Curry",
  summary:
    "A family chicken curry built from transcript-backed steps, with sensory cues preserved and unresolved measurements left explicit.",
  familyContext: rawSeededRecipeDraft.familyContext,
  ingredients: seededRecipeDraft.ingredients,
  steps: seededRecipeDraft.steps,
  sensoryCues: seededRecipeDraft.sensoryCues,
  resolvedQuestions: [
    {
      questionId: "q_heat_level",
      answer:
        "Use medium heat for the onions and a gentle low simmer once the water is added.",
      appliedToStepIds: ["step_001", "step_006"],
    },
  ],
  unresolvedQuestions: seededRecipeDraft.openQuestions.filter(
    (question: { id: string }) => question.id !== "q_heat_level",
  ),
  sourceSummary: {
    transcriptSegmentCount: seededTranscriptSegments.length,
    supportedStepCount: seededRecipeDraft.steps.length,
    inferredStepCount: seededRecipeDraft.steps.filter((step: { isInferred: boolean }) => step.isInferred).length,
  },
  createdAt,
};

export const seededLivingRecipe = livingRecipeSchema.parse(rawSeededLivingRecipe);

export const seededDemo = {
  capture: seededCapture,
  transcriptSegments: seededTranscriptSegments,
  recipeDraft: seededRecipeDraft,
  livingRecipe: seededLivingRecipe,
};
