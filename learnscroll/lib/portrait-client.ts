import type { ContentItem } from "./types";

const portraitCache = new Map<string, string>();

function cacheKey(item: ContentItem): string {
  return `${item.character.id}:${item.gradeLevel}`;
}

export function getCachedPortrait(item: ContentItem): string | undefined {
  return portraitCache.get(cacheKey(item));
}

export function setCachedPortrait(item: ContentItem, posterUrl: string): void {
  portraitCache.set(cacheKey(item), posterUrl);
}

export async function fetchPortraitForItem(
  item: ContentItem
): Promise<{ posterUrl: string; fallback: boolean }> {
  const cached = getCachedPortrait(item);
  if (cached) {
    return { posterUrl: cached, fallback: false };
  }

  const topic = item.topics[0];
  if (!topic) throw new Error("No topic on item");

  const res = await fetch("/api/slop/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterId: item.character.id,
      topic,
      title: item.title,
      gradeLevel: item.gradeLevel,
    }),
  });

  const data = (await res.json()) as {
    posterUrl?: string;
    fallback?: boolean;
    error?: string;
  };

  if (!res.ok || !data.posterUrl) {
    throw new Error(data.error ?? "Portrait request failed");
  }

  if (!data.fallback) {
    setCachedPortrait(item, data.posterUrl);
  }

  return { posterUrl: data.posterUrl, fallback: data.fallback ?? false };
}
