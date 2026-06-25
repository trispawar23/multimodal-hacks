import { searchCharacterImage, searchSunnyPortrait } from "./commons-images";
import { isCharacterPortraitUrl, isPortraitUrlForCharacter } from "./portrait-validation";
import { buildWikimediaThumbUrl } from "./wikimedia-thumb";
import type { GradeLevel, Topic } from "./types";

/**
 * Curated public-domain teacher portraits only.
 * Filenames are resolved to thumb URLs via MD5 hash paths (never hand-guessed paths).
 */
const VERIFIED_PORTRAIT_FILES: Record<string, string[]> = {
  sunny: [
    "Cartoon_illustration.jpg",
    "Mother_Earth's_Children_p.15.jpg",
  ],
  newton: [
    "GodfreyKneller-IsaacNewton-1689.jpg",
    "Sir_Isaac_Newton_by_Sir_Godfrey_Kneller,_Bt.jpg",
  ],
  einstein: [
    "Albert_Einstein_Head.jpg",
    "Einstein_1921_by_F_Schmutzer_-_restoration.jpg",
    "Albert_Einstein_1947.jpg",
  ],
  curie: [
    "Marie_Curie_c._1920s.jpg",
    "Mariecurie.jpg",
  ],
  darwin: [
    "Charles_Darwin_by_Julia_Margaret_Cameron.jpg",
    "Charles_Darwin_01.jpg",
  ],
  euler: [
    "Leonhard_Euler_2.jpg",
    "Leonhard_Euler.jpg",
  ],
  hypatia: [
    "Hypatia_portrait.png",
    "Hypatia_(Charles_Mitchell).jpg",
  ],
  turing: [
    "Alan_Turing_Aged_16.jpg",
    "Alan_Turing_(1951).jpg",
  ],
  tesla: [
    "Tesla_circa_1890.jpeg",
    "Nikola_Tesla,_with_his_equipment_EDIT.jpg",
  ],
  aristotle: ["Aristotle_Altemps_Inv8575.jpg"],
  shakespeare: [
    "Shakespeare.jpg",
    "William_Shakespeare_by_John_Taylor.jpg",
  ],
  cleopatra: [
    "Marble_portrait_head_of_Cleopatra_VII,_known_as_the_'Berlin_Cleopatra'.jpg",
    "Makart,_Hans_-_Der_Tod_der_Kleopatra_-_1875-76.jpg",
  ],
};

type PortraitSource = "wikimedia";

/** Roster IDs that share another teacher's verified Wikimedia portrait pool. */
const PORTRAIT_CHARACTER_ALIAS: Record<string, string> = {
  "einstein-cartoon": "einstein",
};

function resolvePortraitCharacterId(characterId: string): string {
  return PORTRAIT_CHARACTER_ALIAS[characterId] ?? characterId;
}

interface CachedPortrait {
  posterUrl: string;
  source: PortraitSource;
}

const urlCache = new Map<string, CachedPortrait>();

function cacheKey(
  characterId: string,
  gradeLevel: GradeLevel,
  variant: number
): string {
  return `${characterId}:${gradeLevel}:${variant}`;
}

export function clearWebPortraitCache(): void {
  urlCache.clear();
}

function verifiedFilenames(characterId: string): string[] {
  return VERIFIED_PORTRAIT_FILES[resolvePortraitCharacterId(characterId)] ?? [];
}

function portraitUrlsForCharacter(characterId: string): string[] {
  return verifiedFilenames(characterId).map((file) =>
    buildWikimediaThumbUrl(file)
  );
}

function storePortrait(
  key: string,
  characterId: string,
  posterUrl: string
): string | null {
  if (!isPortraitUrlForCharacter(characterId, posterUrl)) {
    return null;
  }
  urlCache.set(key, { posterUrl, source: "wikimedia" });
  return posterUrl;
}

function pickFromPool(
  characterId: string,
  pool: string[],
  variant: number,
  excludeUrls: string[]
): string | null {
  if (!pool.length) return null;

  const ordered = [...pool.slice(variant), ...pool.slice(0, variant)];
  const exclude = new Set(excludeUrls);

  for (const url of ordered) {
    if (exclude.has(url)) continue;
    if (isPortraitUrlForCharacter(characterId, url)) return url;
  }

  // Prefer variety, but never leave a reel without a portrait when we have verified files.
  for (const url of ordered) {
    if (isPortraitUrlForCharacter(characterId, url)) return url;
  }

  return null;
}

export function portraitVariantCount(characterId: string): number {
  if (characterId === "sunny") return 8;
  return Math.max(1, verifiedFilenames(characterId).length);
}

export interface PortraitLookupOptions {
  excludeUrls?: string[];
  topic?: Topic;
}

export interface PortraitLookupResult {
  posterUrl: string | null;
  source: PortraitSource | "none";
  variant: number;
}

/** Return a curated teacher portrait — Wikimedia / Commons only. */
export async function fetchWebPortraitUrl(
  characterId: string,
  gradeLevel: GradeLevel = "9-12",
  portraitVariant = 0,
  options: PortraitLookupOptions = {}
): Promise<PortraitLookupResult> {
  const excludeUrls = options.excludeUrls ?? [];
  const pool = portraitUrlsForCharacter(characterId);
  const variant =
    pool.length > 0
      ? ((portraitVariant % pool.length) + pool.length) % pool.length
      : portraitVariant;
  const key = cacheKey(characterId, gradeLevel, variant);

  const cached = urlCache.get(key);
  if (
    cached &&
    isCharacterPortraitUrl(characterId, cached.posterUrl) &&
    !excludeUrls.includes(cached.posterUrl)
  ) {
    return { posterUrl: cached.posterUrl, source: cached.source, variant };
  }
  if (cached) {
    urlCache.delete(key);
  }

  const portraitId = resolvePortraitCharacterId(characterId);

  if (characterId === "sunny") {
    const pool = portraitUrlsForCharacter(characterId);
    const picked = pickFromPool(characterId, pool, variant, excludeUrls);
    if (picked) {
      const stored = storePortrait(key, characterId, picked);
      if (stored) {
        return { posterUrl: stored, source: "wikimedia", variant };
      }
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const commons = await searchSunnyPortrait(
        portraitVariant + attempt,
        excludeUrls
      );
      if (commons) {
        const stored = storePortrait(key, characterId, commons);
        if (stored) {
          return { posterUrl: stored, source: "wikimedia", variant };
        }
      }
    }
    return { posterUrl: null, source: "none", variant };
  }

  const picked = pickFromPool(characterId, pool, variant, excludeUrls);
  if (picked) {
    const stored = storePortrait(key, characterId, picked);
    if (stored) {
      return { posterUrl: stored, source: "wikimedia", variant };
    }
  }

  if (characterId === "einstein-cartoon") {
    const commons = await searchCharacterImage("einstein", portraitVariant, excludeUrls);
    if (commons) {
      const stored = storePortrait(key, characterId, commons);
      if (stored) {
        return { posterUrl: stored, source: "wikimedia", variant };
      }
    }
  }

  return { posterUrl: null, source: "none", variant };
}
