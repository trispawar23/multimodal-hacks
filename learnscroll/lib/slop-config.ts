import { CHARACTERS } from "./mock-data";
import type { AICharacter, GradeLevel, PortraitStyle, Topic } from "./types";
import {
  PERSONALITY_PORTRAIT_HINTS,
  type Personality,
} from "./personalities";
import { GRADE_PORTRAIT_HINT, GRADE_LABEL_SHORT } from "./grade-config";

export interface CharacterAssets {
  posterUrl: string;
  portraitStyle: PortraitStyle;
  thumbnailColor: string;
  talkingPortrait: boolean;
}

export const CHARACTER_ASSETS: Record<string, CharacterAssets> = {
  newton: {
    posterUrl: "",
    portraitStyle: "realistic",
    thumbnailColor: "#A8C8FF",
    talkingPortrait: true,
  },
  einstein: {
    posterUrl: "",
    portraitStyle: "realistic",
    thumbnailColor: "#D4C4F0",
    talkingPortrait: true,
  },
  "einstein-cartoon": {
    posterUrl: "",
    portraitStyle: "illustration",
    thumbnailColor: "#FFD6A5",
    talkingPortrait: true,
  },
  sunny: {
    posterUrl: "",
    portraitStyle: "illustration",
    thumbnailColor: "#B8E8D0",
    talkingPortrait: true,
  },
};

const TOPIC_CHARACTER_PRIORITY: Partial<Record<Topic, string[]>> = {
  physics: ["newton", "einstein", "einstein-cartoon"],
  math: ["einstein-cartoon", "newton"],
  biology: ["sunny", "einstein-cartoon"],
  history: ["sunny", "einstein-cartoon"],
  chemistry: ["einstein", "newton"],
  literature: ["einstein-cartoon", "sunny"],
  engineering: ["newton", "einstein"],
  philosophy: ["einstein-cartoon", "einstein"],
};

export function pickCharacterForTopic(
  topic: Topic,
  gradeLevel: GradeLevel = "9-12"
): AICharacter {
  if (gradeLevel === "K-5" || gradeLevel === "6-8") {
    const sunny = CHARACTERS.find((c) => c.id === "sunny");
    if (sunny) return sunny;
  }

  const priority = TOPIC_CHARACTER_PRIORITY[topic] ?? ["einstein-cartoon"];
  const id = priority[Math.floor(Math.random() * priority.length)];
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function getCharacterAssets(characterId: string): CharacterAssets {
  return CHARACTER_ASSETS[characterId] ?? CHARACTER_ASSETS["einstein-cartoon"];
}

/** Fast illustrated fallback — always cartoon/3D, never heavy realistic PNGs */
export function getIllustratedAssets(
  posterAsset: string,
  gradeLevel: GradeLevel
): CharacterAssets {
  if (gradeLevel === "K-5" || gradeLevel === "6-8") {
    return CHARACTER_ASSETS.sunny;
  }
  if (posterAsset === "sunny") return CHARACTER_ASSETS.sunny;
  return CHARACTER_ASSETS["einstein-cartoon"];
}

export const AI_PORTRAIT_STYLE: PortraitStyle = "illustration";

/** Portrait prompt — personality only, styled for grade band */
export function buildPortraitPrompt(
  personality: Personality,
  gradeLevel: GradeLevel = "9-12"
): string {
  const look =
    PERSONALITY_PORTRAIT_HINTS[personality.id] ??
    `${personality.name} (${personality.era}), historically recognizable likeness`;
  const gradeHint = GRADE_PORTRAIT_HINT[gradeLevel] ?? GRADE_PORTRAIT_HINT["9-12"];
  const audience = GRADE_LABEL_SHORT[gradeLevel] ?? "students";

  return [
    "Single character portrait only. One person centered in frame.",
    "Flat cartoon illustration, friendly mobile educational app style.",
    "Vertical 9:16, chest-up, plain solid pastel cream background.",
    `Draw ONLY ${personality.name} (${personality.era}).`,
    `Appearance: ${look}.`,
    `Style for ${audience}: ${gradeHint}.`,
    `Must be unmistakably ${personality.name} — not Einstein, not Newton, not any other figure.`,
    "No props, no classroom, no chalkboard, no books, no lab equipment, no topic symbols, no scenery.",
    "No other people. Character fills the frame.",
    "NO text, NO letters, NO numbers, NO labels, NO watermarks, NO photorealism.",
  ].join(" ");
}
