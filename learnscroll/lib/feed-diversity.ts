import type { Topic } from "./types";

export interface FeedRecent {
  characters: string[];
  /** Display names parallel to `characters` (needed for guest teachers). */
  characterNames: string[];
  templateKeys: string[];
  topics: Topic[];
  portraitVariants: string[];
  /** Recently taught Wikipedia concepts (lowercased titles). */
  concepts: string[];
  /** Recently shown portrait URLs — avoids the same Commons image repeating. */
  portraitUrls: string[];
  /** Ordered history of topic+character picks (allows repeats tracking). */
  topicCharacterHistory: string[];
}

const MAX_RECENT = 64;

/** Map variant titles to one canonical id so "DNA" and "Deoxyribonucleic acid" dedupe. */
const CONCEPT_CANONICAL: { pattern: RegExp; id: string }[] = [
  { pattern: /\b(deoxyribonucleic acid|dna)\b/i, id: "dna" },
  { pattern: /\bnatural selection\b/i, id: "natural-selection" },
  { pattern: /\bradioactiv/i, id: "radioactivity" },
  { pattern: /\bphotosynthesis\b/i, id: "photosynthesis" },
  { pattern: /\bevolution\b/i, id: "evolution" },
  { pattern: /\bgenetic(s)?\b/i, id: "genetics" },
  { pattern: /\bgravity\b/i, id: "gravity" },
  { pattern: /\brelativity\b/i, id: "relativity" },
  { pattern: /\bperiodic table\b/i, id: "periodic-table" },
  { pattern: /\becosystem(s)?\b/i, id: "ecosystem" },
  { pattern: /\bcell biology\b/i, id: "cell-biology" },
  { pattern: /\balternating current\b/i, id: "alternating-current" },
];

export function normalizeConceptId(title: string): string {
  const lower = title.trim().toLowerCase();
  for (const { pattern, id } of CONCEPT_CANONICAL) {
    if (pattern.test(lower)) return id;
  }
  const stripped = lower.replace(/^[^—]+—\s*/, "").trim();
  const probe = stripped !== lower ? stripped : lower;
  for (const { pattern, id } of CONCEPT_CANONICAL) {
    if (pattern.test(probe)) return id;
  }
  const slug = probe.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || lower;
}

export function extractConceptTitle(displayTitle: string): string {
  const parts = displayTitle.split("—");
  if (parts.length > 1) {
    return parts[parts.length - 1]?.trim() ?? displayTitle.trim();
  }
  return displayTitle.trim();
}

export function createFeedRecent(): FeedRecent {
  return {
    characters: [],
    characterNames: [],
    templateKeys: [],
    topics: [],
    portraitVariants: [],
    concepts: [],
    portraitUrls: [],
    topicCharacterHistory: [],
  };
}

export function templateKey(topic: Topic, title: string): string {
  return `${topic}:${title}`;
}

export function portraitVariantKey(
  characterId: string,
  topic: Topic,
  variant: number
): string {
  return `${characterId}:${topic}:${variant}`;
}

function pushRecent(list: string[], value: string, max = MAX_RECENT): string[] {
  return [value, ...list.filter((v) => v !== value)].slice(0, max);
}

export function recordCharacter(
  recent: FeedRecent,
  characterId: string,
  characterName?: string
): void {
  recent.characters = pushRecent(recent.characters, characterId);
  if (characterName?.trim()) {
    recent.characterNames = pushRecent(recent.characterNames, characterName.trim());
  }
}

export function recordTemplate(
  recent: FeedRecent,
  topic: Topic,
  title: string
): void {
  recent.templateKeys = pushRecent(recent.templateKeys, templateKey(topic, title));
}

export function recordTopic(recent: FeedRecent, topic: Topic): void {
  recent.topics = pushRecent(recent.topics, topic) as Topic[];
}

export function conceptKey(topic: Topic, title: string): string {
  return `${topic}:${normalizeConceptId(title)}`;
}

/** Concepts already shown or reserved — used when hydrating the next reel. */
export function recentConceptsForHydrate(
  recent: FeedRecent,
  topic: Topic,
  items: {
    topics: Topic[];
    wikiTitle?: string;
    title: string;
    enrichPending?: boolean;
  }[],
  pending: string[] = []
): string[] {
  const keys = new Set<string>([...recent.concepts, ...pending]);

  for (const item of items) {
    if (item.enrichPending) continue;
    const itemTopic = item.topics[0];
    if (!itemTopic || itemTopic !== topic) continue;
    const title = item.wikiTitle?.trim() || extractConceptTitle(item.title);
    if (!title) continue;
    keys.add(conceptKey(itemTopic, title));
  }

  return [...keys];
}

export function recordConcept(
  recent: FeedRecent,
  topic: Topic,
  title: string
): void {
  const key = conceptKey(topic, title);
  if (!title.trim()) return;
  recent.concepts = pushRecent(recent.concepts, key);
}

