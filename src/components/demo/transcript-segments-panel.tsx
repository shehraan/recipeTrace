import type { TranscriptSegment } from "@/src/lib/recipe/types";

type TranscriptSegmentsPanelProps = {
  segments: TranscriptSegment[];
  title?: string;
};

export function TranscriptSegmentsPanel({
  segments,
  title = "Transcript",
}: TranscriptSegmentsPanelProps) {
  if (segments.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <p className="mt-2 text-sm text-stone-500">No transcript segments yet.</p>
      </section>
    );
  }

  const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {sortedSegments.length} numbered segment{sortedSegments.length === 1 ? "" : "s"} with
            stable IDs
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {sortedSegments.map((segment) => (
          <li
            key={segment.id}
            id={segment.id}
            className="rounded-xl border border-stone-100 bg-stone-50/80 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-stone-600 ring-1 ring-stone-200 ring-inset">
                {segment.id}
              </span>
              <span className="font-medium text-stone-700">#{segment.orderIndex + 1}</span>
              {segment.speaker ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  {segment.speaker}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-800">{segment.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
