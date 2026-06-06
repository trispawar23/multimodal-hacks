import type { GradeLevel, Topic } from "./types";
import type { Personality } from "./personalities";
import { TOPIC_LABELS } from "./grade-topics";

export interface SlopTemplate {
  title: string;
  transcript: string;
  qualityScore: number;
}

/** Which teachers appear for each topic at each grade band */
export const PERSONALITIES_BY_GRADE: Record<
  GradeLevel,
  Partial<Record<Topic, string[]>>
> = {
  "K-5": {
    biology: ["sunny"],
    math: ["sunny"],
    history: ["sunny"],
  },
  "6-8": {
    biology: ["sunny", "darwin"],
    math: ["sunny", "euler", "hypatia"],
    physics: ["newton", "einstein"],
    history: ["sunny", "cleopatra"],
  },
  "9-12": {
    physics: ["einstein", "newton", "tesla"],
    math: ["euler", "hypatia", "turing"],
    chemistry: ["curie"],
    biology: ["darwin", "aristotle"],
    history: ["cleopatra"],
    literature: ["shakespeare"],
    philosophy: ["aristotle", "hypatia"],
    engineering: ["tesla", "turing"],
  },
  college: {
    physics: ["einstein", "newton", "tesla"],
    math: ["euler", "turing", "hypatia"],
    chemistry: ["curie"],
    biology: ["darwin", "aristotle"],
    history: ["cleopatra"],
    literature: ["shakespeare"],
    philosophy: ["aristotle", "hypatia"],
    engineering: ["tesla", "turing"],
  },
  graduate: {
    physics: ["einstein", "newton"],
    math: ["turing", "euler"],
    chemistry: ["curie"],
    biology: ["darwin"],
    philosophy: ["aristotle", "hypatia"],
    engineering: ["turing"],
  },
};

/** Safe grade lookup — never serve content above the selected grade */
export function gradeFallbackOrder(grade: GradeLevel): GradeLevel[] {
  switch (grade) {
    case "K-5":
      return ["K-5"];
    case "6-8":
      return ["6-8", "K-5"];
    case "9-12":
      return ["9-12", "6-8"];
    case "college":
      return ["college", "9-12"];
    case "graduate":
      return ["graduate", "college", "9-12"];
    default:
      return ["9-12"];
  }
}

/** Last-resort scripts when nothing matches — always grade-appropriate */
export const GRADE_TOPIC_FALLBACKS: Partial<
  Record<GradeLevel, Partial<Record<Topic, SlopTemplate>>>
> = {
  "K-5": {
    biology: {
      title: "How plants grow",
      transcript:
        "Hi friends! Seeds are tiny packages with a baby plant inside. Add water and warm soil and roots grow down while shoots reach for the sun. That is how every flower and tree begins!",
      qualityScore: 0.86,
    },
    math: {
      title: "Finding number patterns",
      transcript:
        "Hey! Count 2, 4, 6, 8 — see the pattern? When numbers grow the same way each time, you can guess what comes next without counting every step. Patterns make math feel like a game!",
      qualityScore: 0.85,
    },
    history: {
      title: "Stories from long ago",
      transcript:
        "Story time! People lived in villages long before cars and phones. We learn about them from old pots, buildings, and drawings they left behind — like clues in a treasure hunt!",
      qualityScore: 0.85,
    },
  },
  "6-8": {
    physics: {
      title: "Gravity — why things fall",
      transcript:
        "Gravity pulls everything toward Earth's center. Drop a ball and it falls at the same rate in air whether it is heavy or light. That same pull keeps the Moon orbiting Earth instead of drifting away.",
      qualityScore: 0.88,
    },
    biology: {
      title: "How species change over time",
      transcript:
        "Organisms vary, resources are limited, and helpful traits get passed to offspring. Over many generations, species change. That process — natural selection — explains the diversity of life on Earth.",
      qualityScore: 0.9,
    },
    math: {
      title: "Pi in every circle",
      transcript:
        "Divide any circle's circumference by its diameter and you always get pi. That one number links wheels, planets, and waves. Mathematicians use it everywhere circles appear.",
      qualityScore: 0.89,
    },
    history: {
      title: "Rivers and early civilizations",
      transcript:
        "Annual river floods deposited rich soil for farming. Predictable harvests fed cities and supported civilizations that lasted thousands of years. Geography shaped where history began.",
      qualityScore: 0.88,
    },
  },
};

