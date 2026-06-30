"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FollowUpAnswer, OpenQuestion } from "@/src/lib/recipe/types";

type FollowUpQuestionsPanelProps = {
  questions: OpenQuestion[];
  answers: Record<string, FollowUpAnswer>;
  onAnswersChange: (answers: Record<string, FollowUpAnswer>) => void;
};

type SaveStatus = "unanswered" | "typing" | "saved";

const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
const AUTOSAVE_DEBOUNCE_MS = 1200;

export function FollowUpQuestionsPanel({
  questions,
  answers,
  onAnswersChange,
}: FollowUpQuestionsPanelProps) {
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const sortedQuestions = useMemo(
    () =>
      [...questions].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      ),
    [questions],
  );

  const resolvedAnswers = useMemo(
    () =>
      Object.values(answers).sort(
        (a, b) => a.answeredAt.localeCompare(b.answeredAt),
      ),
    [answers],
  );

  const persistAnswer = useCallback((questionId: string, rawAnswer: string) => {
    const answer = rawAnswer.trim();
    const current = answersRef.current;

    if (!answer) {
      if (current[questionId]) {
        const next = { ...current };
        delete next[questionId];
        onAnswersChange(next);
      }
      return;
    }

    if (current[questionId]?.answer === answer) {
      return;
    }

    onAnswersChange({
      ...current,
      [questionId]: {
        questionId,
        answer,
        answeredAt: new Date().toISOString(),
      },
    });
  }, [onAnswersChange]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const question of questions) {
      const questionId = question.id;
      const draft =
        draftAnswers[questionId] ?? answersRef.current[questionId]?.answer ?? "";

      const timer = setTimeout(() => {
        const trimmed = draft.trim();
        if (!trimmed) {
          persistAnswer(questionId, draft);
          setSaveStatus((current) => ({ ...current, [questionId]: "unanswered" }));
          return;
        }

        persistAnswer(questionId, draft);
        setSaveStatus((current) => ({ ...current, [questionId]: "saved" }));
      }, AUTOSAVE_DEBOUNCE_MS);

      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [draftAnswers, questions, persistAnswer]);

  if (questions.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6">
        <h3 className="text-lg font-semibold text-stone-900">Follow-up questions</h3>
        <p className="mt-2 text-sm text-stone-500">No open questions for this recipe draft.</p>
      </section>
    );
  }

  const handleDraftChange = (questionId: string, value: string) => {
    setDraftAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
    setSaveStatus((current) => ({
      ...current,
      [questionId]: value.trim() ? "typing" : "unanswered",
    }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
          Follow-up questions
        </p>
        <h3 className="mt-1 text-lg font-semibold text-stone-900">
          Fill in missing details from the cook
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Answer what you can now. Unresolved questions stay visible until you add a response.
        </p>

        <ul className="mt-6 space-y-4">
          {sortedQuestions.map((question) => {
            const savedAnswer = answers[question.id]?.answer;
            const draftAnswer =
              draftAnswers[question.id] ?? savedAnswer ?? "";
            const isAnswered = Boolean(draftAnswer.trim());

            return (
              <li
                key={question.id}
                className={`rounded-xl border p-4 transition ${
                  isAnswered
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-stone-100 bg-stone-50/80"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={question.priority} />
                  <TargetBadge target={question.target} />
                  {isAnswered ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Answered
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm font-medium leading-relaxed text-stone-900">
                  {question.question}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  <span className="font-medium text-stone-700">Why it matters: </span>
                  {question.whyItMatters}
                </p>

                <div className="mt-4 space-y-3">
                  <label htmlFor={`answer-${question.id}`} className="sr-only">
                    Answer for {question.question}
                  </label>
                  <textarea
                    id={`answer-${question.id}`}
                    value={draftAnswer}
                    onChange={(event) => handleDraftChange(question.id, event.target.value)}
                    rows={3}
                    placeholder="Add what you know from memory or follow-up with the cook..."
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <AnswerSaveStatus
                    status={
                      saveStatus[question.id] ??
                      (draftAnswer.trim()
                        ? savedAnswer?.trim() === draftAnswer.trim()
                          ? "saved"
                          : "typing"
                        : "unanswered")
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {resolvedAnswers.length > 0 ? (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            Resolved details
          </p>
          <h3 className="mt-1 text-lg font-semibold text-stone-900">
            {resolvedAnswers.length} answered question
            {resolvedAnswers.length === 1 ? "" : "s"}
          </h3>

          <ul className="mt-4 space-y-3">
            {resolvedAnswers.map((entry) => {
              const question = questions.find((item) => item.id === entry.questionId);
              if (!question) {
                return null;
              }

              return (
                <li
                  key={entry.questionId}
                  className="rounded-xl border border-emerald-100 bg-white p-4"
                >
                  <p className="text-sm font-semibold leading-snug text-stone-900">
                    {question.question}
                  </p>
                  <p className="mt-2 text-sm font-normal leading-relaxed text-stone-500">
                    {entry.answer}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AnswerSaveStatus({ status }: { status: SaveStatus }) {
  if (status === "typing") {
    return <span className="text-xs font-medium text-amber-600">Unsaved changes</span>;
  }

  if (status === "saved") {
    return <span className="text-xs font-medium text-emerald-600">Saved</span>;
  }

  return <span className="text-xs text-stone-400">Unanswered</span>;
}

function PriorityBadge({ priority }: { priority: OpenQuestion["priority"] }) {
  const styles = {
    high: "bg-amber-100 text-amber-900",
    medium: "bg-stone-200 text-stone-700",
    low: "bg-stone-100 text-stone-600",
  } as const;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[priority]}`}
    >
      {priority} priority
    </span>
  );
}

function TargetBadge({ target }: { target: OpenQuestion["target"] }) {
  return (
    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize text-stone-600 ring-1 ring-stone-200 ring-inset">
      {target}
    </span>
  );
}
