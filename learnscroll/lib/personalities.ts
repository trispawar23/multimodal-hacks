import type { AICharacter, GradeLevel, Topic } from "./types";
import { getGuestFigureName, isGuestCharacterId } from "./wiki-figures";
import {
  allTeachersForGrade,
  gradeFallbackOrder,
  PERSONALITIES_BY_GRADE,
} from "./grade-config";
import type { FeedRecent } from "./feed-diversity";
import { pickDiverseIndex, topicCharacterAppearances } from "./feed-diversity";

export interface Personality extends AICharacter {
  posterAsset: "newton" | "einstein" | "einstein-cartoon" | "sunny";
  voicePitch: number;
  voiceRate: number;
  voiceGender: "male" | "female" | "neutral";
}

export const PERSONALITIES: Personality[] = [
  {
    id: "newton",
    name: "Isaac Newton",
    era: "1643–1727",
    subjects: ["physics", "math"],
    initial: "N",
    color: "#A8C8FF",
    posterAsset: "newton",
    voicePitch: 0.72,
    voiceRate: 0.84,
    voiceGender: "male",
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    era: "1879–1955",
    subjects: ["physics"],
    initial: "E",
    color: "#D4C4F0",
    posterAsset: "einstein",
    voicePitch: 0.95,
    voiceRate: 0.9,
    voiceGender: "male",
  },
  {
    id: "einstein-cartoon",
    name: "Professor Einstein",
    era: "1879–1955",
    subjects: ["physics", "math"],
    initial: "E",
    color: "#FFD6A5",
    posterAsset: "einstein-cartoon",
    voicePitch: 1.05,
    voiceRate: 0.96,
    voiceGender: "male",
  },
  {
    id: "curie",
    name: "Marie Curie",
    era: "1867–1934",
    subjects: ["chemistry", "physics"],
    initial: "C",
    color: "#E8D4F0",
    posterAsset: "einstein",
    voicePitch: 1.06,
    voiceRate: 0.88,
    voiceGender: "female",
  },
  {
    id: "darwin",
    name: "Charles Darwin",
    era: "1809–1882",
    subjects: ["biology"],
    initial: "D",
    color: "#B8E8D0",
    posterAsset: "newton",
    voicePitch: 0.76,
    voiceRate: 0.86,
    voiceGender: "male",
  },
  {
    id: "euler",
    name: "Leonhard Euler",
    era: "1707–1783",
    subjects: ["math"],
    initial: "E",
    color: "#FFD6A5",
    posterAsset: "newton",
    voicePitch: 0.96,
    voiceRate: 0.94,
    voiceGender: "male",
  },
  {
    id: "hypatia",
    name: "Hypatia of Alexandria",
    era: "c. 360–415",
    subjects: ["math", "philosophy"],
    initial: "H",
    color: "#C4E0FF",
    posterAsset: "einstein",
    voicePitch: 1.02,
    voiceRate: 0.94,
    voiceGender: "female",
  },
  {
    id: "turing",
    name: "Alan Turing",
    era: "1912–1954",
    subjects: ["math", "engineering"],
    initial: "T",
    color: "#D4E8FF",
    posterAsset: "einstein",
    voicePitch: 1.0,
    voiceRate: 1.08,
    voiceGender: "male",
  },
  {
    id: "tesla",
    name: "Nikola Tesla",
    era: "1856–1943",
    subjects: ["engineering", "physics"],
    initial: "T",
    color: "#FFE4B8",
    posterAsset: "newton",
    voicePitch: 0.92,
    voiceRate: 1.04,
    voiceGender: "male",
  },
  {
    id: "aristotle",
    name: "Aristotle",
    era: "384–322 BC",
    subjects: ["philosophy", "biology"],
    initial: "A",
    color: "#E8E0D4",
    posterAsset: "newton",
    voicePitch: 0.94,
    voiceRate: 0.88,
    voiceGender: "male",
  },
  {
    id: "shakespeare",
    name: "William Shakespeare",
    era: "1564–1616",
    subjects: ["literature"],
    initial: "S",
    color: "#FFD6D6",
    posterAsset: "einstein",
    voicePitch: 0.82,
    voiceRate: 0.78,
    voiceGender: "male",
  },
  {
    id: "cleopatra",
    name: "Cleopatra VII",
    era: "69–30 BC",
    subjects: ["history"],
    initial: "C",
    color: "#F0D4E8",
    posterAsset: "einstein",
    voicePitch: 1.02,
    voiceRate: 0.94,
    voiceGender: "female",
  },
  {
    id: "sunny",
    name: "Sunny & Jo",
    era: "Funland",
    subjects: ["biology", "history", "math"],
    initial: "S",
    color: "#B8E8D0",
    posterAsset: "sunny",
    voicePitch: 1.04,
    voiceRate: 0.96,
    voiceGender: "neutral",
  },
];

