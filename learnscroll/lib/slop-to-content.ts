import { CHARACTERS } from "./mock-data";
import type { SlopGenerationResult } from "./gemini";
import { getCharacterAssets } from "./slop-config";
import type { ContentItem, GradeLevel } from "./types";

export function slopToContentItem(
  slop: SlopGenerationResult,
  gradeLevel: GradeLevel = "9-12",
  posterUrl: string
): ContentItem {
  const character =
    CHARACTERS.find((c) => c.id === slop.characterId) ?? CHARACTERS[0];
  const assets = getCharacterAssets(character.id);

  return {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: slop.title,
    sourceUrl: "https://learnscroll.app/generated",
    platform: "tiktok",
    transcript: slop.transcript,
    topics: slop.topics,
    qualityScore: slop.qualityScore,
    gradeLevel,
    character,
    thumbnailColor: assets.thumbnailColor,
    posterUrl,
    talkingPortrait: assets.talkingPortrait,
    portraitStyle: assets.portraitStyle,
    durationSec: Math.max(45, Math.min(90, Math.round(slop.transcript.split(/\s+/).length / 2.5))),
    viewCount: Math.floor(Math.random() * 40000) + 5000,
    generated: true,
  };
}
