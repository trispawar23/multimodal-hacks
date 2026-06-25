import { conceptKey, normalizeConceptId } from "./feed-diversity";
import type { Topic } from "./types";

const SESSION_KEY = "luminary-session-concepts";
const MAX_SESSION = 128;

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRaw(keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(keys.slice(0, MAX_SESSION))
    );
  } catch {
    // ignore quota errors
  }
}

export function loadSessionConcepts(): string[] {
  return readRaw();
}

export function persistSessionConcept(
  topic: Topic,
  title: string,
  characterId?: string
): void {
  const keys = new Set(readRaw());
  keys.add(conceptKey(topic, title));
  if (characterId) {
    keys.add(`${topic}:${characterId}:${normalizeConceptId(title)}`);
  }
  writeRaw([...keys]);
}

export function mergeConceptExcludes(
  topic: Topic,
  recent: string[],
  pending: string[] = []
): string[] {
  const topicPrefix = `${topic}:`;
  const sessionForTopic = loadSessionConcepts().filter((k) => k.startsWith(topicPrefix));
  const merged = new Set<string>([
    ...sessionForTopic.slice(0, 24),
    ...recent.filter((k) => k.startsWith(topicPrefix)).slice(0, 24),
    ...pending.filter((k) => k.startsWith(topicPrefix)).slice(0, 8),
  ]);
  const topicNorm = new Set<string>();
  for (const entry of merged) {
    if (entry.startsWith(topicPrefix)) {
      topicNorm.add(entry.slice(topicPrefix.length));
    }
  }
  for (const norm of topicNorm) {
    merged.add(`${topicPrefix}${norm}`);
  }
  return [...merged];
}

export function sessionScrollOffset(topic?: Topic): number {
  if (!topic) return loadSessionConcepts().length;
  const prefix = `${topic}:`;
  return loadSessionConcepts().filter((k) => k.startsWith(prefix)).length;
}
