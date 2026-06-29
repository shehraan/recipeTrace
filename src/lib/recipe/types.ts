export const captureStatusValues = [
  "created",
  "transcribed",
  "extracted",
  "finalized",
  "failed",
] as const;

export const confidenceValues = ["low", "medium", "high"] as const;

export const cueTypeValues = [
  "look",
  "smell",
  "sound",
  "texture",
  "timing",
  "temperature",
] as const;

export const questionTargetValues = [
  "ingredient",
  "step",
  "timing",
  "temperature",
  "texture",
  "serving",
  "context",
] as const;

export type CaptureStatus = (typeof captureStatusValues)[number];
export type Confidence = (typeof confidenceValues)[number];
export type CueType = (typeof cueTypeValues)[number];
export type QuestionTarget = (typeof questionTargetValues)[number];

export type CaptureSource =
  | {
      type: "demo";
      fixtureId: string;
    }
  | {
      type: "paste";
      transcriptText: string;
    }
  | {
      type: "audio";
      audioUrl?: string;
      fileName?: string;
      mimeType?: string;
    };

export type Capture = {
  id: string;
  title: string;
  status: CaptureStatus;
  source: CaptureSource;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptSegment = {
  id: string;
  captureId: string;
  orderIndex: number;
  speaker?: string;
  text: string;
  startMs?: number;
  endMs?: number;
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
  unit?: string;
  preparation?: string;
  optional: boolean;
  isInferred: boolean;
  confidence: Confidence;
  provenance: ProvenanceLink[];
};

type SensoryCueBase = {
  id: string;
  cue: string;
  interpretation?: string;
  provenance: ProvenanceLink[];
};

export type SensoryCue =
  | (SensoryCueBase & { type: "look" })
  | (SensoryCueBase & { type: "smell" })
  | (SensoryCueBase & { type: "sound" })
  | (SensoryCueBase & { type: "texture" })
  | (SensoryCueBase & { type: "timing" })
  | (SensoryCueBase & { type: "temperature" });

export type RecipeStep = {
  id: string;
  orderIndex: number;
  instruction: string;
  timing?: string;
  temperature?: string;
  sensoryCueIds: string[];
  isInferred: boolean;
  confidence: Confidence;
  provenance: ProvenanceLink[];
};

export type OpenQuestion = {
  id: string;
  question: string;
  whyItMatters: string;
  target: QuestionTarget;
  priority: "low" | "medium" | "high";
  relatedStepIds?: string[];
  relatedIngredientIds?: string[];
  relatedCueIds?: string[];
};

export type FollowUpAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
};

export type RecipeDraft = {
  id: string;
  captureId: string;
  dishName: string;
  familyContext?: string;
  summary?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sensoryCues: SensoryCue[];
  openQuestions: OpenQuestion[];
  createdAt: string;
};

export type LivingRecipe = {
  id: string;
  captureId: string;
  title: string;
  summary: string;
  familyContext?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sensoryCues: SensoryCue[];
  resolvedQuestions: {
    questionId: string;
    answer: string;
    appliedToStepIds?: string[];
    appliedToIngredientIds?: string[];
  }[];
  unresolvedQuestions: OpenQuestion[];
  sourceSummary: {
    transcriptSegmentCount: number;
    supportedStepCount: number;
    inferredStepCount: number;
  };
  createdAt: string;
};
