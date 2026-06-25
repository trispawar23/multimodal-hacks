import { isGuestCharacterId, getGuestFigureName } from "./wiki-figures";
import { isGuestPortraitUrl } from "./guest-portraits";

/** Block another teacher's Wikimedia filename from appearing on the wrong reel. */
const OTHER_FIGURE_PATTERNS: Record<string, RegExp> = {
  newton: /newton|kneller.*isaac|isaac_newton/i,
  einstein: /einstein/i,
  "einstein-cartoon": /einstein/i,
  darwin: /darwin/i,
  euler: /euler/i,
  hypatia: /hypatia/i,
  turing: /turing/i,
  tesla: /tesla/i,
  aristotle: /aristotle/i,
  shakespeare: /shakespeare/i,
  cleopatra: /cleopatra|kleopatra/i,
  curie: /curie|marie_curie/i,
};

const LOCAL_BUNDLED = /\/media\//i;

const PORTRAIT_ALIASES: Record<string, string> = {
  "einstein-cartoon": "einstein",
};

const SUNNY_BAD_IMAGE =
  /Classroom_problems|gifted_children|catalogue_of|%2C_Catalogue|college.*catalogue|%28(18|19)\d{2}\)|_18\d{2}|_19\d{2}|black_and_white|grayscale|sepia|blueprint/i;

const SUNNY_GOOD_IMAGE =
  /cartoon|clipart|illustration|drawing|vector|colorful|children|kids|school.*art/i;

const HISTORICAL_FIGURE =
  /einstein|newton|darwin|shakespeare|aristotle|tesla|turing|curie|euler|hypatia|cleopatra/i;

function urlNamesOtherFigure(characterId: string, url: string): boolean {
  const alias = PORTRAIT_ALIASES[characterId];
  for (const [otherId, pattern] of Object.entries(OTHER_FIGURE_PATTERNS)) {
    if (otherId === characterId || otherId === alias) continue;
    if (otherId !== characterId && pattern.test(url)) return true;
  }
  return false;
}

/** True when URL is a verified portrait of this teacher (not a random topic image). */
export function isCharacterPortraitUrl(
  characterId: string,
  url: string,
  figureName?: string
): boolean {
  if (!url || characterId === "loading") return false;

  if (LOCAL_BUNDLED.test(url)) return false;

  if (isGuestCharacterId(characterId)) {
    const name = figureName ?? getGuestFigureName(characterId);
    if (!name) return false;
    return isGuestPortraitUrl(name, url);
  }

  if (urlNamesOtherFigure(characterId, url)) return false;

  if (characterId === "sunny") {
    if (SUNNY_BAD_IMAGE.test(url)) return false;
    if (HISTORICAL_FIGURE.test(url)) return false;
    if (!/upload\.wikimedia\.org/i.test(url)) return false;
    return SUNNY_GOOD_IMAGE.test(url);
  }

  const own = OTHER_FIGURE_PATTERNS[characterId];
  return Boolean(own?.test(url));
}

/** Display + cache guard — teachers must match their verified portrait URL only. */
export function isPortraitUrlForCharacter(
  characterId: string,
  url: string,
  figureName?: string
): boolean {
  return isCharacterPortraitUrl(characterId, url, figureName);
}
