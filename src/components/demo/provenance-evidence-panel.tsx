import type {
  AppliedStepAnswer,
  ProvenanceSelectionSource,
} from "@/src/lib/recipe/provenance-selection";
import type { OpenQuestion, ProvenanceLink, RecipeStep, TranscriptSegment } from "@/src/lib/recipe/types";

type ProvenanceEvidencePanelProps = {
  step: RecipeStep | null;
  segmentsById: Map<string, TranscriptSegment>;
  selectionSource?: ProvenanceSelectionSource | null;
  appliedAnswers?: AppliedStepAnswer[];
  unresolvedForStep?: OpenQuestion[];
};

export function ProvenanceEvidencePanel({
  step,
  segmentsById,
  selectionSource = null,
  appliedAnswers = [],
  unresolvedForStep = [],
}: ProvenanceEvidencePanelProps) {
  if (!step) {
    return (
      <section
        id="provenance-evidence"
        className="scroll-mt-24 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6"
      >
        <h3 className="text-lg font-semibold text-stone-900">Source evidence</h3>
        <p className="mt-2 text-sm text-stone-500">
          Click a recipe step in the draft or living recipe to see transcript support.
        </p>
      </section>
    );
  }

  const stepLabel = selectionSource === "living" ? "Selected final step" : "Selected step";

  return (
    <section
      id="provenance-evidence"
      className="scroll-mt-24 rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Source evidence</p>
        {selectionSource === "living" ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
            Living recipe
          </span>
        ) : null}
      </div>
      <h3 className="mt-1 text-lg font-semibold text-stone-900">{stepLabel}</h3>
      <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm leading-relaxed text-stone-800">
        {step.instruction}
      </p>

      {appliedAnswers.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            User-answered details
          </p>
          {appliedAnswers.map(({ question, answer }) => (
            <article
              key={question.id}
              className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
            >
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Your answer
              </span>
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
        {step.provenance.map((link, index) => (
          <EvidenceItem
            key={`${link.transcriptSegmentId}-${index}`}
            link={link}
            segment={segmentsById.get(link.transcriptSegmentId)}
          />
        ))}
      </div>

      {unresolvedForStep.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Still unresolved for this step
          </p>
          {unresolvedForStep.map((question) => (
            <article
              key={question.id}
              className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4"
            >
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                Unresolved
              </span>
              <p className="mt-2 text-sm font-medium text-stone-900">{question.question}</p>
              <p className="mt-1 text-sm text-stone-500">{question.whyItMatters}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EvidenceItem({
  link,
  segment,
}: {
  link: ProvenanceLink;
  segment: TranscriptSegment | undefined;
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
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
          Source-backed
        </span>
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
          <span className="font-medium text-stone-700">Why it supports this step: </span>
          {link.reason}
        </p>
      ) : null}
    </article>
  );
}
