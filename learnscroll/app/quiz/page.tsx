"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { FEED_ITEMS } from "@/lib/mock-data";
import { cn } from "@/components/ui/cn";
import type { QuizQuestion } from "@/lib/types";

// Hardcoded demo quiz that maps to the feed content
const DEMO_QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    question: "According to Newton's first law, what happens to a moving object with no external forces acting on it?",
    options: [
      "It continues moving at the same speed and direction",
      "It gradually slows down due to inertia",
      "It immediately stops",
      "It accelerates until it hits something",
    ],
    correctIndex: 0,
    explanation: "Newton's first law (the law of inertia) states that an object in motion stays in motion — same speed, same direction — unless acted on by an external force.",
  },
  {
    id: "q2",
    question: "In a car crash, what causes a passenger to lurch forward when the car stops suddenly?",
    options: [
      "Gravity pulling them downward",
      "The engine pushing them forward",
      "Their body's inertia continuing forward while the car stops",
      "Air pressure in the cabin",
    ],
    correctIndex: 2,
    explanation: "The car's sudden stop is an external force on the car — but the passenger's body has its own inertia (tendency to keep moving). Without a seatbelt, they keep moving forward while the car stops.",
  },
  {
    id: "q3",
    question: "What is the short formula form of Newton's second law?",
    options: ["E = mc²", "F = ma", "v = u + at", "p = mv"],
    correctIndex: 1,
    explanation: "F = ma: Force equals mass times acceleration. This explains why heavier cars need more force to stop in the same distance as lighter ones.",
  },
  {
    id: "q4",
    question: "Why do seatbelts save lives, according to the physics in this video?",
    options: [
      "They prevent the car from decelerating too fast",
      "They apply an external force to stop the passenger along with the car",
      "They reduce the mass of the passenger",
      "They eliminate friction",
    ],
    correctIndex: 1,
    explanation: "Seatbelts apply an external force (deceleration force from the belt) to the passenger's body — overcoming their inertia so they stop with the car instead of continuing forward.",
  },
  {
    id: "q5",
    question: "Which of Newton's three laws is demonstrated by seatbelts?",
    options: ["The law of universal gravitation", "The third law (action-reaction)", "The first law (inertia)", "None of Newton's laws"],
    correctIndex: 2,
    explanation: "Seatbelts are a direct application of the first law of motion: an object in motion (the passenger) stays in motion unless an external force (the seatbelt) acts upon it.",
  },
];

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentId = searchParams.get("contentId") ?? "c1";

  const content = FEED_ITEMS.find((f) => f.id === contentId) ?? FEED_ITEMS[0];

  const [questions] = useState<QuizQuestion[]>(DEMO_QUIZ);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;

  function handleSelect(i: number) {
    if (submitted) return;
    setSelected(i);
  }

  function handleSubmit() {
    if (selected === null) return;
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

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-pastel-cream pb-24 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4",
              pct >= 80
                ? "bg-green-500/10 border-green-500 text-green-400"
                : pct >= 60
                ? "bg-amber-500/10 border-amber-500 text-amber-400"
                : "bg-red-500/10 border-red-500 text-red-400"
            )}
          >
            {pct}%
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-pastel-ink">
              {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good effort!" : "Keep practicing!"}
            </h2>
            <p className="text-pastel-muted mt-2 text-sm">
              You got {score} out of {questions.length} correct.
            </p>
          </div>

          <div className="w-full bg-white border border-surface-border rounded-2xl p-4">
            <p className="text-sm text-pastel-muted">This quiz was based on:</p>
            <p className="text-sm font-medium text-pastel-ink mt-1 leading-snug">{content.title}</p>
            <p className="text-xs text-pastel-muted mt-1">
              taught by {content.character.name}
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setCurrent(0); setSelected(null); setSubmitted(false); setScore(0); setDone(false); }}
              className="flex-1 py-3 rounded-xl border border-surface-border text-pastel-ink text-sm font-medium"
            >
              Retake
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-3 rounded-xl bg-pastel-lilac text-pastel-ink text-sm font-semibold"
            >
              Back to Feed
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-cream pb-24 flex flex-col">
      {/* Header */}
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-pastel-ink">
              {content.topics[0].charAt(0).toUpperCase() + content.topics[0].slice(1)} Quiz
            </h1>
            <p className="text-xs text-pastel-muted">{content.character.name} · {content.gradeLevel}</p>
          </div>
          <span className="text-sm font-semibold text-brand-500">
            {current + 1} / {questions.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-pastel-sky rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-4">
        {/* Question */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <p className="text-[15px] font-medium text-pastel-ink leading-relaxed">{q.question}</p>
          <p className="text-[11px] text-pastel-muted mt-2">Based on content you watched</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = selected === i;

            const stateClass = submitted
              ? isCorrect
                ? "border-green-500 bg-green-500/10 text-green-300"
                : isSelected
                ? "border-red-500 bg-red-500/10 text-red-300"
                : "border-surface-border text-pastel-muted opacity-50"
              : isSelected
              ? "border-brand-500 bg-brand-500/10 text-pastel-ink"
              : "border-surface-border text-pastel-ink hover:border-zinc-600";

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                  stateClass
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    submitted && isCorrect
                      ? "border-green-500"
                      : submitted && isSelected
                      ? "border-red-500"
                      : isSelected
                      ? "border-brand-500"
                      : "border-zinc-600"
                  )}
                >
                  {submitted && isCorrect && (
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  )}
                  {!submitted && isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  )}
                </div>
                <span className="text-sm leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {submitted && (
          <div className={cn(
            "rounded-2xl p-4 border text-sm leading-relaxed",
            selected === q.correctIndex
              ? "bg-green-500/5 border-green-500/30 text-green-200"
              : "bg-red-500/5 border-red-500/30 text-red-200"
          )}>
            <p className="font-semibold mb-1">
              {selected === q.correctIndex ? "Correct!" : "Not quite —"}
            </p>
            <p className="text-pastel-ink text-[13px]">{q.explanation}</p>
          </div>
        )}
      </main>

      {/* Action button */}
      <div className="px-5 pb-6 pt-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className={cn(
              "w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all",
              selected !== null
                ? "bg-pastel-lilac text-pastel-ink hover:bg-brand-600"
                : "bg-pastel-sky text-pastel-muted cursor-not-allowed"
            )}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl bg-pastel-lilac text-pastel-ink text-[15px] font-semibold hover:bg-brand-600 transition-colors"
          >
            {current + 1 >= questions.length ? "See Results" : "Next Question"}
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizContent />
    </Suspense>
  );
}
