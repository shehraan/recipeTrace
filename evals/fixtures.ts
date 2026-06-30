import type {
  FollowUpAnswer,
  LivingRecipe,
  RecipeDraft,
  TranscriptSegment,
} from "../src/lib/recipe/types";

type EvalExpectations = {
  minIngredients: number;
  minSteps: number;
  minSensoryCues: number;
  minFollowUpQuestions: number;
  shouldPreserveVagueQuantities: boolean;
  shouldDetectContradictions: boolean;
  expectedVagueTerms: string[];
  expectedUncertaintyTerms: string[];
  forbiddenInventedQuantities: string[];
  expectedAnswerSnippets: string[];
};

export type EvalFixture = {
  id: string;
  name: string;
  description: string;
  transcriptSegments: TranscriptSegment[];
  expectedExtraction: RecipeDraft;
  followUpAnswers: Record<string, FollowUpAnswer>;
  expectedFinalization: LivingRecipe;
  expectations: EvalExpectations;
};

const createdAt = "2026-06-29T18:00:00.000Z";
const answeredAt = "2026-06-29T18:05:00.000Z";

const clearTranscript: TranscriptSegment[] = [
  {
    id: "clear_seg_001",
    captureId: "cap_eval_clear",
    orderIndex: 0,
    speaker: "Maya",
    text: "This is Mom's lemon dal. Rinse one cup red lentils until the water runs mostly clear.",
  },
  {
    id: "clear_seg_002",
    captureId: "cap_eval_clear",
    orderIndex: 1,
    speaker: "Maya",
    text: "Put the lentils in a pot with three cups water, turmeric, and salt, then simmer about twenty minutes until soft.",
  },
  {
    id: "clear_seg_003",
    captureId: "cap_eval_clear",
    orderIndex: 2,
    speaker: "Maya",
    text: "In a small pan warm ghee, add cumin seeds, and wait until they crackle and smell nutty.",
  },
  {
    id: "clear_seg_004",
    captureId: "cap_eval_clear",
    orderIndex: 3,
    speaker: "Maya",
    text: "Add garlic and green chili just until the garlic turns pale gold, not brown.",
  },
  {
    id: "clear_seg_005",
    captureId: "cap_eval_clear",
    orderIndex: 4,
    speaker: "Maya",
    text: "Pour the hot seasoning into the dal, squeeze in lemon, and finish with cilantro.",
  },
  {
    id: "clear_seg_006",
    captureId: "cap_eval_clear",
    orderIndex: 5,
    speaker: "Maya",
    text: "I cannot remember whether she thinned it at the end for rice or kept it thicker for roti.",
  },
];

