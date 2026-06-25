import type { ContentItem } from "./types";

export async function enrichItemFromWeb(
  item: ContentItem
): Promise<{
  title: string;
  transcript: string;
  sourceUrl: string;
  posterUrl?: string;
  enriched: boolean;
}> {
  const topic = item.topics[0];
  if (!topic || !item.templateSeed) {
    return {
      title: item.title,
      transcript: item.transcript,
      sourceUrl: item.sourceUrl,
      enriched: false,
    };
  }

  const res = await fetch("/api/feed/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      gradeLevel: item.gradeLevel,
      characterId: item.character.id,
      templateTitle: item.templateSeed.title,
      templateTranscript: item.templateSeed.transcript,
      scrollIndex: item.scrollIndex ?? 0,
      portraitVariant: item.portraitVariant ?? 0,
    }),
  });

  const data = (await res.json()) as {
    title?: string;
    transcript?: string;
    sourceUrl?: string;
    posterUrl?: string;
    enriched?: boolean;
    error?: string;
  };

  if (!res.ok || !data.transcript) {
    throw new Error(data.error ?? "Enrichment failed");
  }

  return {
    title: data.title ?? item.title,
    transcript: data.transcript,
    sourceUrl: data.sourceUrl ?? item.sourceUrl,
    posterUrl: data.posterUrl,
    enriched: data.enriched ?? false,
  };
}
