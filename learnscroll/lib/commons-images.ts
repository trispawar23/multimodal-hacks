import type { Topic } from "./types";
import { TOPIC_LABELS } from "./grade-topics";
import { getPersonality } from "./personalities";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";
const WIKI_HEADERS = {
  "User-Agent": "LearnScroll/1.0 (educational; hackathon)",
};

const imageListCache = new Map<string, string[]>();

const TOPIC_IMAGE_QUERIES: Record<Topic, string[]> = {
  physics: ["physics diagram", "gravity illustration", "electromagnetism"],
  math: ["geometry diagram", "mathematics illustration", "pi symbol"],
  chemistry: ["periodic table", "chemistry laboratory", "molecule model"],
  biology: ["biology illustration", "cell diagram", "DNA structure"],
  history: ["ancient history map", "historical artifact", "archaeology"],
  literature: ["literature books", "shakespeare portrait", "poetry manuscript"],
  philosophy: ["philosophy sculpture", "logic diagram", "ancient greek philosophy"],
  engineering: ["engineering blueprint", "bridge structure", "electric motor"],
};

const BAD_IMAGE_TITLE = /logo|icon|flag|seal|svg|map[_ ]?of|coat of arms/i;

/** Fetch multiple Commons bitmap hits for one search (variant index picks a different file). */
export async function queryCommonsImages(
  search: string,
  width = 900,
  limit = 12
): Promise<string[]> {
  const cacheKey = `${search}:${width}:${limit}`;
  const cached = imageListCache.get(cacheKey);
  if (cached?.length) return cached;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `filetype:bitmap ${search}`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(width),
  });

  try {
    const res = await fetch(`${WIKI_API}?${params}`, {
      headers: WIKI_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { title?: string; imageinfo?: { thumburl?: string; url?: string }[] }
        >;
      };
    };

    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    const urls: string[] = [];
    for (const page of pages) {
      const url = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
      if (url && !BAD_IMAGE_TITLE.test(page.title ?? "")) {
        urls.push(url);
      }
    }
    if (urls.length) {
      imageListCache.set(cacheKey, urls);
    }
    return urls;
  } catch {
    return [];
  }
}

async function queryCommons(
  search: string,
  width = 900,
  pickIndex = 0
): Promise<string | null> {
  const urls = await queryCommonsImages(search, width, 12);
  return urls[pickIndex % Math.max(1, urls.length)] ?? null;
}

export async function searchTopicImage(
  topic: Topic,
  scrollIndex: number,
  excludeUrls: string[] = []
): Promise<string | null> {
  const queries = TOPIC_IMAGE_QUERIES[topic] ?? [TOPIC_LABELS[topic]];
  const exclude = new Set(excludeUrls);

  for (let i = 0; i < queries.length; i++) {
    const q = queries[(scrollIndex + i) % queries.length];
    const urls = await queryCommonsImages(`${q} educational`);
    const hit = urls.find((url) => !exclude.has(url));
    if (hit) return hit;
  }

  const fallback = await queryCommonsImages(`${TOPIC_LABELS[topic]} science`);
  return fallback.find((url) => !exclude.has(url)) ?? null;
}

export async function searchCharacterImage(
  characterId: string,
  scrollIndex: number,
  excludeUrls: string[] = []
): Promise<string | null> {
  const personality = getPersonality(characterId);
  const queries = [
    `${personality.name} portrait`,
    `${personality.name} painting`,
    `${personality.name}`,
  ];
  const exclude = new Set(excludeUrls);

  for (let i = 0; i < queries.length; i++) {
    const urls = await queryCommonsImages(queries[(scrollIndex + i) % queries.length]);
    const hit = urls.find((url) => !exclude.has(url));
    if (hit) return hit;
  }
  return null;
}

const HISTORICAL_FIGURE =
  /einstein|newton|darwin|shakespeare|aristotle|tesla|turing|curie|euler|hypatia|cleopatra/i;

/** Reject vintage B&W classroom stock photos that repeat and don't match Sunny. */
const SUNNY_BAD_IMAGE =
  /Classroom_problems|gifted_children|catalogue_of|%2C_Catalogue|college.*catalogue|%28(18|19)\d{2}\)|_18\d{2}|_19\d{2}|black_and_white|grayscale|sepia|photograph_of/i;

const SUNNY_GOOD_IMAGE =
  /cartoon|clipart|illustration|drawing|vector|colorful|children|kids|school.*art/i;

/** Colorful kid-friendly art for Sunny (K–5 only). */
export async function searchSunnyPortrait(
  scrollIndex: number,
  excludeUrls: string[] = []
): Promise<string | null> {
  const queries = [
    "cartoon children colorful illustration education",
    "kids clipart school learning colorful",
    "elementary students drawing illustration",
    "children reading books cartoon illustration",
    "happy kids learning illustration colorful",
    "school children cartoon vector art",
  ];
  const exclude = new Set(excludeUrls);

  for (let i = 0; i < queries.length; i++) {
    const urls = await queryCommonsImages(
      queries[(scrollIndex + i) % queries.length],
      900,
      16
    );
    for (let j = 0; j < urls.length; j++) {
      const url = urls[(scrollIndex + j) % urls.length];
      if (exclude.has(url)) continue;
      if (HISTORICAL_FIGURE.test(url)) continue;
      if (SUNNY_BAD_IMAGE.test(url)) continue;
      if (!SUNNY_GOOD_IMAGE.test(url) && /\.(jpg|jpeg)/i.test(url)) continue;
      return url;
    }
  }
  return null;
}