const K5_OPENERS = [
  "Hi friends! ",
  "Hey! ",
  "Story time! ",
];

function shortenSentences(text: string, maxSentences: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts?.length) return text.slice(0, 160);
  return parts.slice(0, maxSentences).join(" ").trim();
}

/** Adjust vocabulary and length to match grade band */
export function adaptTemplateForGrade(
  template: SlopTemplate,
  gradeLevel: GradeLevel,
  personality: Personality,
  topic: Topic
): SlopTemplate {
  const topicLabel = TOPIC_LABELS[topic].toLowerCase();
  let { title, transcript, qualityScore } = template;

  if (gradeLevel === "K-5") {
    transcript = shortenSentences(transcript, 3);
    if (personality.id === "sunny" && !/^(Hi |Hey |Story)/i.test(transcript)) {
      transcript = `${K5_OPENERS[0]}${transcript.charAt(0).toLowerCase()}${transcript.slice(1)}`;
    } else if (personality.id !== "sunny") {
      transcript = `Hi friends! Let me tell you about ${topicLabel} in a simple way. ${transcript}`;
      transcript = shortenSentences(transcript, 4);
    }
    title = title.replace(/—.*$/, "").slice(0, 45);
    if (!title.toLowerCase().includes("!")) title = `${title}!`;
    return { title, transcript, qualityScore: Math.min(qualityScore, 0.9) };
  }

  if (gradeLevel === "6-8") {
    transcript = shortenSentences(transcript, 4);
    if (personality.id === "sunny" && !/^(Hi |Hey |Okay)/i.test(transcript)) {
      transcript = `Hey! ${transcript.charAt(0).toLowerCase()}${transcript.slice(1)}`;
    }
    return { title, transcript, qualityScore };
  }

  if (gradeLevel === "college" || gradeLevel === "graduate") {
    if (
      !transcript.includes("fundamental") &&
      !transcript.includes("theorem") &&
      personality.id !== "sunny"
    ) {
      const prefix =
        gradeLevel === "graduate"
          ? "At the graduate level, the key insight is this: "
          : "For a deeper look: ";
      if (!transcript.startsWith("I ") && !transcript.startsWith("At ")) {
        transcript = `${prefix}${transcript.charAt(0).toLowerCase()}${transcript.slice(1)}`;
      }
    }
    return { title, transcript, qualityScore: Math.min(0.99, qualityScore + 0.02) };
  }

  return { title, transcript, qualityScore };
}

export function gradeFallbackTemplate(
  topic: Topic,
  gradeLevel: GradeLevel
): SlopTemplate | null {
  for (const grade of gradeFallbackOrder(gradeLevel)) {
    const hit = GRADE_TOPIC_FALLBACKS[grade]?.[topic];
    if (hit) return hit;
  }
  return null;
}

export const GRADE_PORTRAIT_HINT: Record<GradeLevel, string> = {
  "K-5": "extra friendly, big expressive eyes, simple shapes, bright colors, ages 5–10 audience",
  "6-8": "approachable middle-school style, clear features, energetic but not childish",
  "9-12": "teen-friendly educational illustration, confident and engaging",
  college: "mature scholarly portrait, subtle detail, college-level audience",
  graduate: "refined academic portrait, sophisticated linework",
};

export const GRADE_LABEL_SHORT: Record<GradeLevel, string> = {
  "K-5": "grades K–5",
  "6-8": "grades 6–8",
  "9-12": "high school",
  college: "college",
  graduate: "graduate school",
};
