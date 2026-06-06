import { FEED_ITEMS } from "./mock-data";
import { getPersonality } from "./personalities";
import type { AICharacter, ContentItem, GradeLevel, Topic } from "./types";

type ContentPayload = Partial<ContentItem> & {
  id?: string;
  contentId?: string;
  characterId?: string;
};

const DEFAULT_CONTENT = FEED_ITEMS[0];

export function resolveCharacter(characterId?: string): AICharacter {
  if (!characterId) return DEFAULT_CONTENT.character;
  return getPersonality(characterId);
}

export function resolveContent(payload: ContentPayload): ContentItem {
  const id = payload.id ?? payload.contentId;
  const catalogItem = id ? FEED_ITEMS.find((item) => item.id === id) : null;
  if (catalogItem) return catalogItem;

  const character = payload.character ?? resolveCharacter(payload.characterId);
  const topics = payload.topics?.length ? payload.topics : character.subjects;

  return {
    id: id ?? `request-${Date.now()}`,
    title: payload.title ?? "Generated Luminary lesson",
    sourceUrl: payload.sourceUrl ?? "https://learnscroll.app/generated",
    platform: payload.platform ?? "tiktok",
    transcript: payload.transcript ?? DEFAULT_CONTENT.transcript,
    topics: topics as Topic[],
    qualityScore: payload.qualityScore ?? 0.85,
    gradeLevel: (payload.gradeLevel ?? DEFAULT_CONTENT.gradeLevel) as GradeLevel,
    character,
    thumbnailColor: payload.thumbnailColor ?? character.color,
    posterUrl: payload.posterUrl ?? "",
    videoUrl: payload.videoUrl,
    talkingPortrait: payload.talkingPortrait ?? true,
    portraitStyle: payload.portraitStyle,
    durationSec: payload.durationSec ?? 60,
    viewCount: payload.viewCount ?? 0,
    generated: payload.generated ?? true,
    imagePending: payload.imagePending ?? false,
  };
}
