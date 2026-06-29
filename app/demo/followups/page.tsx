"use client";

import { DemoContinueLink } from "@/src/components/demo/demo-continue-link";
import { useDemo } from "@/src/components/demo/demo-provider";
import { FollowUpQuestionsPanel } from "@/src/components/demo/follow-up-questions-panel";

export default function FollowupsPage() {
  const { recipeDraft, followUpAnswers, setFollowUpAnswers } = useDemo();
  const answeredCount = Object.keys(followUpAnswers).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 3</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Follow-up questions</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Answer what you can from memory or follow-up with the cook. Unresolved questions stay
          visible in the final living recipe.
        </p>
      </div>

      <FollowUpQuestionsPanel
        questions={recipeDraft.openQuestions}
        answers={followUpAnswers}
        onAnswersChange={setFollowUpAnswers}
      />

      <DemoContinueLink
        href="/demo/living"
        label="Generate living recipe"
        description={
          answeredCount > 0
            ? `${answeredCount} answer${answeredCount === 1 ? "" : "s"} will be included.`
            : "You can continue without answers — unresolved details stay explicit."
        }
      />
    </div>
  );
}
