import type { ContentItem } from "./types";

export async function fetchPortraitForItem(
  item: ContentItem
): Promise<{ posterUrl: string; fallback: boolean }> {
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

  return { posterUrl: data.posterUrl, fallback: data.fallback ?? false };
}
