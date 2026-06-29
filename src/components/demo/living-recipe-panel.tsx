import type { LivingRecipe, OpenQuestion, SensoryCue } from "@/src/lib/recipe/types";
import {
  getAppliedAnswersForStep,
  stepHasAppliedAnswers,
  stepHasUnresolvedDetails,
} from "@/src/lib/recipe/provenance-selection";

type LivingRecipePanelProps = {
  recipe: LivingRecipe;
  questionsById: Map<string, OpenQuestion>;
  selectedStepId: string | null;
  onStepSelect: (stepId: string) => void;
};

export function LivingRecipePanel({
  recipe,
  questionsById,
  selectedStepId,
  onStepSelect,
}: LivingRecipePanelProps) {
  const sortedSteps = [...recipe.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  const cuesByType = groupSensoryCuesByType(recipe.sensoryCues);

  return (
    <section
      id="living-recipe"
      className="scroll-mt-24 rounded-2xl border border-amber-300/80 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Living recipe
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-stone-900">{recipe.title}</h3>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80 ring-inset">
          Source-backed
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-stone-600">{recipe.summary}</p>

      {recipe.familyContext ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Family context
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">{recipe.familyContext}</p>
        </div>
      ) : null}

      <Legend />

      <div className="mt-8 space-y-8">
        <IngredientsSection ingredients={recipe.ingredients} />
        <StepsSection
          steps={sortedSteps}
          selectedStepId={selectedStepId}
          onStepSelect={onStepSelect}
          resolvedQuestions={recipe.resolvedQuestions}
          unresolvedQuestions={recipe.unresolvedQuestions}
          openQuestions={[...questionsById.values()]}
        />
        <SensoryCuesSection cuesByType={cuesByType} />
        <ResolvedDetailsSection
          resolvedQuestions={recipe.resolvedQuestions}
          questionsById={questionsById}
        />
        <UnresolvedSection unresolvedQuestions={recipe.unresolvedQuestions} />
        <SourceSummarySection sourceSummary={recipe.sourceSummary} />
      </div>
    </section>
  );
}

function Legend() {
  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-3">
      <LegendItem
        colorClass="bg-amber-400"
        label="Source-backed"
        description="From the original transcript"
      />
      <LegendItem
        colorClass="bg-emerald-400"
        label="User-answered"
        description="Filled in via follow-up questions"
      />
      <LegendItem
        colorClass="bg-stone-300"
        label="Unresolved"
        description="Still missing or uncertain"
      />
    </dl>
  );
}

