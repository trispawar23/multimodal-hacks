import { getCharacterAssets } from "./slop-config";
import { pickPersonality } from "./personalities";
import { pickTemplate } from "./slop-templates";
import { topicAllowedForGrade, topicsForGrade } from "./grade-topics";
import type { ContentItem, GradeLevel, Topic } from "./types";

let idCounter = 0;

export function generateInstantSlop(
  topic: Topic,
  gradeLevel: GradeLevel
): ContentItem {
  const personality = pickPersonality(topic, gradeLevel);
  const template = pickTemplate(topic, gradeLevel, personality);
  const assets = getCharacterAssets(personality.posterAsset);

  return {
    id: `instant-${++idCounter}-${Date.now()}`,
    title: template.title,
    sourceUrl: "https://learnscroll.app/instant",
    platform: "tiktok",
    transcript: template.transcript,
    topics: [topic],
    qualityScore: template.qualityScore,
    gradeLevel,
    character: personality,
    thumbnailColor: assets.thumbnailColor,
    posterUrl: "",
    talkingPortrait: true,
    portraitStyle: assets.portraitStyle,
    durationSec: Math.max(
      30,
      Math.min(90, Math.round(template.transcript.split(/\s+/).length / 2.5))
    ),
    viewCount: Math.floor(Math.random() * 50000) + 8000,
    generated: true,
    // Feed now renders the lip-syncing SVG avatar (CharacterSvgAvatar) instead
    // of an AI-generated raster portrait, so no portrait fetch is needed.
    imagePending: false,
  };
}

export function generateInstantFeed(
  topicFilter: Topic | "all",
  gradeLevel: GradeLevel,
  count = 4
): ContentItem[] {
  const topics =
    topicFilter === "all"
      ? topicsForGrade(gradeLevel)
      : topicAllowedForGrade(topicFilter, gradeLevel)
        ? [topicFilter]
        : topicsForGrade(gradeLevel).slice(0, 1);

  const items: ContentItem[] = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    items.push(generateInstantSlop(topic, gradeLevel));
  }
  return items;
}

export const PORTRAIT_URLS = [
  "/media/newton-ai-talking.png",
  "/media/einstein-realistic.png",
  "/media/einstein-cartoon.png",
  "/media/sunny-kids-3d.png",
] as const;

export function preloadPortraits(): void {
  if (typeof window === "undefined") return;
  for (const url of PORTRAIT_URLS) {
    const img = new window.Image();
    img.src = url;
  }
}
