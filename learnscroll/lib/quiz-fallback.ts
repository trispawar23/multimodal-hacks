import type { ContentItem, GradeLevel, QuizQuestion, Topic } from "./types";
import { TOPIC_LABELS } from "./grade-topics";

const FALLBACK_BY_TOPIC: Partial<Record<Topic, QuizQuestion[]>> = {
  physics: [
    {
      id: "fp1",
      question: "According to Newton's first law, what happens to a moving object with no external forces?",
      options: [
        "It continues at the same speed and direction",
        "It gradually slows due to inertia alone",
        "It immediately stops",
        "It accelerates until it hits something",
      ],
      correctIndex: 0,
      explanation:
        "Newton's first law says motion continues unchanged until an external force acts on the object.",
    },
    {
      id: "fp2",
      question: "Why does a passenger lurch forward when a car stops suddenly?",
      options: [
        "Gravity pulls them down",
        "The engine pushes them forward",
        "Their inertia keeps them moving while the car stops",
        "Air pressure in the cabin",
      ],
      correctIndex: 2,
      explanation:
        "The passenger's body keeps moving forward due to inertia until a force (like a seatbelt) stops them.",
    },
    {
      id: "fp3",
      question: "What is the formula for Newton's second law?",
      options: ["E = mc²", "F = ma", "v = u + at", "p = mv"],
      correctIndex: 1,
      explanation: "F = ma relates force, mass, and acceleration.",
    },
  ],
  math: [
    {
      id: "fm1",
      question: "What special number links any circle's circumference to its diameter?",
      options: ["Euler's number e", "Pi (π)", "The golden ratio", "Zero"],
      correctIndex: 1,
      explanation: "Circumference divided by diameter always equals π.",
    },
    {
      id: "fm2",
      question: "In e^(iπ) + 1 = 0, which constants appear together?",
      options: ["Only π and 1", "e, i, π, and 1", "π and gravity g", "Speed of light c"],
      correctIndex: 1,
      explanation: "Euler's identity ties e, i, π, 1, and 0 in one compact equation.",
    },
  ],
  biology: [
    {
      id: "fb1",
      question: "What does natural selection mean?",
      options: [
        "Organisms choose to evolve",
        "Helpful traits spread because carriers reproduce more",
        "All species change at the same rate",
        "Only the strongest survive every environment",
      ],
      correctIndex: 1,
      explanation:
        "Traits that improve survival and reproduction become more common over generations.",
    },
  ],
  chemistry: [
    {
      id: "fc1",
      question: "What did Marie Curie's work on radium demonstrate?",
      options: [
        "Atoms are indivisible",
        "Some atoms transform by emitting radiation",
        "All elements are stable forever",
        "Radiation only comes from the Sun",
      ],
      correctIndex: 1,
      explanation: "Radioactive atoms decay and can become different elements.",
    },
  ],
};

export function fallbackQuizForSaved(
  items: ContentItem[],
  topic: Topic | "all",
  questionCount = 5
): QuizQuestion[] {
  const primaryTopic = topic === "all" ? items[0]?.topics[0] : topic;
  const bank =
    (primaryTopic && FALLBACK_BY_TOPIC[primaryTopic]) ??
    FALLBACK_BY_TOPIC.physics ??
    [];

  const fromTranscripts: QuizQuestion[] = items.slice(0, 3).map((item, i) => ({
    id: `saved-${i}`,
    question: `Based on "${item.title}", which statement best matches the lesson?`,
    options: [
      item.transcript.split(/[.!?]/)[0]?.trim().slice(0, 80) + "…" ||
        "The main idea from the saved lesson",
      "The opposite of what was taught",
      "An unrelated scientific claim",
      "A joke from the reel",
    ],
    correctIndex: 0,
    explanation: `This reflects content you saved from ${item.character.name}.`,
  }));

  const merged = [...fromTranscripts, ...bank];
  return merged.slice(0, questionCount);
}

export function quizTitleForTopic(topic: Topic | "all", count: number): string {
  if (topic === "all") return `Saved lessons quiz (${count} reels)`;
  return `${TOPIC_LABELS[topic]} quiz`;
}

export function dominantGradeLevel(items: ContentItem[]): GradeLevel {
  const counts = new Map<GradeLevel, number>();
  for (const item of items) {
    counts.set(item.gradeLevel, (counts.get(item.gradeLevel) ?? 0) + 1);
  }
  let best: GradeLevel = "9-12";
  let max = 0;
  for (const [grade, n] of counts) {
    if (n > max) {
      max = n;
      best = grade;
    }
  }
  return best;
}
