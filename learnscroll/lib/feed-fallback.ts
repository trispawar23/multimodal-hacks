import { adaptTemplateForGrade, gradeFallbackTemplate } from "./grade-config";
import { TOPIC_LABELS } from "./grade-topics";
import { createFeedRecent } from "./feed-diversity";
import { pickPersonality } from "./personalities";
import { fetchWebPortraitUrl } from "./web-portraits";
import { isCharacterPortraitUrl } from "./portrait-validation";
import type { WebReelResult } from "./web-feed";
import type { GradeLevel, Topic } from "./types";

/** Instant bundled lesson when Wikipedia / network fails — no external fetch. */
export function buildInlineFallbackReel(input: {
  topic: Topic;
  gradeLevel: GradeLevel;
  scrollIndex: number;
  recentCharacterIds?: string[];
  topicCharacterHistory?: string[];
}): WebReelResult {
  const pickRecent = input.topicCharacterHistory?.length
    ? {
        ...createFeedRecent(),
        topicCharacterHistory: [...input.topicCharacterHistory],
      }
    : undefined;

  const personality = pickPersonality(
    input.topic,
    input.gradeLevel,
    input.recentCharacterIds ?? [],
    input.scrollIndex,
    pickRecent
  );

  const template = gradeFallbackTemplate(input.topic, input.gradeLevel) ?? {
    title: TOPIC_LABELS[input.topic],
    transcript: `Let's explore ${TOPIC_LABELS[input.topic].toLowerCase()} together.`,
    qualityScore: 0.85,
  };

  const adapted = adaptTemplateForGrade(
    template,
    input.gradeLevel,
    personality,
    input.topic
  );

  return {
    title: adapted.title,
    transcript: adapted.transcript,
    sourceUrl: "",
    wikiTitle: adapted.title,
    characterId: personality.id,
    character: personality,
    topic: input.topic,
    gradeLevel: input.gradeLevel,
    portraitVariant: input.scrollIndex,
    qualityScore: adapted.qualityScore,
  };
}

/** Server-side fallback with curated portrait lookup. */
export async function buildLocalFallbackReel(input: {
  topic: Topic;
  gradeLevel: GradeLevel;
  scrollIndex: number;
  recentCharacterIds?: string[];
  topicCharacterHistory?: string[];
}): Promise<WebReelResult> {
  const base = buildInlineFallbackReel(input);
  const portrait = await fetchWebPortraitUrl(
    base.characterId,
    input.gradeLevel,
    input.scrollIndex,
    { topic: input.topic }
  );
  const posterUrl =
    portrait.posterUrl &&
    isCharacterPortraitUrl(base.characterId, portrait.posterUrl)
      ? portrait.posterUrl
      : undefined;

  return { ...base, posterUrl };
}
