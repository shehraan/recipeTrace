"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type {
  AppliedStepAnswer,
  ProvenanceSelectionSource,
} from "@/src/lib/recipe/provenance-selection";
import type {
  Ingredient,
  OpenQuestion,
  ProvenanceLink,
  RecipeStep,
  TranscriptSegment,
} from "@/src/lib/recipe/types";

import { useDemo } from "./demo-provider";

type EvidenceDrawerProps = {
  step: RecipeStep | null;
  ingredient: Ingredient | null;
  selectionSource: ProvenanceSelectionSource | null;
  segmentsById: Map<string, TranscriptSegment>;
  appliedAnswers: AppliedStepAnswer[];
  unresolvedForStep: OpenQuestion[];
  unresolvedForIngredient: OpenQuestion[];
  isOpen: boolean;
  onClose: () => void;
};

export function EvidenceDrawer({
  step,
  ingredient,
  selectionSource,
  segmentsById,
  appliedAnswers,
  unresolvedForStep,
  unresolvedForIngredient,
  isOpen,
  onClose,
}: EvidenceDrawerProps) {
  if (!isOpen) {
    return null;
  }

  const selectedItem = step ?? ingredient;
  const isIngredient = ingredient !== null && step === null;
  const itemLabel = isIngredient
    ? selectionSource === "living"
      ? "Selected final ingredient"
      : "Selected ingredient"
    : selectionSource === "living"
      ? "Selected final step"
      : "Selected step";
  const unresolvedQuestions = isIngredient ? unresolvedForIngredient : unresolvedForStep;
  const unresolvedLabel = isIngredient
    ? "Still unresolved for this ingredient"
    : "Still unresolved for this step";

  return (
    <>
      <button
        type="button"
        aria-label="Close evidence panel"
        className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Source evidence"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-amber-200/80 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
              Source evidence
            </p>
            {selectionSource === "living" ? (
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                Living recipe
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!selectedItem ? (
            <p className="text-sm text-stone-500">Select a step or ingredient to view evidence.</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-stone-900">{itemLabel}</h3>
              {isIngredient && ingredient ? (
                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm leading-relaxed text-stone-800">
                  <span className="font-medium">{ingredient.name}</span>
                  {ingredient.quantity ? (
                    <span className="text-stone-600"> — {ingredient.quantity}</span>
                  ) : null}
                  {ingredient.preparation ? (
                    <span className="text-stone-500"> ({ingredient.preparation})</span>
                  ) : null}
                </p>
              ) : step ? (
                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm leading-relaxed text-stone-800">
                  {step.instruction}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <DetailBadge tone="source">Source-backed</DetailBadge>
                {selectedItem.isInferred ? <DetailBadge tone="inferred">Inferred</DetailBadge> : null}
                {appliedAnswers.length > 0 ? (
                  <DetailBadge tone="answered">User-answered</DetailBadge>
                ) : null}
                {unresolvedQuestions.length > 0 ? (
                  <DetailBadge tone="unresolved">Unresolved</DetailBadge>
                ) : null}
              </div>

              {appliedAnswers.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                    User answer evidence
                  </p>
                  {appliedAnswers.map(({ question, answer }) => (
                    <article
                      key={question.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                    >
                      <DetailBadge tone="answered">Your answer</DetailBadge>
                      <p className="mt-2 text-sm font-semibold text-stone-900">{question.question}</p>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600">{answer}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                  Transcript evidence
                </p>
                {selectedItem.provenance.map((link, index) => (
                  <EvidenceItem
                    key={`${link.transcriptSegmentId}-${index}`}
                    link={link}
                    segment={segmentsById.get(link.transcriptSegmentId)}
                    supportLabel={
                      isIngredient
                        ? "Why it supports this ingredient: "
                        : "Why it supports this step: "
                    }
                  />
                ))}
              </div>

              {unresolvedQuestions.length > 0 ? (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    {unresolvedLabel}
                  </p>
                  {unresolvedQuestions.map((question) => (
                    <article
                      key={question.id}
                      className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4"
                    >
                      <DetailBadge tone="unresolved">Unresolved</DetailBadge>
                      <p className="mt-2 text-sm font-medium text-stone-900">{question.question}</p>
                      <p className="mt-1 text-sm text-stone-500">{question.whyItMatters}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              <Link
                href="/demo/transcript"
                className="mt-6 inline-flex text-sm font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline"
              >
                Go back to view full transcript
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export function DemoEvidenceDrawer() {
  const {
    provenanceSelection,
    selectionSource,
    segmentsById,
    isDrawerOpen,
    closeEvidenceDrawer,
  } = useDemo();

  return (
    <EvidenceDrawer
      step={provenanceSelection.step}
      ingredient={provenanceSelection.ingredient}
      selectionSource={selectionSource}
      segmentsById={segmentsById}
      appliedAnswers={provenanceSelection.appliedAnswers}
      unresolvedForStep={provenanceSelection.unresolvedForStep}
      unresolvedForIngredient={provenanceSelection.unresolvedForIngredient}
      isOpen={isDrawerOpen}
      onClose={closeEvidenceDrawer}
    />
  );
}

function EvidenceItem({
  link,
  segment,
  supportLabel = "Why it supports this step: ",
}: {
  link: ProvenanceLink;
  segment: TranscriptSegment | undefined;
  supportLabel?: string;
}) {
  return (
    <article className="rounded-xl border border-stone-100 bg-stone-50/80 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span className="rounded-md bg-white px-2 py-0.5 font-mono text-stone-600 ring-1 ring-stone-200 ring-inset">
          {link.transcriptSegmentId}
        </span>
        {segment?.speaker ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
            {segment.speaker}
          </span>
        ) : null}
        <DetailBadge tone="source">Source-backed</DetailBadge>
      </div>

      <blockquote className="mt-3 border-l-2 border-amber-300 pl-3 text-sm italic leading-relaxed text-stone-700">
        &ldquo;{link.quote}&rdquo;
      </blockquote>

      {segment && segment.text !== link.quote ? (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          <span className="font-medium text-stone-700">Full segment: </span>
          {segment.text}
        </p>
      ) : null}

      {link.reason ? (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          <span className="font-medium text-stone-700">{supportLabel}</span>
          {link.reason}
        </p>
      ) : null}
    </article>
  );
}

function DetailBadge({
  tone,
  children,
}: {
  tone: "source" | "answered" | "inferred" | "unresolved";
  children: React.ReactNode;
}) {
  const styles = {
    source: "bg-amber-100 text-amber-900",
    answered: "bg-emerald-100 text-emerald-800",
    inferred: "bg-violet-100 text-violet-800",
    unresolved: "bg-stone-200 text-stone-700",
  } as const;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}
