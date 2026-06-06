import type { AICharacter, GradeLevel, Topic } from "./types";

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
    voicePitch: 0.78,
    voiceRate: 0.92,
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
    voicePitch: 0.88,
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
    voicePitch: 1.12,
    voiceRate: 0.94,
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
    voicePitch: 0.82,
    voiceRate: 0.9,
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
    voicePitch: 0.86,
    voiceRate: 1.0,
    voiceGender: "male",
  },
  {
    id: "hypatia",
    name: "Hypatia of Alexandria",
    era: "c. 360–415",
    subjects: ["math", "philosophy"],
    initial: "H",
    color: "#C4E0FF",
    posterAsset: "einstein-cartoon",
    voicePitch: 1.1,
    voiceRate: 0.95,
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
    voicePitch: 0.9,
    voiceRate: 1.02,
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
    voicePitch: 0.84,
    voiceRate: 0.98,
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
    voicePitch: 0.8,
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
    posterAsset: "einstein-cartoon",
    voicePitch: 0.87,
    voiceRate: 0.86,
    voiceGender: "male",
  },
  {
    id: "cleopatra",
    name: "Cleopatra VII",
    era: "69–30 BC",
    subjects: ["history"],
    initial: "C",
    color: "#F0D4E8",
    posterAsset: "einstein-cartoon",
    voicePitch: 1.08,
    voiceRate: 0.93,
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
    voicePitch: 1.18,
    voiceRate: 1.05,
    voiceGender: "neutral",
  },
];

const TOPIC_PERSONALITY_IDS: Record<Topic, string[]> = {
  physics: ["einstein", "newton", "tesla"],
  math: ["euler", "hypatia", "turing"],
  chemistry: ["curie"],
  biology: ["darwin", "aristotle", "sunny"],
  history: ["cleopatra", "sunny"],
  literature: ["shakespeare"],
  philosophy: ["aristotle", "hypatia"],
  engineering: ["tesla", "turing"],
};

let pickCounter = 0;

export function pickPersonality(topic: Topic, gradeLevel: GradeLevel): Personality {
  if (gradeLevel === "K-5" || gradeLevel === "6-8") {
    const kid = PERSONALITIES.find((p) => p.id === "sunny");
    if (kid && (topic === "biology" || topic === "history" || topic === "math")) {
      return kid;
    }
  }

  const ids = TOPIC_PERSONALITY_IDS[topic] ?? ["einstein"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  pickCounter += 1;
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}

export function getPersonality(id: string): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}