const clearDraft: RecipeDraft = {
  id: "draft_eval_clear",
  captureId: "cap_eval_clear",
  dishName: "Mom's Lemon Dal",
  familyContext: "A remembered family dal finished with lemon and cilantro.",
  summary: "A clear dal memory with explicit lentil and water amounts plus sensory cues.",
  ingredients: [
    {
      id: "clear_ing_lentils",
      name: "red lentils",
      quantity: "one cup",
      preparation: "rinsed until the water runs mostly clear",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_001",
          quote: "Rinse one cup red lentils",
          reason: "The speaker gives the ingredient, amount, and preparation.",
        },
      ],
    },
    {
      id: "clear_ing_water",
      name: "water",
      quantity: "three cups",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_002",
          quote: "with three cups water",
          reason: "The speaker gives the water amount.",
        },
      ],
    },
    {
      id: "clear_ing_turmeric_salt",
      name: "turmeric and salt",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_002",
          quote: "turmeric, and salt",
          reason: "The speaker names these seasonings without exact amounts.",
        },
      ],
    },
    {
      id: "clear_ing_ghee_cumin",
      name: "ghee and cumin seeds",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_003",
          quote: "warm ghee, add cumin seeds",
          reason: "The speaker names the tempering fat and spice.",
        },
      ],
    },
    {
      id: "clear_ing_garlic_chili",
      name: "garlic and green chili",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_004",
          quote: "Add garlic and green chili",
          reason: "The speaker names aromatics for the seasoning.",
        },
      ],
    },
    {
      id: "clear_ing_lemon_cilantro",
      name: "lemon and cilantro",
      quantity: "lemon to taste; cilantro unspecified",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_005",
          quote: "squeeze in lemon, and finish with cilantro",
          reason: "The speaker gives the finishing ingredients.",
        },
      ],
    },
  ],
  steps: [
    {
      id: "clear_step_001",
      orderIndex: 0,
      instruction: "Rinse one cup red lentils until the water runs mostly clear.",
      sensoryCueIds: ["clear_cue_rinse"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_001",
          quote: "until the water runs mostly clear",
          reason: "This directly supports the rinsing cue.",
        },
      ],
    },
    {
      id: "clear_step_002",
      orderIndex: 1,
      instruction: "Simmer the lentils with three cups water, turmeric, and salt until soft.",
      timing: "about twenty minutes",
      sensoryCueIds: ["clear_cue_soft"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_002",
          quote: "simmer about twenty minutes until soft",
          reason: "This directly supports the simmer step and timing.",
        },
      ],
    },
    {
      id: "clear_step_003",
      orderIndex: 2,
      instruction: "Warm ghee in a small pan, add cumin seeds, and cook until they crackle and smell nutty.",
      sensoryCueIds: ["clear_cue_crackle", "clear_cue_nutty"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_003",
          quote: "wait until they crackle and smell nutty",
          reason: "This directly supports the tempering cue.",
        },
      ],
    },
    {
      id: "clear_step_004",
      orderIndex: 3,
      instruction: "Add garlic and green chili and cook just until the garlic turns pale gold, not brown.",
      sensoryCueIds: ["clear_cue_garlic_color"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_004",
          quote: "until the garlic turns pale gold, not brown",
          reason: "This directly supports the garlic doneness cue.",
        },
      ],
    },
    {
      id: "clear_step_005",
      orderIndex: 4,
      instruction: "Pour the hot seasoning into the dal, squeeze in lemon, and finish with cilantro.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_005",
          quote: "Pour the hot seasoning into the dal",
          reason: "This directly supports the final mixing step.",
        },
      ],
    },
  ],
  sensoryCues: [
    {
      id: "clear_cue_rinse",
      type: "look",
      cue: "rinsing water runs mostly clear",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_001",
          quote: "water runs mostly clear",
          reason: "The phrase gives a visual cue.",
        },
      ],
    },
    {
      id: "clear_cue_soft",
      type: "texture",
      cue: "lentils are soft",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_002",
          quote: "until soft",
          reason: "The phrase gives a texture cue.",
        },
      ],
    },
    {
      id: "clear_cue_crackle",
      type: "sound",
      cue: "cumin seeds crackle",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_003",
          quote: "they crackle",
          reason: "The phrase gives a sound cue.",
        },
      ],
    },
    {
      id: "clear_cue_nutty",
      type: "smell",
      cue: "cumin smells nutty",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_003",
          quote: "smell nutty",
          reason: "The phrase gives a smell cue.",
        },
      ],
    },
    {
      id: "clear_cue_garlic_color",
      type: "look",
      cue: "garlic is pale gold, not brown",
      provenance: [
        {
          transcriptSegmentId: "clear_seg_004",
          quote: "pale gold, not brown",
          reason: "The phrase gives a visual doneness cue.",
        },
      ],
    },
  ],
  openQuestions: [
    {
      id: "clear_q_texture",
      target: "texture",
      question: "Should the finished dal be loose for rice or thicker for roti?",
      whyItMatters: "The transcript says the final texture is not remembered.",
      priority: "medium",
      relatedStepIds: ["clear_step_005"],
    },
    {
      id: "clear_q_heat",
      target: "temperature",
      question: "What heat level should be used for the ghee tempering?",
      whyItMatters: "The transcript gives sensory cues but not burner heat.",
      priority: "low",
      relatedStepIds: ["clear_step_003", "clear_step_004"],
    },
  ],
  createdAt,
};

