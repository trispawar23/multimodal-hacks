import type { ContentItem, GradeLevel } from "./types";
import { isPortraitUrlForCharacter } from "./portrait-validation";

export { clearWebPortraitCache } from "./web-portraits";

const portraitCache = new Map<string, string>();

export function clearPortraitCache(): void {
  portraitCache.clear();
}

function cacheKey(item: ContentItem): string {
  const topic = item.topics[0] ?? "all";
  return `${item.character.id}:${item.character.name}:${topic}:${item.gradeLevel}:${item.portraitVariant ?? 0}`;
}

function portraitName(item: ContentItem): string | undefined {
  return item.character.name;
}

export function portraitCacheKeyFor(
  characterId: string,
  topic: string,
  gradeLevel: GradeLevel,
  portraitVariant: number
): string {
  return `${characterId}:${topic}:${gradeLevel}:${portraitVariant}`;
}

export function getCachedPortrait(item: ContentItem): string | undefined {
  const cached = portraitCache.get(cacheKey(item));
  if (!cached) return undefined;
  if (!isPortraitUrlForCharacter(item.character.id, cached, portraitName(item))) {
    portraitCache.delete(cacheKey(item));
    return undefined;
  }
  return cached;
}

export function setCachedPortrait(item: ContentItem, posterUrl: string): void {
  if (!isPortraitUrlForCharacter(item.character.id, posterUrl, portraitName(item))) return;
  portraitCache.set(cacheKey(item), posterUrl);
}

export function forgetCachedPortrait(item: ContentItem): void {
  portraitCache.delete(cacheKey(item));
}

export async function fetchPortraitForItem(
  item: ContentItem
): Promise<{ posterUrl: string; fallback: boolean }> {
  const cached = getCachedPortrait(item);
  if (cached) {
    return { posterUrl: cached, fallback: false };
  }

  if (item.posterUrl && !item.imagePending && !item.wantAiPortrait) {
    return { posterUrl: item.posterUrl, fallback: true };
  }

  const topic = item.topics[0];
  if (!topic) throw new Error("No topic on item");

  const res = await fetch("/api/slop/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterId: item.character.id,
      characterName: item.character.name,
      topic,
      title: item.title,
      gradeLevel: item.gradeLevel,
      portraitVariant: item.portraitVariant ?? 0,
    }),
  });

  const data = (await res.json()) as {
    posterUrl?: string;
    characterId?: string;
    fallback?: boolean;
    error?: string;
  };

  if (!res.ok || !data.posterUrl) {
    throw new Error(data.error ?? "Portrait lookup failed");
  }

  if (data.characterId && data.characterId !== item.character.id) {
    throw new Error("Portrait character mismatch");
  }

  if (!isPortraitUrlForCharacter(item.character.id, data.posterUrl, portraitName(item))) {
    throw new Error("Portrait URL does not match character");
  }

  setCachedPortrait(item, data.posterUrl);
  return { posterUrl: data.posterUrl, fallback: data.fallback ?? false };
}
