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
  livingRecipe: LivingRecipe;
  segmentsById: Map<string, TranscriptSegment>;
  questionsById: Map<string, OpenQuestion>;
  followUpAnswers: Record<string, FollowUpAnswer>;
  setFollowUpAnswers: (answers: Record<string, FollowUpAnswer>) => void;
  finalizeLivingRecipe: () => Promise<void>;
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
  const { capture, transcriptSegments, recipeDraft } = seededDemo;
  const [followUpAnswersState, setFollowUpAnswersState] = useState<Record<string, FollowUpAnswer>>({});
  const [aiLivingRecipe, setAiLivingRecipe] = useState<LivingRecipe | null>(null);
  const [isFinalizingLivingRecipe, setIsFinalizingLivingRecipe] = useState(false);
  const [finalizeLivingRecipeError, setFinalizeLivingRecipeError] = useState<string | null>(null);
  const [finalizeLivingRecipeStatus, setFinalizeLivingRecipeStatus] = useState("Using local fallback");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<ProvenanceSelectionSource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        setFinalizeLivingRecipeError(`${message} Showing the local living recipe instead.`);
        setFinalizeLivingRecipeStatus(`AI failed validation: ${message}`);
        return;
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
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RecipeTrace] AI finalization response missing livingRecipe", payload);
        }
        setFinalizeLivingRecipeError(
          "The finalization response was missing a living recipe. Showing the local living recipe instead.",
        );
        setFinalizeLivingRecipeStatus("Using local fallback");
      }
    } catch {
      setFinalizeLivingRecipeError(
        "Unable to reach the finalization route. Showing the local living recipe instead.",
      );
      setFinalizeLivingRecipeStatus("Using local fallback");
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RecipeTrace] AI finalization request failed");
      }
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
      livingRecipe,
      segmentsById,
      questionsById,
      followUpAnswers: followUpAnswersState,
      setFollowUpAnswers,
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
      livingRecipe,
      segmentsById,
      questionsById,
      followUpAnswersState,
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