const TOPIC_PERSONALITY_IDS: Record<Topic, string[]> = {
  physics: ["newton", "einstein", "tesla"],
  math: ["euler", "hypatia", "turing"],
  chemistry: ["curie"],
  biology: ["darwin", "aristotle"],
  history: ["cleopatra", "aristotle"],
  literature: ["shakespeare"],
  philosophy: ["aristotle", "hypatia"],
  engineering: ["tesla", "turing"],
};

export function personalityPool(topic: Topic, gradeLevel: GradeLevel): string[] {
  for (const grade of gradeFallbackOrder(gradeLevel)) {
    const pool = PERSONALITIES_BY_GRADE[grade]?.[topic];
    if (pool?.length) return pool;
  }

  if (gradeLevel === "K-5") {
    return ["sunny", "einstein-cartoon"];
  }

  return TOPIC_PERSONALITY_IDS[topic] ?? ["sunny"];
}

/**
 * Teachers for this topic + grade, restricted to figures who actually teach that subject.
 */
export function personalityTeachesTopic(
  personality: Personality,
  topic: Topic,
  gradeLevel?: GradeLevel
): boolean {
  if (personality.id === "sunny") return true;
  if (personality.id === "einstein-cartoon" && gradeLevel === "K-5") return true;
  if (isGuestCharacterId(personality.id)) {
    return (
      personality.subjects.includes(topic) || personality.subjects.length === 0
    );
  }
  return personality.subjects.includes(topic);
}

export function expertisePool(
  topic: Topic,
  gradeLevel: GradeLevel
): string[] {
  const pool = alignedPersonalityPool(topic, gradeLevel);
  const experts = pool.filter((id) =>
    personalityTeachesTopic(getPersonality(id), topic, gradeLevel)
  );
  if (experts.length) return experts;
  return TOPIC_PERSONALITY_IDS[topic] ?? pool;
}

/**
 * Teachers for this topic + grade. Grade-config pools are authoritative;
 * expertise filtering removes mismatched roster entries (e.g. Curie on biology).
 */
export function alignedPersonalityPool(
  topic: Topic,
  gradeLevel: GradeLevel
): string[] {
  const pool = personalityPool(topic, gradeLevel);
  if (pool.length) return pool;
  return TOPIC_PERSONALITY_IDS[topic] ?? ["einstein"];
}

/** Neutral shell teacher — real personality is chosen when the web reel loads. */
export const LOADING_PERSONALITY: Personality = {
  id: "loading",
  name: "Loading…",
  era: "",
  subjects: [],
  initial: "…",
  color: "#D8D8D8",
  posterAsset: "sunny",
  voicePitch: 1,
  voiceRate: 1,
  voiceGender: "neutral",
};

