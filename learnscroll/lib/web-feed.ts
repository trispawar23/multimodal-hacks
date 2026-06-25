import {
  pickPersonalityScript,
  voiceWrapTemplate,
} from "./character-script";
import { adaptTemplateForGrade, gradeFallbackTemplate } from "./grade-config";
import { fetchGuestPortraitUrl, isGuestPortraitUrl } from "./guest-portraits";
import {
  alignedPersonalityPool,
  expertisePool,
  getPersonality,
  personalityTeachesTopic,
  pickPersonality,
  type Personality,
} from "./personalities";
import { isCharacterPortraitUrl } from "./portrait-validation";
import { fetchWebPortraitUrl, portraitVariantCount } from "./web-portraits";
import {
  discoverWikiFigure,
  getGuestFigureName,
  isGuestCharacterId,
  personalityFromWikiFigure,
} from "./wiki-figures";
import {
  adaptWikiForGrade,
  discoverWikiConceptForPersonality,
  expertQueriesForPersonality,
} from "./wikipedia-content";
import { TOPIC_LABELS } from "./grade-topics";
import { pickDiverseIndex, conceptIsExcluded } from "./feed-diversity";
import { createFeedRecent, type FeedRecent } from "./feed-diversity";
import type { GradeLevel, Topic } from "./types";
import type { WikiSummary } from "./wikipedia-content";

export interface WebReelInput {
  topic: Topic;
  gradeLevel: GradeLevel;
  scrollIndex: number;
  recentCharacterIds?: string[];
  recentFigureNames?: string[];
  recentConcepts?: string[];
  recentPortraitUrls?: string[];
  portraitVariantSeed?: number;
  /** Ordered topic:character picks — improves rotation when roster pool is small. */
  topicCharacterHistory?: string[];
  /** Client-reserved teacher so parallel hydrates do not collide. */
  preferredCharacterId?: string;
}

export interface WebReelResult {
  title: string;
  transcript: string;
  sourceUrl: string;
  posterUrl?: string;
  wikiTitle: string;
  characterId: string;
  character: Personality;
  topic: Topic;
  gradeLevel: GradeLevel;
  portraitVariant: number;
  qualityScore: number;
}

function lessonTitle(
  personality: Personality,
  wikiTitle: string,
  gradeLevel: GradeLevel
): string {
  const wikiLower = wikiTitle.trim().toLowerCase();
  const first = personality.name.split(" ")[0];
  const firstLower = first.toLowerCase();

  if (personality.id === "sunny") {
    return wikiTitle;
  }

  if (wikiLower === personality.name.toLowerCase() || wikiLower === firstLower) {
    return wikiTitle;
  }

  return `${personality.name} — ${wikiTitle}`;
}

function portraitVariantFor(
  characterId: string,
  topic: Topic,
  scrollIndex: number,
  gradeLevel: GradeLevel,
  seed = 0
): number {
  if (isGuestCharacterId(characterId)) return scrollIndex;

  const pool = alignedPersonalityPool(topic, gradeLevel);
  const charIndex = Math.max(0, pool.indexOf(characterId));
  const variantCount = portraitVariantCount(characterId);
  const gradeOffset =
    { "K-5": 0, "6-8": 1, "9-12": 2, college: 3, graduate: 4 }[gradeLevel] ??
    0;
  const diverse = pickDiverseIndex(variantCount, [], `${characterId}:${topic}`);
  return (
    (scrollIndex + charIndex + diverse + gradeOffset + seed) %
    Math.max(1, variantCount)
  );
}

function recentFigureNames(recentIds: string[]): string[] {
  const names: string[] = [];
  for (const id of recentIds) {
    if (isGuestCharacterId(id)) {
      const guest = getGuestFigureName(id);
      if (guest) names.push(guest);
    } else {
      names.push(getPersonality(id).name);
    }
  }
  return names;
}