const clearAnswers: Record<string, FollowUpAnswer> = {
  clear_q_texture: {
    questionId: "clear_q_texture",
    answer: "Keep it loose enough to spoon over rice.",
    answeredAt,
  },
};

const clearLiving: LivingRecipe = {
  id: "living_eval_clear",
  captureId: clearDraft.captureId,
  title: clearDraft.dishName,
  summary: "A transcript-backed lemon dal with one user-provided serving texture detail.",
  familyContext: clearDraft.familyContext,
  ingredients: clearDraft.ingredients,
  steps: clearDraft.steps.map((step) =>
    step.id === "clear_step_005"
      ? {
          ...step,
          instruction:
            "Pour the hot seasoning into the dal, squeeze in lemon, finish with cilantro, and keep it loose enough to spoon over rice.",
        }
      : step,
  ),
  sensoryCues: clearDraft.sensoryCues,
  resolvedQuestions: [
    {
      questionId: "clear_q_texture",
      answer: "User-provided: Keep it loose enough to spoon over rice.",
      appliedToStepIds: ["clear_step_005"],
    },
  ],
  unresolvedQuestions: clearDraft.openQuestions.filter((question) => question.id !== "clear_q_texture"),
  sourceSummary: {
    transcriptSegmentCount: clearTranscript.length,
    supportedStepCount: clearDraft.steps.length,
    inferredStepCount: 0,
  },
  createdAt,
};

const messyTranscript: TranscriptSegment[] = [
  {
    id: "messy_seg_001",
    captureId: "cap_eval_messy",
    orderIndex: 0,
    speaker: "Auntie",
    text: "Your dadi's potato poha was never measured. She grabbed a couple handfuls of poha and rinsed it quickly.",
  },
  {
    id: "messy_seg_002",
    captureId: "cap_eval_messy",
    orderIndex: 1,
    speaker: "Auntie",
    text: "There was a small potato, chopped tiny, and some onion, maybe half or maybe just whatever was left.",
  },
  {
    id: "messy_seg_003",
    captureId: "cap_eval_messy",
    orderIndex: 2,
    speaker: "Auntie",
    text: "Mustard seeds went in hot oil until they popped, then curry leaves if we had them.",
  },
  {
    id: "messy_seg_004",
    captureId: "cap_eval_messy",
    orderIndex: 3,
    speaker: "Auntie",
    text: "She cooked the onion and potato until the onion lost its raw smell and the potato was soft at the edges.",
  },
  {
    id: "messy_seg_005",
    captureId: "cap_eval_messy",
    orderIndex: 4,
    speaker: "Auntie",
    text: "Then turmeric and salt, not too much turmeric, just enough to make everything yellow.",
  },
  {
    id: "messy_seg_006",
    captureId: "cap_eval_messy",
    orderIndex: 5,
    speaker: "Auntie",
    text: "The poha went in when it felt damp but not soggy. If it clumped, she sprinkled water with her fingers.",
  },
  {
    id: "messy_seg_007",
    captureId: "cap_eval_messy",
    orderIndex: 6,
    speaker: "Auntie",
    text: "At the end lemon, cilantro, and sev. I do not know the heat level or exact timing.",
  },
];

