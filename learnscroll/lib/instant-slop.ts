import { LOADING_PERSONALITY } from "./personalities";
import { topicAllowedForGrade, topicsForGrade } from "./grade-topics";
import {
  createFeedRecent,
  pickDiverse,
  recordTopic,
  shuffle,
  type FeedRecent,
} from "./feed-diversity";
import type { ContentItem, GradeLevel, Topic } from "./types";

let idCounter = 0;

/** Pick the next topic for a feed batch or infinite scroll. */
export function pickTopicForFeed(
  topicFilter: Topic | "all",
  gradeLevel: GradeLevel,
  scrollIndex: number,
  recent: FeedRecent
): Topic {
  const topicPool =
    topicFilter === "all"
      ? shuffle(topicsForGrade(gradeLevel))
      : topicAllowedForGrade(topicFilter, gradeLevel)
        ? [topicFilter]
        : topicsForGrade(gradeLevel).slice(0, 1);

  if (topicFilter !== "all") {
    return topicPool[0];
  }

  return (
    pickDiverse(topicPool, recent.topics, (t) => t) ??
    topicPool[scrollIndex % topicPool.length]
  );
}

/** Lightweight shell — teacher + lesson come from `/api/feed/reel`. */
export function createPlaceholderReel(
  topic: Topic,
  gradeLevel: GradeLevel,
  scrollIndex: number,
  recent: FeedRecent
): ContentItem {
  recordTopic(recent, topic);

  return {
    id: `web-${++idCounter}-${Date.now()}-${scrollIndex}`,
    title: "Finding a lesson…",
    sourceUrl: "",
    platform: "tiktok",
    transcript: "Searching the web for something new to teach you…",
    topics: [topic],
    qualityScore: 0.5,
    gradeLevel,
    character: LOADING_PERSONALITY,
    thumbnailColor: LOADING_PERSONALITY.color,
    posterUrl: "",
    talkingPortrait: true,
    portraitStyle: "illustration",
    portraitVariant: scrollIndex,
    durationSec: 45,
    viewCount: Math.floor(Math.random() * 50000) + 8000,
    generated: true,
    scrollIndex,
    enrichPending: true,
    imagePending: true,
    wantAiPortrait: false,
  };
}

export function createPlaceholderFeed(
  topicFilter: Topic | "all",
  gradeLevel: GradeLevel,
  count: number,
  recent: FeedRecent,
  startIndex = 0
): ContentItem[] {
  const items: ContentItem[] = [];
  for (let i = 0; i < count; i++) {
    const scrollIndex = startIndex + i;
    const topic = pickTopicForFeed(
      topicFilter,
      gradeLevel,
      scrollIndex,
      recent
    );
    items.push(createPlaceholderReel(topic, gradeLevel, scrollIndex, recent));
  }
  return items;
}

export function preloadPortraits(): void {
  if (typeof window === "undefined") return;
}

export { createFeedRecent, type FeedRecent };