function pickFromPool(
  pool: string[],
  recentIds: string[],
  feedRecent?: FeedRecent,
  topic?: Topic
): string {
  if (!pool.length) return "einstein";

  const recentSet = new Set(recentIds.filter(Boolean));
  const fresh = pool.filter((id) => !recentSet.has(id));

  if (fresh.length) {
    const lastUsed = recentIds[0];
    const withoutLast =
      lastUsed && fresh.length > 1
        ? fresh.filter((id) => id !== lastUsed)
        : fresh;
    const candidates = withoutLast.length ? withoutLast : fresh;
    const idx = pickDiverseIndex(
      candidates.length,
      recentIds,
      `personality-${topic ?? "any"}`
    );
    return candidates[idx]!;
  }

  if (feedRecent && topic) {
    const sorted = [...pool].sort(
      (a, b) =>
        topicCharacterAppearances(feedRecent, topic, a) -
        topicCharacterAppearances(feedRecent, topic, b)
    );
    const minCount = topicCharacterAppearances(feedRecent, topic, sorted[0]!);
    const leastUsed = sorted.filter(
      (id) => topicCharacterAppearances(feedRecent, topic, id) === minCount
    );
    const lastUsed = recentIds[0];
    const withoutLast =
      lastUsed && leastUsed.length > 1
        ? leastUsed.filter((id) => id !== lastUsed)
        : leastUsed;
    const candidates = withoutLast.length ? withoutLast : leastUsed;
    const idx = pickDiverseIndex(
      candidates.length,
      recentIds,
      `personality-${topic}-least`
    );
    return candidates[idx]!;
  }

  const lastUsed = recentIds[0];
  if (lastUsed && pool.length > 1) {
    const withoutLast = pool.filter((id) => id !== lastUsed);
    if (withoutLast.length) {
      const idx = pickDiverseIndex(
        withoutLast.length,
        recentIds,
        `personality-${topic ?? "pool"}`
      );
      return withoutLast[idx]!;
    }
  }

  const idx = pickDiverseIndex(
    pool.length,
    recentIds,
    `personality-${topic ?? "pool"}-full`
  );
  return pool[idx]!;
}

export function pickPersonality(
  topic: Topic,
  gradeLevel: GradeLevel,
  recentIds: string[] = [],
  _scrollIndex = 0,
  recent?: FeedRecent
): Personality {
  const topicPool = expertisePool(topic, gradeLevel);
  const pickId = pickFromPool(topicPool, recentIds, recent, topic);
  return getPersonality(pickId);
}

export function getPersonality(id: string): Personality {
  const found = PERSONALITIES.find((p) => p.id === id);
  if (found) return found;
  if (isGuestCharacterId(id)) {
    const guest = getGuestFigureName(id);
    if (guest) {
      return {
        id,
        name: guest,
        era: "Historical era",
        subjects: [],
        initial: guest.charAt(0).toUpperCase(),
        color: "#D8D8D8",
        posterAsset: "einstein",
        voicePitch: 0.96,
        voiceRate: 0.92,
        voiceGender: "neutral",
      };
    }
  }
  return PERSONALITIES[0];
}

/** Visual identity hints so Gemini draws the correct historical figure */
export const PERSONALITY_PORTRAIT_HINTS: Record<string, string> = {
  newton:
    "Isaac Newton — 17th-century scholar, long curly wig, dark coat, serious thoughtful expression",
  einstein:
    "Albert Einstein — iconic wild white hair, mustache, warm eyes, simple sweater or shirt",
  curie:
    "Marie Curie — woman, hair in a bun, modest Victorian dress, calm determined expression",
  darwin:
    "Charles Darwin — full Victorian beard, receding hair, earth-tone coat, wise gentle face",
  euler:
    "Leonhard Euler — 18th-century European scholar, powdered wig, formal coat, intelligent gaze",
  hypatia:
    "Hypatia of Alexandria — ancient Greek woman, classical draped robes, serene intelligent face",
  turing:
    "Alan Turing — 1940s British man, neat brown hair, tweed jacket, quiet focused expression",
  tesla:
    "Nikola Tesla — tall slim man, neat mustache, slick dark hair, formal Victorian suit, intense eyes",
  aristotle:
    "Aristotle — ancient Greek philosopher, full beard, classical robes, thoughtful authoritative face",
  shakespeare:
    "William Shakespeare — Elizabethan poet, ruff collar, goatee, expressive literary face",
  cleopatra:
    "Cleopatra VII — Egyptian queen, regal gold jewelry and headdress, dignified stylized portrait",
  sunny:
    "Sunny & Jo — two cheerful cartoon kids (boy and girl), bright friendly faces, simple colorful clothes",
  "einstein-cartoon":
    "Professor Einstein — friendly cartoon Albert Einstein with wild white hair, warm smile, colorful kid-friendly style",
};