const messyDraft: RecipeDraft = {
  id: "draft_eval_messy",
  captureId: "cap_eval_messy",
  dishName: "Dadi's Potato Poha",
  familyContext: "A family breakfast remembered through handfuls, smell, and texture cues.",
  summary: "A messy family memory that keeps vague quantities and asks about heat and timing.",
  ingredients: [
    {
      id: "messy_ing_poha",
      name: "poha",
      quantity: "a couple handfuls",
      preparation: "rinsed quickly until damp but not soggy",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_001",
          quote: "a couple handfuls of poha",
          reason: "The speaker gives a vague amount for poha.",
        },
        {
          transcriptSegmentId: "messy_seg_006",
          quote: "felt damp but not soggy",
          reason: "The speaker gives the poha texture cue.",
        },
      ],
    },
    {
      id: "messy_ing_potato",
      name: "potato",
      quantity: "a small potato",
      preparation: "chopped tiny",
      optional: false,
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_002",
          quote: "a small potato, chopped tiny",
          reason: "The speaker names the amount and preparation.",
        },
      ],
    },
    {
      id: "messy_ing_onion",
      name: "onion",
      quantity: "some onion, maybe half or whatever was left",
      optional: false,
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_002",
          quote: "some onion, maybe half or maybe just whatever was left",
          reason: "The speaker gives an uncertain onion amount.",
        },
      ],
    },
    {
      id: "messy_ing_mustard_oil",
      name: "hot oil and mustard seeds",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_003",
          quote: "Mustard seeds went in hot oil",
          reason: "The speaker names the tempering ingredients.",
        },
      ],
    },
    {
      id: "messy_ing_curry_leaves",
      name: "curry leaves",
      quantity: "if available",
      optional: true,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_003",
          quote: "curry leaves if we had them",
          reason: "The speaker marks curry leaves as conditional.",
        },
      ],
    },
    {
      id: "messy_ing_turmeric_salt",
      name: "turmeric and salt",
      quantity: "not too much turmeric; salt unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_005",
          quote: "not too much turmeric, just enough to make everything yellow",
          reason: "The speaker gives a visual amount cue.",
        },
      ],
    },
    {
      id: "messy_ing_finish",
      name: "lemon, cilantro, and sev",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_007",
          quote: "At the end lemon, cilantro, and sev",
          reason: "The speaker names the finishing ingredients.",
        },
      ],
    },
  ],
  steps: [
    {
      id: "messy_step_001",
      orderIndex: 0,
      instruction: "Quickly rinse a couple handfuls of poha so it feels damp but not soggy.",
      sensoryCueIds: ["messy_cue_poha_texture"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_001",
          quote: "grabbed a couple handfuls of poha and rinsed it quickly",
          reason: "This supports the poha preparation.",
        },
      ],
    },
    {
      id: "messy_step_002",
      orderIndex: 1,
      instruction: "Pop mustard seeds in hot oil, adding curry leaves if available.",
      sensoryCueIds: ["messy_cue_mustard_pop"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_003",
          quote: "Mustard seeds went in hot oil until they popped",
          reason: "This supports the tempering step.",
        },
      ],
    },
    {
      id: "messy_step_003",
      orderIndex: 2,
      instruction: "Cook the onion and tiny-chopped potato until the onion loses its raw smell and the potato softens at the edges.",
      sensoryCueIds: ["messy_cue_onion_smell", "messy_cue_potato_edges"],
      isInferred: false,
      confidence: "high",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_004",
          quote: "until the onion lost its raw smell and the potato was soft at the edges",
          reason: "This directly supports the cooking cue.",
        },
      ],
    },
    {
      id: "messy_step_004",
      orderIndex: 3,
      instruction: "Add turmeric and salt, using only enough turmeric to make everything yellow.",
      sensoryCueIds: ["messy_cue_yellow"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_005",
          quote: "just enough to make everything yellow",
          reason: "This directly supports the turmeric amount cue.",
        },
      ],
    },
    {
      id: "messy_step_005",
      orderIndex: 4,
      instruction: "Fold in the damp poha. If it clumps, sprinkle water with your fingers.",
      sensoryCueIds: ["messy_cue_clumping"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_006",
          quote: "If it clumped, she sprinkled water with her fingers",
          reason: "This directly supports the corrective texture cue.",
        },
      ],
    },
    {
      id: "messy_step_006",
      orderIndex: 5,
      instruction: "Finish with lemon, cilantro, and sev.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_007",
          quote: "At the end lemon, cilantro, and sev",
          reason: "This supports the final garnish step.",
        },
      ],
    },
  ],
  sensoryCues: [
    {
      id: "messy_cue_poha_texture",
      type: "texture",
      cue: "poha feels damp but not soggy",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_006",
          quote: "felt damp but not soggy",
          reason: "The phrase gives a texture cue.",
        },
      ],
    },
    {
      id: "messy_cue_mustard_pop",
      type: "sound",
      cue: "mustard seeds pop",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_003",
          quote: "until they popped",
          reason: "The phrase gives a sound cue.",
        },
      ],
    },
    {
      id: "messy_cue_onion_smell",
      type: "smell",
      cue: "onion loses its raw smell",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_004",
          quote: "onion lost its raw smell",
          reason: "The phrase gives a smell cue.",
        },
      ],
    },
    {
      id: "messy_cue_potato_edges",
      type: "texture",
      cue: "potato is soft at the edges",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_004",
          quote: "potato was soft at the edges",
          reason: "The phrase gives a texture cue.",
        },
      ],
    },
    {
      id: "messy_cue_yellow",
      type: "look",
      cue: "everything turns yellow",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_005",
          quote: "make everything yellow",
          reason: "The phrase gives a visual cue.",
        },
      ],
    },
    {
      id: "messy_cue_clumping",
      type: "texture",
      cue: "poha clumps if too dry",
      provenance: [
        {
          transcriptSegmentId: "messy_seg_006",
          quote: "If it clumped",
          reason: "The phrase gives a texture problem to correct.",
        },
      ],
    },
  ],
  openQuestions: [
    {
      id: "messy_q_heat",
      target: "temperature",
      question: "What heat level should be used while cooking the potato and poha?",
      whyItMatters: "The transcript explicitly says the heat level is unknown.",
      priority: "high",
      relatedStepIds: ["messy_step_003", "messy_step_005"],
    },
    {
      id: "messy_q_timing",
      target: "timing",
      question: "About how long does the potato cook before the poha goes in?",
      whyItMatters: "The transcript gives edge softness but no timing.",
      priority: "medium",
      relatedStepIds: ["messy_step_003"],
      relatedCueIds: ["messy_cue_potato_edges"],
    },
    {
      id: "messy_q_onion_amount",
      target: "ingredient",
      question: "How much onion should be used when there is not just a leftover piece?",
      whyItMatters: "The transcript gives an uncertain onion amount.",
      priority: "medium",
      relatedIngredientIds: ["messy_ing_onion"],
    },
  ],
  createdAt,
};

