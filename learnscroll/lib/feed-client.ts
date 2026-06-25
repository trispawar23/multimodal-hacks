import {
  isGuestCharacterId,
  registerGuestFigure,
} from "./wiki-figures";
import { getPersonality, type Personality } from "./personalities";
import type { WebReelResult } from "./web-feed";
import type { GradeLevel, Topic } from "./types";

export async function fetchWebReel(input: {
  topic: Topic;
  gradeLevel: GradeLevel;
  scrollIndex: number;
  recentCharacterIds: string[];
  recentFigureNames: string[];
  recentConcepts: string[];
  recentPortraitUrls: string[];
  topicCharacterHistory?: string[];
  preferredCharacterId?: string;
}): Promise<WebReelResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("/api/feed/reel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const data = (await res.json()) as WebReelResult & { error?: string };

    if (!res.ok || data.error) {
      throw new Error(data.error ?? "Web reel request failed");
    }

    const character = resolveReelCharacter(data);

    return {
      ...data,
      character,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Keep guest teachers from the API — never map unknown ids to Newton. */
function resolveReelCharacter(data: WebReelResult): Personality {
  if (data.character?.id === data.characterId) {
    if (isGuestCharacterId(data.character.id)) {
      registerGuestFigure(data.character.id, data.character.name);
    }
    return data.character;
  }

  if (isGuestCharacterId(data.characterId)) {
    if (data.character?.name) {
      registerGuestFigure(data.characterId, data.character.name);
      return { ...getPersonality(data.characterId), ...data.character, id: data.characterId };
    }
    return getPersonality(data.characterId);
  }

  return getPersonality(data.characterId);
}
