import { queryCommonsImages } from "./commons-images";

const ROSTER_IN_URL =
  /einstein|newton|darwin|shakespeare|aristotle|tesla|turing|curie|euler|hypatia|cleopatra/i;

const BAD_PORTRAIT =
  /logo|icon|flag|seal|map[_ ]?of|coat of arms|diagram|chart|illustration only/i;

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s,.'-]+/)
    .filter((t) => t.length > 2);
}

function portraitMatchesName(name: string, url: string): boolean {
  const decoded = decodeURIComponent(url).toLowerCase();
  const tokens = nameTokens(name);
  if (!tokens.length) return false;

  const hits = tokens.filter(
    (t) =>
      decoded.includes(t) ||
      decoded.includes(t.replace(/ /g, "_")) ||
      decoded.includes(encodeURIComponent(t).toLowerCase())
  );

  if (tokens.length === 1) return hits.length === 1;
  return hits.length >= Math.min(2, tokens.length);
}

/** Commons portrait for a Wikipedia-discovered guest teacher. */
export async function fetchGuestPortraitUrl(
  figureName: string,
  scrollIndex = 0,
  excludeUrls: string[] = []
): Promise<string | null> {
  const exclude = new Set(excludeUrls);
  const last = figureName.split(" ").pop() ?? figureName;
  const queries = [
    `${figureName} portrait`,
    `${figureName} photograph`,
    `${last} portrait painting`,
    `${figureName}`,
  ];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[(scrollIndex + i) % queries.length];
    const urls = await queryCommonsImages(q, 960, 14);

    for (let j = 0; j < urls.length; j++) {
      const url = urls[(scrollIndex + j) % urls.length];
      if (exclude.has(url)) continue;
      if (ROSTER_IN_URL.test(url) && !portraitMatchesName(figureName, url)) {
        continue;
      }
      if (BAD_PORTRAIT.test(url)) continue;
      if (!portraitMatchesName(figureName, url)) continue;
      return url;
    }
  }

  return null;
}

export function isGuestPortraitUrl(
  name: string,
  url: string,
  wikiThumb?: string
): boolean {
  if (!url) return false;
  if (wikiThumb && url === wikiThumb) return true;
  if (ROSTER_IN_URL.test(url) && !portraitMatchesName(name, url)) return false;
  if (BAD_PORTRAIT.test(url)) return false;
  return portraitMatchesName(name, url);
}