const messyAnswers: Record<string, FollowUpAnswer> = {
  messy_q_heat: {
    questionId: "messy_q_heat",
    answer: "Use medium-low heat after the mustard seeds pop.",
    answeredAt,
  },
};

const messyLiving: LivingRecipe = {
  id: "living_eval_messy",
  captureId: messyDraft.captureId,
  title: messyDraft.dishName,
  summary: "A transcript-backed poha with vague quantities preserved and one user heat note.",
  familyContext: messyDraft.familyContext,
  ingredients: messyDraft.ingredients,
  steps: messyDraft.steps.map((step) =>
    step.id === "messy_step_003"
      ? {
          ...step,
          instruction:
            "On medium-low heat, cook the onion and tiny-chopped potato until the onion loses its raw smell and the potato softens at the edges.",
        }
      : step.id === "messy_step_005"
        ? {
            ...step,
            instruction:
              "Keep the pan on medium-low heat and fold in the damp poha. If it clumps, sprinkle water with your fingers.",
          }
        : step,
  ),
  sensoryCues: messyDraft.sensoryCues,
  resolvedQuestions: [
    {
      questionId: "messy_q_heat",
      answer: "User-provided: Use medium-low heat after the mustard seeds pop.",
      appliedToStepIds: ["messy_step_003", "messy_step_005"],
    },
  ],
  unresolvedQuestions: messyDraft.openQuestions.filter((question) => question.id !== "messy_q_heat"),
  sourceSummary: {
    transcriptSegmentCount: messyTranscript.length,
    supportedStepCount: messyDraft.steps.length,
    inferredStepCount: 0,
  },
  createdAt,
};

