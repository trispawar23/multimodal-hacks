"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card } from "@/components/ui/Card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { TopicPills } from "@/components/ui/TopicPills";
import { cn } from "@/components/ui/cn";
import {
  getSavedByTopic,
  getSavedContents,
  getSavedTopics,
} from "@/lib/saved-store";
import { TOPIC_LABELS } from "@/lib/grade-topics";
import type { GradeLevel, QuizQuestion, Topic } from "@/lib/types";

const SCORE_RING = {
  high: "border-pastel-mint bg-pastel-mint/40 text-[#5BA888]",
  mid: "border-pastel-peach bg-pastel-peach/40 text-[#D4926A]",
  low: "border-pastel-blush bg-pastel-blush/40 text-[#D47A9A]",
} as const;

function scoreRingClass(pct: number) {
  if (pct >= 80) return SCORE_RING.high;
  if (pct >= 60) return SCORE_RING.mid;
  return SCORE_RING.low;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = (searchParams.get("topic") as Topic | "all" | null) ?? "all";

  const [savedTopics, setSavedTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | "all">(initialTopic);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState("Quiz");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("9-12");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const refreshSaved = useCallback(() => {
    const topics = getSavedTopics();
    setSavedTopics(topics);
    setSavedCount(getSavedContents().length);
    if (topics.length && selectedTopic !== "all" && !topics.includes(selectedTopic)) {
      setSelectedTopic("all");
    }
  }, [selectedTopic]);

  const loadQuiz = useCallback(async (topic: Topic | "all") => {
    const saved = getSavedByTopic(topic);
    if (!saved.length) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setDone(false);

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          contents: saved.map((s) => s.item),
        }),
      });

      const data = (await res.json()) as {
        title?: string;
        gradeLevel?: GradeLevel;
        questions?: QuizQuestion[];
        error?: string;
      };

      if (!res.ok || !data.questions?.length) {
        setLoadError(data.error ?? "Could not build quiz");
        setQuestions([]);
        return;
      }

      setQuizTitle(data.title ?? "Quiz");
      setGradeLevel(data.gradeLevel ?? "9-12");
      setQuestions(data.questions);
    } catch {
      setLoadError("Network error loading quiz");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    loadQuiz(selectedTopic);
  }, [selectedTopic, loadQuiz]);

  useEffect(() => {
    const onFocus = () => refreshSaved();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSaved]);

  const q = questions[current];
  const progress = questions.length ? (current / questions.length) * 100 : 0;

  const topicPillOptions = [
    { id: "all", label: "All saved" },
    ...savedTopics.map((t) => ({ id: t, label: TOPIC_LABELS[t], topic: t })),
  ];

  function handleSelect(i: number) {
    if (submitted) return;
    setSelected(i);
  }

  function handleSubmit() {
    if (selected === null || !q) return;
    setSubmitted(true);
    if (selected === q.correctIndex) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    }
  }

  function handleRetake() {
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setDone(false);
  }

  if (savedCount === 0) {
    return (
      <PageShell className="flex flex-col items-center justify-center">
        <EmptyState
          title="No saved lessons yet"
          description="Save teachers from the Feed — your quiz will be built from those topics."
          actionLabel="Go to Feed"
          actionHref="/"
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell className="flex flex-col items-center justify-center">
        <LoadingState message="Building quiz from saved topics…" />
      </PageShell>
    );
  }

  if (loadError || !questions.length) {
    return (
      <PageShell className="flex flex-col items-center justify-center">
        <EmptyState
          title={loadError ?? "No questions for this topic"}
          description="Try another topic or save more lessons from the Feed."
          actionLabel="Try again"
          onAction={() => loadQuiz(selectedTopic)}
        />
      </PageShell>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const saved = getSavedByTopic(selectedTopic);

    return (
      <PageShell className="flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-bold",
              scoreRingClass(pct)
            )}
          >
            {pct}%
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-pastel-ink">
              {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good effort!" : "Keep practicing!"}
            </h2>
            <p className="mt-2 text-sm text-pastel-muted">
              You got {score} out of {questions.length} correct.
            </p>
          </div>

          <Card className="w-full">
            <p className="text-sm text-pastel-muted">
              Based on {saved.length} saved lesson{saved.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-2 space-y-1">
              {saved.slice(0, 4).map((s) => (
                <li key={s.item.id} className="truncate text-sm font-medium text-pastel-ink">
                  {s.item.title}
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex w-full gap-3">
            <SecondaryButton className="flex-1" onClick={handleRetake}>
              Retake
            </SecondaryButton>
            <PrimaryButton
              variant="block"
              className="flex-1"
              onClick={() => router.push("/")}
            >
              Back to Feed
            </PrimaryButton>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="flex flex-col">
      <PageHeader
        bordered={false}
        title={quizTitle}
        subtitle={`From saved · ${gradeLevel}`}
        right={
          <span className="text-sm font-semibold text-brand-500">
            {current + 1} / {questions.length}
          </span>
        }
        className="pb-3"
      />

      <div className="px-4 pb-3">
        <TopicPills
          options={topicPillOptions}
          selected={selectedTopic}
          onChange={(id) => setSelectedTopic(id as Topic | "all")}
          className="mb-3"
        />
        <div className="h-1.5 overflow-hidden rounded-full bg-pastel-sky">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-4 px-4">
        <Card padding="lg">
          <p className="text-[15px] font-medium leading-relaxed text-pastel-ink">
            {q.question}
          </p>
          <p className="mt-2 text-[11px] text-pastel-muted">From your saved lessons</p>
        </Card>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = selected === i;

            const stateClass = submitted
              ? isCorrect
                ? "border-pastel-mint bg-pastel-mint/50 text-pastel-ink"
                : isSelected
                  ? "border-pastel-blush bg-pastel-blush/50 text-pastel-ink"
                  : "border-surface-border text-pastel-muted opacity-50"
              : isSelected
                ? "border-brand-500 bg-pastel-lilac/60 text-pastel-ink"
                : "border-surface-border text-pastel-ink hover:border-brand-300";

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  stateClass
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                    submitted && isCorrect
                      ? "border-[#5BA888]"
                      : submitted && isSelected
                        ? "border-[#D47A9A]"
                        : isSelected
                          ? "border-brand-500"
                          : "border-pastel-muted/50"
                  )}
                >
                  {submitted && isCorrect && (
                    <div className="h-2.5 w-2.5 rounded-full bg-[#5BA888]" />
                  )}
                  {!submitted && isSelected && (
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  )}
                </div>
                <span className="text-sm leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>

        {submitted && (
          <Card
            className={cn(
              "text-sm leading-relaxed",
              selected === q.correctIndex
                ? "border-pastel-mint/60 bg-pastel-mint/20"
                : "border-pastel-blush/60 bg-pastel-blush/20"
            )}
          >
            <p className="mb-1 font-semibold text-pastel-ink">
              {selected === q.correctIndex ? "Correct!" : "Not quite —"}
            </p>
            <p className="text-[13px] text-pastel-muted">{q.explanation}</p>
          </Card>
        )}
      </main>

      <div className="px-4 pb-6 pt-4">
        {!submitted ? (
          <PrimaryButton
            variant="block"
            onClick={handleSubmit}
            disabled={selected === null}
            className={cn(
              selected === null && "cursor-not-allowed bg-pastel-sky text-pastel-muted opacity-100"
            )}
          >
            Submit Answer
          </PrimaryButton>
        ) : (
          <PrimaryButton variant="block" onClick={handleNext}>
            {current + 1 >= questions.length ? "See Results" : "Next Question"}
          </PrimaryButton>
        )}
      </div>
    </PageShell>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="flex items-center justify-center">
          <LoadingState message="Loading quiz…" compact />
        </PageShell>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
