"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { seededDemo } from "@/src/lib/demo/seeded-demo";
import { buildLivingRecipeFromDraft } from "@/src/lib/recipe/build-living-recipe";
import {
  buildProvenanceSelection,
  type ProvenanceSelection,
  type ProvenanceSelectionSource,
} from "@/src/lib/recipe/provenance-selection";
import type { Capture, FollowUpAnswer, LivingRecipe, OpenQuestion, RecipeDraft, TranscriptSegment } from "@/src/lib/recipe/types";

type DemoContextValue = {
  capture: Capture;
  transcriptSegments: TranscriptSegment[];
  recipeDraft: RecipeDraft;
  hasLiveRecipeDraft: boolean;
  livingRecipe: LivingRecipe;
  segmentsById: Map<string, TranscriptSegment>;
  questionsById: Map<string, OpenQuestion>;
  followUpAnswers: Record<string, FollowUpAnswer>;
  setFollowUpAnswers: (answers: Record<string, FollowUpAnswer>) => void;
  extractRecipeDraftFromMemory: (memoryText: string) => Promise<boolean>;
  isExtractingRecipeDraft: boolean;
  extractRecipeDraftError: string | null;
  extractRecipeDraftStatus: string;
  finalizeLivingRecipe: () => Promise<boolean>;
  isFinalizingLivingRecipe: boolean;
  finalizeLivingRecipeError: string | null;
  finalizeLivingRecipeStatus: string;
  selectedStepId: string | null;
  selectedIngredientId: string | null;
  selectionSource: ProvenanceSelectionSource | null;
  isDrawerOpen: boolean;
  provenanceSelection: ProvenanceSelection;
  openEvidenceDrawer: (stepId: string, source: ProvenanceSelectionSource) => void;
  openIngredientEvidenceDrawer: (ingredientId: string, source: ProvenanceSelectionSource) => void;
  closeEvidenceDrawer: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [liveCapture, setLiveCapture] = useState<Capture | null>(null);
  const [liveTranscriptSegments, setLiveTranscriptSegments] = useState<TranscriptSegment[] | null>(
    null,
  );
  const [liveRecipeDraft, setLiveRecipeDraft] = useState<RecipeDraft | null>(null);
  const [followUpAnswersState, setFollowUpAnswersState] = useState<Record<string, FollowUpAnswer>>({});
  const [aiLivingRecipe, setAiLivingRecipe] = useState<LivingRecipe | null>(null);
  const [isExtractingRecipeDraft, setIsExtractingRecipeDraft] = useState(false);
  const [extractRecipeDraftError, setExtractRecipeDraftError] = useState<string | null>(null);
  const [extractRecipeDraftStatus, setExtractRecipeDraftStatus] = useState("Seeded draft ready");
  const [isFinalizingLivingRecipe, setIsFinalizingLivingRecipe] = useState(false);
  const [finalizeLivingRecipeError, setFinalizeLivingRecipeError] = useState<string | null>(null);
  const [finalizeLivingRecipeStatus, setFinalizeLivingRecipeStatus] = useState("Using local fallback");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<ProvenanceSelectionSource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const capture = liveCapture ?? seededDemo.capture;
  const transcriptSegments = liveTranscriptSegments ?? seededDemo.transcriptSegments;
  const recipeDraft = liveRecipeDraft ?? seededDemo.recipeDraft;
  const hasLiveRecipeDraft = liveRecipeDraft !== null;

  const fallbackLivingRecipe = useMemo(
    () => buildLivingRecipeFromDraft(recipeDraft, followUpAnswersState, transcriptSegments.length),
    [recipeDraft, followUpAnswersState, transcriptSegments.length],
  );

  const livingRecipe = aiLivingRecipe ?? fallbackLivingRecipe;

  const setFollowUpAnswers = useCallback((answers: Record<string, FollowUpAnswer>) => {
    setFollowUpAnswersState(answers);
    setAiLivingRecipe(null);
    setFinalizeLivingRecipeError(null);
    setFinalizeLivingRecipeStatus("Using local fallback");
  }, []);

  const extractRecipeDraftFromMemory = useCallback(async (memoryText: string) => {
    const trimmedMemoryText = memoryText.trim();

    if (!trimmedMemoryText) {
      setExtractRecipeDraftError("Paste a cooking memory before extracting a recipe draft.");
      setExtractRecipeDraftStatus("Waiting for pasted memory");
      return false;
    }

    const nextCapture = buildPastedMemoryCapture(trimmedMemoryText);
    const nextTranscriptSegments = splitPastedMemoryIntoSegments(
      trimmedMemoryText,
      nextCapture.id,
    );

    if (nextTranscriptSegments.length === 0) {
      setExtractRecipeDraftError("The pasted memory did not contain any extractable transcript text.");
      setExtractRecipeDraftStatus("No transcript segments found");
      return false;
    }

    setIsExtractingRecipeDraft(true);
    setExtractRecipeDraftError(null);
    setExtractRecipeDraftStatus("Extracting recipe draft");

    try {
      const response = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptSegments: nextTranscriptSegments,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = extractApiErrorMessage(payload);
        setExtractRecipeDraftError(message);
        setExtractRecipeDraftStatus(`Extraction failed: ${message}`);
        return false;
      }

      if (!isRecipeDraftPayload(payload)) {
        const message = "Extraction succeeded, but the response was missing a recipe draft.";
        setExtractRecipeDraftError(message);
        setExtractRecipeDraftStatus("Extraction response was incomplete");
        return false;
      }

      setLiveCapture(nextCapture);
      setLiveTranscriptSegments(nextTranscriptSegments);
      setLiveRecipeDraft(payload.recipeDraft);
      setFollowUpAnswersState({});
      setAiLivingRecipe(null);
      setFinalizeLivingRecipeError(null);
      setFinalizeLivingRecipeStatus("Using local fallback");
      setSelectedStepId(null);
      setSelectedIngredientId(null);
      setSelectionSource(null);
      setIsDrawerOpen(false);
      setExtractRecipeDraftError(null);
      setExtractRecipeDraftStatus("Live recipe draft extracted");
      return true;
    } catch {
      const message = "Unable to reach the extraction route. Check the dev server and try again.";
      setExtractRecipeDraftError(message);
      setExtractRecipeDraftStatus("Extraction request failed");
      return false;
    } finally {
      setIsExtractingRecipeDraft(false);
    }
  }, []);

  const finalizeLivingRecipe = useCallback(async () => {
    setIsFinalizingLivingRecipe(true);
    setFinalizeLivingRecipeError(null);
    setFinalizeLivingRecipeStatus("Generating with AI");

    try {
      const response = await fetch("/api/recipes/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeDraft,
          transcriptSegments,
          followUpAnswers: followUpAnswersState,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to generate an AI-finalized living recipe.";
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RecipeTrace] AI finalization failed", payload);
        }
        setFinalizeLivingRecipeError(message);
        setFinalizeLivingRecipeStatus(`AI failed validation: ${message}`);
        return false;
      }

      if (
        payload &&
        typeof payload === "object" &&
        "livingRecipe" in payload
      ) {
        setAiLivingRecipe(payload.livingRecipe as LivingRecipe);
        setFinalizeLivingRecipeStatus("Generated with AI");
        if (process.env.NODE_ENV !== "production") {
          console.info("[RecipeTrace] AI finalization succeeded", payload);
        }
        return true;
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("[RecipeTrace] AI finalization response missing livingRecipe", payload);
      }
      setFinalizeLivingRecipeError(
        "The finalization response was missing a living recipe.",
      );
      setFinalizeLivingRecipeStatus("Using local fallback");
      return false;
    } catch {
      setFinalizeLivingRecipeError(
        "Unable to reach the finalization route. Check the dev server and try again.",
      );
      setFinalizeLivingRecipeStatus("Using local fallback");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RecipeTrace] AI finalization request failed");
      }
      return false;
    } finally {
      setIsFinalizingLivingRecipe(false);
    }
  }, [recipeDraft, transcriptSegments, followUpAnswersState]);

  const segmentsById = useMemo(
    () => new Map(transcriptSegments.map((segment) => [segment.id, segment])),
    [transcriptSegments],
  );

  const questionsById = useMemo(
    () => new Map(recipeDraft.openQuestions.map((question) => [question.id, question])),
    [recipeDraft.openQuestions],
  );

  const provenanceSelection = useMemo(
    () =>
      buildProvenanceSelection(
        selectedStepId,
        selectedIngredientId,
        recipeDraft,
        livingRecipe,
        followUpAnswersState,
      ),
    [selectedStepId, selectedIngredientId, recipeDraft, livingRecipe, followUpAnswersState],
  );

  const openEvidenceDrawer = useCallback((stepId: string, source: ProvenanceSelectionSource) => {
    setSelectedStepId(stepId);
    setSelectedIngredientId(null);
    setSelectionSource(source);
    setIsDrawerOpen(true);
  }, []);

  const openIngredientEvidenceDrawer = useCallback(
    (ingredientId: string, source: ProvenanceSelectionSource) => {
      setSelectedIngredientId(ingredientId);
      setSelectedStepId(null);
      setSelectionSource(source);
      setIsDrawerOpen(true);
    },
    [],
  );

  const closeEvidenceDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      capture,
      transcriptSegments,
      recipeDraft,
      hasLiveRecipeDraft,
      livingRecipe,
      segmentsById,
      questionsById,
      followUpAnswers: followUpAnswersState,
      setFollowUpAnswers,
      extractRecipeDraftFromMemory,
      isExtractingRecipeDraft,
      extractRecipeDraftError,
      extractRecipeDraftStatus,
      finalizeLivingRecipe,
      isFinalizingLivingRecipe,
      finalizeLivingRecipeError,
      finalizeLivingRecipeStatus,
      selectedStepId,
      selectedIngredientId,
      selectionSource,
      isDrawerOpen,
      provenanceSelection,
      openEvidenceDrawer,
      openIngredientEvidenceDrawer,
      closeEvidenceDrawer,
    }),
    [
      capture,
      transcriptSegments,
      recipeDraft,
      hasLiveRecipeDraft,
      livingRecipe,
      segmentsById,
      questionsById,
      followUpAnswersState,
      extractRecipeDraftFromMemory,
      isExtractingRecipeDraft,
      extractRecipeDraftError,
      extractRecipeDraftStatus,
      selectedStepId,
      selectedIngredientId,
      selectionSource,
      isDrawerOpen,
      provenanceSelection,
      finalizeLivingRecipe,
      isFinalizingLivingRecipe,
      finalizeLivingRecipeError,
      finalizeLivingRecipeStatus,
      openEvidenceDrawer,
      openIngredientEvidenceDrawer,
      closeEvidenceDrawer,
      setFollowUpAnswers,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return context;
}

