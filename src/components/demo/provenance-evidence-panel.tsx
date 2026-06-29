import type { ProvenanceLink, RecipeStep, TranscriptSegment } from "@/src/lib/recipe/types";

type ProvenanceEvidencePanelProps = {
  step: RecipeStep | null;
  segmentsById: Map<string, TranscriptSegment>;
};

export function ProvenanceEvidencePanel({ step, segmentsById }: ProvenanceEvidencePanelProps) {
  if (!step) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6">
        <h3 className="text-lg font-semibold text-stone-900">Source evidence</h3>
        <p className="mt-2 text-sm text-stone-500">
          Click a recipe step to see which transcript segments support it.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Source evidence</p>
      <h3 className="mt-1 text-lg font-semibold text-stone-900">Selected step</h3>
      <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-800">
        {step.instruction}
      </p>

      <div className="mt-6 space-y-4">
        {step.provenance.map((link, index) => (
          <EvidenceItem
            key={`${link.transcriptSegmentId}-${index}`}
            link={link}
            segment={segmentsById.get(link.transcriptSegmentId)}
          />
        ))}
      </div>
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