function nameRecentlyUsed(name: string, recentNames: string[]): boolean {
  const lower = name.trim().toLowerCase();
  return recentNames.some((n) => n.trim().toLowerCase() === lower);
}

function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

async function discoverLessonForPersonality(
  personality: Personality,
  topic: Topic,
  scrollIndex: number,
  recentConcepts: string[],
  gradeLevel: GradeLevel
): Promise<WikiSummary> {
  const queryCount = expertQueriesForPersonality(personality, topic, gradeLevel).length;
  const attempts = Math.min(3, Math.max(2, queryCount));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const wikiRaw = await discoverWikiConceptForPersonality(
      personality,
      topic,
      scrollIndex + attempt * 9 + Math.floor(Math.random() * 5),
      recentConcepts,
      gradeLevel
    );
    if (wikiRaw) return wikiRaw;
  }

  const fallback = gradeFallbackTemplate(topic, gradeLevel);
  if (
    fallback &&
    !conceptIsExcluded(topic, fallback.title, recentConcepts)
  ) {
    return wikiFromScript(personality, fallback);
  }

  const label = TOPIC_LABELS[topic];
  const conceptTitle =
    personality.id === "sunny"
      ? `Fun ${label.toLowerCase()} facts`
      : `${personality.name} on ${label.toLowerCase()}`;
  return {
    title: conceptTitle,
    extract: `Let me share what I know about ${label.toLowerCase()} from my own work and discoveries.`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
      personality.name.replace(/ /g, "_")
    )}`,
  };
}

function wikiFromScript(
  personality: Personality,
  script: { title: string; transcript: string }
): WikiSummary {
  return {
    title: script.title,
    extract: script.transcript,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
      personality.name.replace(/ /g, "_")
    )}`,
  };
}

async function assignGuestPortrait(
  personality: Personality,
  wiki: WikiSummary,
  scrollIndex: number,
  excludeUrls: string[]
): Promise<string | undefined> {
  const portrait =
    (await promiseWithTimeout(
      fetchGuestPortraitUrl(personality.name, scrollIndex, excludeUrls),
      2000,
      null
    )) ??
    wiki.thumbnailUrl ??
    null;

  if (
    portrait &&
    isGuestPortraitUrl(personality.name, portrait, wiki.thumbnailUrl)
  ) {
    return portrait;
  }
  return undefined;
}

async function resolveGuestTeacher(
  topic: Topic,
  gradeLevel: GradeLevel,
  scrollIndex: number,
  recentIds: string[],
  recentFigureNames: string[],
  excludeUrls: string[]
): Promise<{ personality: Personality; posterUrl?: string } | null> {
  const figure = await discoverWikiFigure(
    topic,
    scrollIndex,
    recentFigureNames,
    gradeLevel
  );
  if (!figure) return null;
  if (nameRecentlyUsed(figure.title, recentFigureNames)) return null;

  const personality = personalityFromWikiFigure(figure, topic);
  const posterUrl = await assignGuestPortrait(
    personality,
    figure,
    scrollIndex,
    excludeUrls
  );
  return { personality, posterUrl };
}

function pickRecentFromInput(input: WebReelInput): FeedRecent | undefined {
  if (!input.topicCharacterHistory?.length) return undefined;
  const recent = createFeedRecent();
  recent.topicCharacterHistory = [...input.topicCharacterHistory];
  return recent;
}

/** Mix guest historians into rotation when the roster pool for a topic is small. */
function shouldPreferGuestTeacher(
  gradeLevel: GradeLevel,
  scrollIndex: number,
  rosterPoolSize: number
): boolean {
  if (gradeLevel === "K-5") return scrollIndex % 3 !== 1;
  if (rosterPoolSize <= 1) return scrollIndex % 2 === 0;
  if (rosterPoolSize <= 3) return scrollIndex % 2 === 0;
  return scrollIndex % 4 === 0;
}