function buildPastedMemoryCapture(transcriptText: string): Capture {
  const now = new Date().toISOString();
  const hash = stableTextHash(transcriptText);

  return {
    id: `paste-${hash}`,
    title: "Pasted cooking memory",
    status: "transcribed",
    source: {
      type: "paste",
      transcriptText,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function splitPastedMemoryIntoSegments(
  transcriptText: string,
  captureId: string,
): TranscriptSegment[] {
  const paragraphs = transcriptText
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = paragraphs.length > 1 ? paragraphs : splitSingleBlockIntoSegments(transcriptText);

  return chunks.map((text, index) => ({
    id: `${captureId}-seg-${String(index + 1).padStart(3, "0")}`,
    captureId,
    orderIndex: index,
    text,
  }));
}

function splitSingleBlockIntoSegments(transcriptText: string) {
  const normalized = transcriptText.replace(/\s+/g, " ").trim();
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const nextChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;

    if (nextChunk.length > 280 && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = trimmedSentence;
    } else {
      currentChunk = nextChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function stableTextHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function extractApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Recipe extraction failed with an unexpected response.";
  }

  const error = "error" in payload && typeof payload.error === "string" ? payload.error : null;
  const detail = "detail" in payload && typeof payload.detail === "string" ? payload.detail : null;
  const details =
    "details" in payload && Array.isArray(payload.details)
      ? payload.details
          .map((item) => {
            if (!item || typeof item !== "object" || !("message" in item)) {
              return null;
            }

            const path = "path" in item && typeof item.path === "string" ? item.path : null;
            const message = typeof item.message === "string" ? item.message : null;
            return message ? [path, message].filter(Boolean).join(": ") : null;
          })
          .filter(Boolean)
          .slice(0, 3)
          .join("; ")
      : null;

  return [error, detail, details].filter(Boolean).join(" ") || "Recipe extraction failed.";
}

function isRecipeDraftPayload(payload: unknown): payload is { recipeDraft: RecipeDraft } {
  return Boolean(payload && typeof payload === "object" && "recipeDraft" in payload);
}