const contradictoryTranscript: TranscriptSegment[] = [
  {
    id: "contra_seg_001",
    captureId: "cap_eval_contradictory",
    orderIndex: 0,
    speaker: "Leo",
    text: "Grandpa's Sunday tomato sauce started with garlic in olive oil, I think, but my sister says he started with onion first.",
  },
  {
    id: "contra_seg_002",
    captureId: "cap_eval_contradictory",
    orderIndex: 1,
    speaker: "Leo",
    text: "He used canned tomatoes, maybe two cans, or maybe one big jar of passata when tomatoes were not good.",
  },
  {
    id: "contra_seg_003",
    captureId: "cap_eval_contradictory",
    orderIndex: 2,
    speaker: "Leo",
    text: "There was basil, but I cannot remember if it went in early or only at the end.",
  },
  {
    id: "contra_seg_004",
    captureId: "cap_eval_contradictory",
    orderIndex: 3,
    speaker: "Leo",
    text: "He simmered it until it stopped tasting tinny and looked darker, but nobody agrees if that was thirty minutes or all afternoon.",
  },
  {
    id: "contra_seg_005",
    captureId: "cap_eval_contradictory",
    orderIndex: 4,
    speaker: "Leo",
    text: "Sometimes he added sugar, but Aunt Rosa swears never sugar, just a carrot if the sauce was sharp.",
  },
  {
    id: "contra_seg_006",
    captureId: "cap_eval_contradictory",
    orderIndex: 5,
    speaker: "Leo",
    text: "Salt at the end, and black pepper, but I do not remember the amounts.",
  },
];