/** Match bare titles and topic-prefixed keys from recent concept history. */
export function conceptIsExcluded(
  topic: Topic,
  title: string,
  excludeTitles: string[]
): boolean {
  const lower = title.trim().toLowerCase();
  const normalized = normalizeConceptId(title);
  const prefixed = conceptKey(topic, title);
  return excludeTitles.some((entry) => {
    const e = entry.trim().toLowerCase();
    if (e === lower || e === prefixed) return true;
    if (e.endsWith(`:${normalized}`) || e.endsWith(`:${lower}`)) return true;
    const bare = e.includes(":") ? (e.split(":").pop() ?? e) : e;
    return bare === normalized || bare === lower;
  });
}

export function recordPortraitUrl(recent: FeedRecent, url: string): void {
  if (!url) return;
  recent.portraitUrls = pushRecent(recent.portraitUrls, url);
}

export function recordPortraitVariant(
  recent: FeedRecent,
  topic: Topic,
  characterId: string,
  variant: number
): void {
  recent.portraitVariants = pushRecent(
    recent.portraitVariants,
    portraitVariantKey(characterId, topic, variant)
  );
}

export function recordTopicCharacter(
  recent: FeedRecent,
  topic: Topic,
  characterId: string
): void {
  const key = `${topic}:${characterId}`;
  recent.topicCharacterHistory.push(key);
  if (recent.topicCharacterHistory.length > 48) {
    recent.topicCharacterHistory.shift();
  }
}

/** Most-recent-first character ids for a single topic. */
export function recentCharactersForTopic(
  recent: FeedRecent,
  topic: Topic
): string[] {
  const prefix = `${topic}:`;
  const hits: string[] = [];
  for (let i = recent.topicCharacterHistory.length - 1; i >= 0; i--) {
    const entry = recent.topicCharacterHistory[i];
    if (entry.startsWith(prefix)) {
      hits.push(entry.slice(prefix.length));
    }
  }
  return hits;
}

/** Global + topic recency for teacher rotation while scrolling. */
export function recentCharactersForPick(
  recent: FeedRecent,
  topic: Topic
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const id of [
    ...recent.characters,
    ...recentCharactersForTopic(recent, topic),
  ]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

/** Teachers already on screen or reserved — avoids duplicate picks while hydrating. */
export function recentCharactersForHydrate(
  recent: FeedRecent,
  topic: Topic,
  items: {
    topics: Topic[];
    character: { id: string; name: string };
    enrichPending?: boolean;
  }[],
  pendingCharacterIds: string[] = []
): string[] {
  const ids = new Set<string>([
    ...recentCharactersForPick(recent, topic),
    ...pendingCharacterIds,
  ]);

  for (const item of items) {
    if (item.enrichPending || item.character.id === "loading") continue;
    const itemTopic = item.topics[0];
    if (!itemTopic || itemTopic !== topic) continue;
    ids.add(item.character.id);
  }

  return [...ids];
}

/** Figure display names already shown — for guest teacher dedup. */
export function recentFigureNamesForHydrate(
  recent: FeedRecent,
  topic: Topic,
  items: {
    topics: Topic[];
    character: { id: string; name: string };
    enrichPending?: boolean;
  }[]
): string[] {
  const names = new Set(
    recent.characterNames.map((n) => n.trim().toLowerCase()).filter(Boolean)
  );

  for (const item of items) {
    if (item.enrichPending || item.character.id === "loading") continue;
    const itemTopic = item.topics[0];
    if (!itemTopic || itemTopic !== topic) continue;
    const name = item.character.name.trim().toLowerCase();
    if (name) names.add(name);
  }

  return [...names];
}

/** Human names for teachers already shown — used to fetch new Wikipedia figures. */
export function recentFigureNamesForPick(recent: FeedRecent): string[] {
  return [...recent.characterNames];
}

export function topicCharacterAppearances(
  recent: FeedRecent,
  topic: Topic,
  characterId: string
): number {
  const key = `${topic}:${characterId}`;
  return recent.topicCharacterHistory.filter((entry) => entry === key).length;
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pickDiverse<T>(
  pool: T[],
  recentKeys: string[],
  keyOf: (item: T) => string
): T | null {
  if (!pool.length) return null;
  const fresh = pool.filter((item) => !recentKeys.includes(keyOf(item)));
  const candidates = fresh.length ? fresh : shuffle(pool);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function pickDiverseIndex(
  count: number,
  recentKeys: string[],
  prefix: string
): number {
  if (count <= 1) return 0;
  const indices = Array.from({ length: count }, (_, i) => i);
  const fresh = indices.filter(
    (i) => !recentKeys.includes(`${prefix}:${i}`)
  );
  const candidates = fresh.length ? fresh : indices;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
