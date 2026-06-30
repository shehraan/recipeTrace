"use client";

import { DemoContinueLink } from "@/src/components/demo/demo-continue-link";
import { useDemo } from "@/src/components/demo/demo-provider";
import { RecipeDraftPageCard } from "@/src/components/demo/recipe-draft-page-card";

export default function DraftPage() {
  const { recipeDraft } = useDemo();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Step 2</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Recipe draft</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Click any step to open the evidence drawer - no page scroll, just source quotes and
          reasons beside you.
        </p>
      </div>

      <RecipeDraftPageCard draft={recipeDraft} />

      <DemoContinueLink
        href="/demo/followups"
        label="Continue to follow-up questions"
        description="Fill in missing details before generating the living recipe."
      />
    </div>
  );
}
