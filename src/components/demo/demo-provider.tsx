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
  selectedStepId: string | null;
  selectionSource: ProvenanceSelectionSource | null;
  isDrawerOpen: boolean;
  provenanceSelection: ProvenanceSelection;
  openEvidenceDrawer: (stepId: string, source: ProvenanceSelectionSource) => void;
  closeEvidenceDrawer: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const { capture, transcriptSegments, recipeDraft } = seededDemo;
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, FollowUpAnswer>>({});
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<ProvenanceSelectionSource | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const livingRecipe = useMemo(
    () => buildLivingRecipeFromDraft(recipeDraft, followUpAnswers, transcriptSegments.length),
    [recipeDraft, followUpAnswers, transcriptSegments.length],
  );

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
        recipeDraft,
        livingRecipe,
        followUpAnswers,
      ),
    [selectedStepId, recipeDraft, livingRecipe, followUpAnswers],
  );

  const openEvidenceDrawer = useCallback((stepId: string, source: ProvenanceSelectionSource) => {
    setSelectedStepId(stepId);
    setSelectionSource(source);
    setIsDrawerOpen(true);
  }, []);

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
      followUpAnswers,
      setFollowUpAnswers,
      selectedStepId,
      selectionSource,
      isDrawerOpen,
      provenanceSelection,
      openEvidenceDrawer,
      closeEvidenceDrawer,
    }),
    [
      capture,
      transcriptSegments,
      recipeDraft,
      livingRecipe,
      segmentsById,
      questionsById,
      followUpAnswers,
      selectedStepId,
      selectionSource,
      isDrawerOpen,
      provenanceSelection,
      openEvidenceDrawer,
      closeEvidenceDrawer,
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