const contradictoryDraft: RecipeDraft = {
  id: "draft_eval_contradictory",
  captureId: "cap_eval_contradictory",
  dishName: "Grandpa's Sunday Tomato Sauce",
  familyContext: "A family sauce memory with unresolved disagreements between relatives.",
  summary:
    "A draft that preserves conflicting aromatics, tomato formats, basil timing, simmer duration, and sweetening choices.",
  ingredients: [
    {
      id: "contra_ing_aromatics",
      name: "garlic and/or onion",
      quantity: "unspecified; starting aromatic is disputed",
      optional: false,
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_001",
          quote: "garlic in olive oil, I think, but my sister says he started with onion first",
          reason: "The speaker reports a contradiction about the starting aromatic.",
        },
      ],
    },
    {
      id: "contra_ing_oil",
      name: "olive oil",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_001",
          quote: "garlic in olive oil",
          reason: "The speaker names olive oil.",
        },
      ],
    },
    {
      id: "contra_ing_tomatoes",
      name: "canned tomatoes or passata",
      quantity: "maybe two cans or one big jar",
      optional: false,
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_002",
          quote: "maybe two cans, or maybe one big jar of passata",
          reason: "The speaker gives uncertain alternatives.",
        },
      ],
    },
    {
      id: "contra_ing_basil",
      name: "basil",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_003",
          quote: "I cannot remember if it went in early or only at the end",
          reason: "The speaker names basil but is uncertain about timing.",
        },
      ],
    },
    {
      id: "contra_ing_sweetener",
      name: "sugar or carrot",
      quantity: "only if sauce was sharp; disputed",
      optional: true,
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_005",
          quote: "Sometimes he added sugar, but Aunt Rosa swears never sugar, just a carrot",
          reason: "The speaker reports a contradiction about sweetening.",
        },
      ],
    },
    {
      id: "contra_ing_seasoning",
      name: "salt and black pepper",
      quantity: "unspecified",
      optional: false,
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_006",
          quote: "Salt at the end, and black pepper",
          reason: "The speaker names final seasoning.",
        },
      ],
    },
  ],
  steps: [
    {
      id: "contra_step_001",
      orderIndex: 0,
      instruction:
        "Start the sauce with olive oil and either garlic or onion; the transcript is contradictory about which aromatic came first.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_001",
          quote: "garlic in olive oil, I think, but my sister says he started with onion first",
          reason: "This directly supports the unresolved starting-step contradiction.",
        },
      ],
    },
    {
      id: "contra_step_002",
      orderIndex: 1,
      instruction:
        "Add canned tomatoes or passata, preserving the uncertainty between maybe two cans and one big jar.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_002",
          quote: "maybe two cans, or maybe one big jar of passata",
          reason: "This directly supports the uncertain tomato format and quantity.",
        },
      ],
    },
    {
      id: "contra_step_003",
      orderIndex: 2,
      instruction:
        "Simmer until the sauce no longer tastes tinny and looks darker; the exact duration is unresolved.",
      timing: "unknown: thirty minutes or all afternoon",
      sensoryCueIds: ["contra_cue_not_tinny", "contra_cue_darker"],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_004",
          quote: "until it stopped tasting tinny and looked darker",
          reason: "This directly supports the doneness cues.",
        },
      ],
    },
    {
      id: "contra_step_004",
      orderIndex: 3,
      instruction:
        "Use basil either early or at the end; the transcript does not resolve the timing.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_003",
          quote: "I cannot remember if it went in early or only at the end",
          reason: "This directly supports the unresolved basil timing.",
        },
      ],
    },
    {
      id: "contra_step_005",
      orderIndex: 4,
      instruction:
        "If the sauce tastes sharp, the family memory conflicts between adding sugar and using a carrot, so leave the choice unresolved.",
      sensoryCueIds: ["contra_cue_sharp"],
      isInferred: false,
      confidence: "low",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_005",
          quote: "Sometimes he added sugar, but Aunt Rosa swears never sugar, just a carrot",
          reason: "This directly supports the unresolved sweetening contradiction.",
        },
      ],
    },
    {
      id: "contra_step_006",
      orderIndex: 5,
      instruction: "Season with salt and black pepper at the end, with amounts still unspecified.",
      sensoryCueIds: [],
      isInferred: false,
      confidence: "medium",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_006",
          quote: "Salt at the end, and black pepper",
          reason: "This directly supports the final seasoning step.",
        },
      ],
    },
  ],
  sensoryCues: [
    {
      id: "contra_cue_not_tinny",
      type: "texture",
      cue: "sauce stopped tasting tinny",
      interpretation: "Flavor cue from transcript; schema lacks taste as a cue type.",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_004",
          quote: "stopped tasting tinny",
          reason: "The phrase gives a taste cue.",
        },
      ],
    },
    {
      id: "contra_cue_darker",
      type: "look",
      cue: "sauce looked darker",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_004",
          quote: "looked darker",
          reason: "The phrase gives a visual cue.",
        },
      ],
    },
    {
      id: "contra_cue_sharp",
      type: "texture",
      cue: "sauce was sharp",
      interpretation: "Flavor cue from transcript; schema lacks taste as a cue type.",
      provenance: [
        {
          transcriptSegmentId: "contra_seg_005",
          quote: "if the sauce was sharp",
          reason: "The phrase gives a flavor cue despite the limited cue enum.",
        },
      ],
    },
  ],
  openQuestions: [
    {
      id: "contra_q_aromatic",
      target: "step",
      question: "Did Grandpa start the sauce with garlic first or onion first?",
      whyItMatters: "The transcript contains conflicting family accounts.",
      priority: "high",
      relatedStepIds: ["contra_step_001"],
      relatedIngredientIds: ["contra_ing_aromatics"],
    },
    {
      id: "contra_q_tomatoes",
      target: "ingredient",
      question: "Was the usual base two cans of tomatoes or one big jar of passata?",
      whyItMatters: "The transcript preserves two uncertain tomato formats.",
      priority: "high",
      relatedStepIds: ["contra_step_002"],
      relatedIngredientIds: ["contra_ing_tomatoes"],
    },
    {
      id: "contra_q_basil",
      target: "step",
      question: "Did basil go in early, at the end, or both?",
      whyItMatters: "The transcript says the basil timing is not remembered.",
      priority: "medium",
      relatedStepIds: ["contra_step_004"],
      relatedIngredientIds: ["contra_ing_basil"],
    },
    {
      id: "contra_q_duration",
      target: "timing",
      question: "Was the simmer closer to thirty minutes or all afternoon?",
      whyItMatters: "The transcript reports disagreement about simmer duration.",
      priority: "medium",
      relatedStepIds: ["contra_step_003"],
      relatedCueIds: ["contra_cue_not_tinny", "contra_cue_darker"],
    },
  ],
  createdAt,
};

const contradictoryAnswers: Record<string, FollowUpAnswer> = {
  contra_q_aromatic: {
    questionId: "contra_q_aromatic",
    answer: "Use garlic first, then add onion once the garlic smells sweet.",
    answeredAt,
  },
};

