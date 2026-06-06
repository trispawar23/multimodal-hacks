import { CHARACTERS } from "./mock-data";
import { TOPIC_LABELS } from "./grade-topics";
import type { AICharacter, GradeLevel, PortraitStyle, Topic } from "./types";

export interface CharacterAssets {
  posterUrl: string;
  portraitStyle: PortraitStyle;
  thumbnailColor: string;
  talkingPortrait: boolean;
}

export const CHARACTER_ASSETS: Record<string, CharacterAssets> = {
  newton: {
    posterUrl: "/media/newton-ai-talking.png",
    portraitStyle: "realistic",
    thumbnailColor: "#A8C8FF",
    talkingPortrait: true,
  },
  einstein: {
    posterUrl: "/media/einstein-realistic.png",
    portraitStyle: "realistic",
    thumbnailColor: "#D4C4F0",
    talkingPortrait: true,
  },
  "einstein-cartoon": {
    posterUrl: "/media/einstein-cartoon.png",
    portraitStyle: "illustration",
    thumbnailColor: "#FFD6A5",
    talkingPortrait: true,
  },
  sunny: {
    posterUrl: "/media/sunny-kids-3d.png",
    portraitStyle: "3d",
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

const PORTRAIT_STYLE_DESC: Record<PortraitStyle, string> = {
  realistic:
    "photorealistic cinematic talking-head portrait, soft studio lighting, lifelike skin",
  illustration:
    "warm hand-drawn cartoon illustration, friendly educational app style, soft pastels",
  "3d": "vibrant Pixar-style 3D character portrait, cheerful kids show aesthetic",
};

const TOPIC_VISUAL_HINTS: Partial<Record<Topic, string>> = {
  physics: "subtle abstract motion or light rays, no equations with readable text",
  math: "soft geometric shapes in background, no readable numbers",
  chemistry: "glassware and soft violet glow, laboratory atmosphere",
  biology: "gentle leaf or cell motifs, organic greens",
  history: "warm antique tones, subtle map texture without labels",
  literature: "quill or open book props, no readable pages",
  philosophy: "marble column bokeh, thoughtful atmosphere",
  engineering: "gears or blueprint texture, no readable plans",
};

export function buildPortraitPrompt(
  characterName: string,
  era: string,
  topic: Topic,
  title: string,
  portraitStyle: PortraitStyle,
  gradeLevel: GradeLevel
): string {
  const style = PORTRAIT_STYLE_DESC[portraitStyle];
  const topicLabel = TOPIC_LABELS[topic];
  const visual = TOPIC_VISUAL_HINTS[topic] ?? "soft educational atmosphere";

  return [
    "Generate a single portrait image.",
    "Vertical 9:16 mobile video still, chest-up, eye contact with camera.",
    style,
    `Depict ${characterName} (${era}), famous expert in ${topicLabel}.`,
    `They are teaching a ${gradeLevel} level lesson about ${topicLabel}.`,
    `Lesson mood inspired by: ${title}.`,
    visual,
    "Soft pastel cream background.",
    "CRITICAL RULES: absolutely NO text, letters, numbers, captions, subtitles, logos, watermarks, UI, or readable writing anywhere in the image.",
  ].join(" ");
}