/** Build one reel — teacher first, then a concept from their expertise. */
export async function buildWebReel(input: WebReelInput): Promise<WebReelResult> {
  const topicRecent = (input.recentCharacterIds ?? []).filter(Boolean);
  const recentNames = input.recentFigureNames ?? recentFigureNames(topicRecent);
  const recentConcepts = input.recentConcepts ?? [];
  const pickRecent = pickRecentFromInput(input);
  const rosterPool = expertisePool(input.topic, input.gradeLevel);
  const preferGuest = shouldPreferGuestTeacher(
    input.gradeLevel,
    input.scrollIndex,
    rosterPool.length
  );

  let personality = pickPersonality(
    input.topic,
    input.gradeLevel,
    topicRecent,
    input.scrollIndex,
    pickRecent
  );

  if (input.preferredCharacterId) {
    const preferred = getPersonality(input.preferredCharacterId);
    if (personalityTeachesTopic(preferred, input.topic, input.gradeLevel)) {
      personality = preferred;
    }
  }

  if (!personalityTeachesTopic(personality, input.topic, input.gradeLevel)) {
    const experts = expertisePool(input.topic, input.gradeLevel);
    personality = getPersonality(
      experts[input.scrollIndex % Math.max(1, experts.length)] ??
        experts[0] ??
        personality.id
    );
  }

  const scriptTemplate = pickPersonalityScript(
    personality,
    input.topic,
    input.gradeLevel,
    recentConcepts,
    input.scrollIndex
  );

  const portraitVariant = portraitVariantFor(
    personality.id,
    input.topic,
    input.scrollIndex,
    input.gradeLevel,
    input.portraitVariantSeed ?? 0
  );

  const [portrait, lessonWiki] = await Promise.all([
    fetchWebPortraitUrl(personality.id, input.gradeLevel, portraitVariant, {
      excludeUrls: input.recentPortraitUrls ?? [],
      topic: input.topic,
    }),
    scriptTemplate
      ? Promise.resolve(wikiFromScript(personality, scriptTemplate))
      : discoverLessonForPersonality(
          personality,
          input.topic,
          input.scrollIndex,
          recentConcepts,
          input.gradeLevel
        ),
  ]);

  let posterUrl: string | undefined =
    portrait.posterUrl &&
    isCharacterPortraitUrl(personality.id, portrait.posterUrl)
      ? portrait.posterUrl
      : undefined;

  if (preferGuest) {
    const guest = await promiseWithTimeout(
      resolveGuestTeacher(
        input.topic,
        input.gradeLevel,
        input.scrollIndex,
        topicRecent,
        recentNames,
        input.recentPortraitUrls ?? []
      ),
      2500,
      null
    );

    if (guest?.posterUrl && guest.personality) {
      personality = guest.personality;
      posterUrl = guest.posterUrl;
      if (input.gradeLevel === "K-5") {
        personality = {
          ...personality,
          voiceRate: 0.98,
          voicePitch: personality.voiceGender === "female" ? 1.1 : 1.02,
        };
      }
    }
  }

  const wiki = adaptWikiForGrade(
    lessonWiki,
    input.gradeLevel,
    personality.id
  );

  const baseTemplate = {
    title: wiki.title,
    transcript: wiki.extract,
    qualityScore: scriptTemplate?.qualityScore ?? 0.91,
  };

  const wrapped = scriptTemplate
    ? adaptTemplateForGrade(
        baseTemplate,
        input.gradeLevel,
        personality,
        input.topic
      )
    : voiceWrapTemplate(
        baseTemplate,
        personality,
        input.topic,
        input.gradeLevel
      );

  return {
    title: lessonTitle(personality, wiki.title, input.gradeLevel),
    transcript: wrapped.transcript,
    sourceUrl: wiki.url,
    posterUrl,
    wikiTitle: lessonWiki.title,
    characterId: personality.id,
    character: personality,
    topic: input.topic,
    gradeLevel: input.gradeLevel,
    portraitVariant,
    qualityScore: wrapped.qualityScore,
  };
}