const contradictoryLiving: LivingRecipe = {
  id: "living_eval_contradictory",
  captureId: contradictoryDraft.captureId,
  title: contradictoryDraft.dishName,
  summary:
    "A transcript-backed tomato sauce that incorporates one user clarification while keeping unresolved contradictions visible.",
  familyContext: contradictoryDraft.familyContext,
  ingredients: contradictoryDraft.ingredients,
  steps: contradictoryDraft.steps.map((step) =>
    step.id === "contra_step_001"
      ? {
          ...step,
          instruction:
            "Start the sauce with olive oil and garlic first, then add onion once the garlic smells sweet; this aromatic order comes from a user follow-up answer.",
        }
      : step,
  ),
  sensoryCues: contradictoryDraft.sensoryCues,
  resolvedQuestions: [
    {
      questionId: "contra_q_aromatic",
      answer:
        "User-provided: Use garlic first, then add onion once the garlic smells sweet.",
      appliedToStepIds: ["contra_step_001"],
      appliedToIngredientIds: ["contra_ing_aromatics"],
    },
  ],
  unresolvedQuestions: contradictoryDraft.openQuestions.filter(
    (question) => question.id !== "contra_q_aromatic",
  ),
  sourceSummary: {
    transcriptSegmentCount: contradictoryTranscript.length,
    supportedStepCount: contradictoryDraft.steps.length,
    inferredStepCount: 0,
  },
  createdAt,
};

export const evalFixtures: EvalFixture[] = [
  {
    id: "clear-recipe-memory",
    name: "Clear recipe memory",
    description: "Happy path with explicit sequence and some measured quantities.",
    transcriptSegments: clearTranscript,
    expectedExtraction: clearDraft,
    followUpAnswers: clearAnswers,
    expectedFinalization: clearLiving,
    expectations: {
      minIngredients: 4,
      minSteps: 3,
      minSensoryCues: 2,
      minFollowUpQuestions: 1,
      shouldPreserveVagueQuantities: false,
      shouldDetectContradictions: false,
      expectedVagueTerms: [],
      expectedUncertaintyTerms: ["thicker", "loose"],
      forbiddenInventedQuantities: [],
      expectedAnswerSnippets: ["loose enough to spoon over rice"],
    },
  },
  {
    id: "messy-family-memory",
    name: "Messy family memory with vague quantities",
    description: "Tests handfuls, sensory cues, and missing heat or timing details.",
    transcriptSegments: messyTranscript,
    expectedExtraction: messyDraft,
    followUpAnswers: messyAnswers,
    expectedFinalization: messyLiving,
    expectations: {
      minIngredients: 5,
      minSteps: 3,
      minSensoryCues: 4,
      minFollowUpQuestions: 3,
      shouldPreserveVagueQuantities: true,
      shouldDetectContradictions: false,
      expectedVagueTerms: ["handful", "not soggy", "not too much", "whatever was left"],
      expectedUncertaintyTerms: ["unknown", "unspecified"],
      forbiddenInventedQuantities: ["2 cups", "1 cup", "1/2 cup", "30 minutes"],
      expectedAnswerSnippets: ["medium-low heat"],
    },
  },
  {
    id: "contradictory-uncertain-memory",
    name: "Contradictory and uncertain memory",
    description: "Tests unresolved contradictions instead of silent conflict resolution.",
    transcriptSegments: contradictoryTranscript,
    expectedExtraction: contradictoryDraft,
    followUpAnswers: contradictoryAnswers,
    expectedFinalization: contradictoryLiving,
    expectations: {
      minIngredients: 5,
      minSteps: 3,
      minSensoryCues: 2,
      minFollowUpQuestions: 3,
      shouldPreserveVagueQuantities: true,
      shouldDetectContradictions: true,
      expectedVagueTerms: ["maybe", "unspecified", "disputed"],
      expectedUncertaintyTerms: ["contradict", "disputed", "unresolved", "not remembered"],
      forbiddenInventedQuantities: ["28 ounces", "1 tablespoon", "45 minutes"],
      expectedAnswerSnippets: ["garlic first"],
    },
  },
];