function LegendItem({
  colorClass,
  label,
  description,
}: {
  colorClass: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-2 rounded-xl bg-stone-50 px-3 py-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colorClass}`} aria-hidden />
      <div>
        <dt className="text-xs font-semibold text-stone-800">{label}</dt>
        <dd className="text-xs text-stone-500">{description}</dd>
      </div>
    </div>
  );
}

function IngredientsSection({
  ingredients,
}: {
  ingredients: LivingRecipe["ingredients"];
}) {
  return (
    <section>
      <SectionHeading title="Ingredients" badge="Source-backed" badgeTone="source" />
      <ul className="mt-4 space-y-2">
        {ingredients.map((ingredient) => (
          <li
            key={ingredient.id}
            className="flex flex-wrap items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm text-stone-800"
          >
            <SourceBadge />
            <span>
              <span className="font-medium">{ingredient.name}</span>
              {ingredient.quantity ? (
                <span className="text-stone-600"> — {ingredient.quantity}</span>
              ) : null}
              {ingredient.preparation ? (
                <span className="text-stone-500"> ({ingredient.preparation})</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StepsSection({
  steps,
  selectedStepId,
  onStepSelect,
  resolvedQuestions,
  unresolvedQuestions,
  openQuestions,
}: {
  steps: LivingRecipe["steps"];
  selectedStepId: string | null;
  onStepSelect: (stepId: string) => void;
  resolvedQuestions: LivingRecipe["resolvedQuestions"];
  unresolvedQuestions: LivingRecipe["unresolvedQuestions"];
  openQuestions: OpenQuestion[];
}) {
  return (
    <section>
      <SectionHeading
        title="Steps"
        badge="Click to trace · source / answered / unresolved"
        badgeTone="source"
      />
      <ol className="mt-4 space-y-2">
        {steps.map((step) => {
          const isSelected = selectedStepId === step.id;
          const hasAppliedAnswers = stepHasAppliedAnswers(step.id, resolvedQuestions);
          const hasUnresolved = stepHasUnresolvedDetails(step.id, unresolvedQuestions);
          const appliedAnswers = getAppliedAnswersForStep(
            step.id,
            resolvedQuestions,
            openQuestions,
          );

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepSelect(step.id)}
                aria-pressed={isSelected}
                className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition ${
                  isSelected
                    ? "border-amber-300 bg-amber-50 text-stone-900 ring-1 ring-amber-200"
                    : "border-amber-100 bg-amber-50/30 text-stone-800 hover:border-amber-200"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {step.orderIndex + 1}
                  </span>
                  <span className="flex-1">{step.instruction}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-9">
                  <SourceBadge compact />
                  {hasAppliedAnswers ? <AnsweredBadge /> : null}
                  {hasUnresolved ? <UnresolvedBadge /> : null}
                </div>
                {hasAppliedAnswers ? (
                  <div className="space-y-1 pl-9">
                    {appliedAnswers.map(({ question, answer }) => (
                      <p
                        key={question.id}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-stone-600"
                      >
                        <span className="font-medium text-stone-800">{question.question}</span>
                        {" — "}
                        {answer}
                      </p>
                    ))}
                  </div>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SensoryCuesSection({
  cuesByType,
}: {
  cuesByType: Map<SensoryCue["type"], SensoryCue[]>;
}) {
  return (
    <section>
      <SectionHeading title="Sensory cues" badge="Source-backed" badgeTone="source" />
      <div className="mt-4 space-y-4">
        {[...cuesByType.entries()].map(([type, cues]) => (
          <div key={type}>
            <p className="text-xs font-medium capitalize text-stone-500">{type}</p>
            <ul className="mt-2 space-y-2">
              {cues.map((cue) => (
                <li
                  key={cue.id}
                  className="rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm text-stone-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceBadge compact />
                    <span>{cue.cue}</span>
                  </div>
                  {cue.interpretation ? (
                    <p className="mt-1 text-xs text-stone-500">{cue.interpretation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResolvedDetailsSection({
  resolvedQuestions,
  questionsById,
}: {
  resolvedQuestions: LivingRecipe["resolvedQuestions"];
  questionsById: Map<string, OpenQuestion>;
}) {
  if (resolvedQuestions.length === 0) {
    return (
      <section>
        <SectionHeading title="Resolved details" badge="User-answered" badgeTone="answered" />
        <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
          No follow-up answers were added yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading title="Resolved details" badge="User-answered" badgeTone="answered" />
      <ul className="mt-4 space-y-3">
        {resolvedQuestions.map((entry) => {
          const question = questionsById.get(entry.questionId);

          return (
            <li
              key={entry.questionId}
              className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AnsweredBadge />
              </div>
              {question ? (
                <p className="mt-2 text-sm font-semibold leading-snug text-stone-900">
                  {question.question}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{entry.answer}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function UnresolvedSection({
  unresolvedQuestions,
}: {
  unresolvedQuestions: LivingRecipe["unresolvedQuestions"];
}) {
  if (unresolvedQuestions.length === 0) {
    return (
      <section>
        <SectionHeading title="Still unresolved" badge="Complete" badgeTone="answered" />
        <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-800">
          All follow-up questions have been answered.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading title="Still unresolved" badge="Missing details" badgeTone="unresolved" />
      <ul className="mt-4 space-y-3">
        {unresolvedQuestions.map((question) => (
          <li
            key={question.id}
            className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <UnresolvedBadge />
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium capitalize text-stone-700">
                {question.priority} priority
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-stone-900">{question.question}</p>
            <p className="mt-1 text-sm text-stone-500">{question.whyItMatters}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceSummarySection({
  sourceSummary,
}: {
  sourceSummary: LivingRecipe["sourceSummary"];
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        Provenance summary
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-xs text-stone-500">Transcript segments</dt>
          <dd className="text-lg font-semibold text-stone-900">
            {sourceSummary.transcriptSegmentCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Supported steps</dt>
          <dd className="text-lg font-semibold text-stone-900">
            {sourceSummary.supportedStepCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Inferred steps</dt>
          <dd className="text-lg font-semibold text-stone-900">
            {sourceSummary.inferredStepCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function SectionHeading({
  title,
  badge,
  badgeTone,
}: {
  title: string;
  badge: string;
  badgeTone: "source" | "answered" | "unresolved";
}) {
  const badgeStyles = {
    source: "bg-amber-50 text-amber-800 ring-amber-200/80",
    answered: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    unresolved: "bg-stone-100 text-stone-600 ring-stone-200",
  } as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyles[badgeTone]}`}
      >
        {badge}
      </span>
    </div>
  );
}

function SourceBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-amber-100 font-medium text-amber-900 ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      Source
    </span>
  );
}

function AnsweredBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Your answer
    </span>
  );
}

function UnresolvedBadge() {
  return (
    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
      Unresolved
    </span>
  );
}

function groupSensoryCuesByType(cues: SensoryCue[]) {
  const grouped = new Map<SensoryCue["type"], SensoryCue[]>();

  for (const cue of cues) {
    const existing = grouped.get(cue.type) ?? [];
    grouped.set(cue.type, [...existing, cue]);
  }

  return grouped;
}
