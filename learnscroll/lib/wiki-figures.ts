import { shuffle } from "./feed-diversity";
import type { Personality } from "./personalities";
import {
  fetchWikiSummary,
  searchWikipediaTitles,
  type WikiSummary,
} from "./wikipedia-content";
import type { GradeLevel, Topic } from "./types";
import { TOPIC_LABELS } from "./grade-topics";

const GUEST_REGISTRY = new Map<string, string>();

const K5_FAMOUS_FIGURES: Partial<Record<Topic, string[]>> = {
  history: [
    "Sacagawea",
    "Amelia Earhart",
    "George Washington",
    "Harriet Tubman",
    "Christopher Columbus",
    "Benjamin Franklin",
    "Pocahontas",
    "Florence Nightingale",
  ],
  biology: ["Jane Goodall", "Louis Pasteur", "Carl Linnaeus"],
  math: ["Ada Lovelace", "Pythagoras"],
};

const FAMOUS_FIGURES: Partial<Record<Topic, string[]>> = {
  physics: [
    "Galileo Galilei",
    "Niels Bohr",
    "Richard Feynman",
    "Max Planck",
    "Werner Heisenberg",
    "Michael Faraday",
    "James Clerk Maxwell",
  ],
  math: [
    "Pythagoras",
    "Euclid",
    "Carl Friedrich Gauss",
    "Ada Lovelace",
    "Sofia Kovalevskaya",
    "Blaise Pascal",
    "Georg Cantor",
  ],
  chemistry: [
    "Dmitri Mendeleev",
    "Linus Pauling",
    "Antoine Lavoisier",
    "Rosalind Franklin",
    "Louis Pasteur",
  ],
  biology: [
    "Gregor Mendel",
    "Louis Pasteur",
    "Jane Goodall",
    "Rachel Carson",
    "Carl Linnaeus",
  ],
  history: [
    "Julius Caesar",
    "Augustus",
    "Napoleon Bonaparte",
    "Charlemagne",
    "Genghis Khan",
    "Akhenaten",
    "Ramesses II",
    "Elizabeth I",
    "Suleiman the Magnificent",
    "Ashoka",
    "Hatshepsut",
    "Catherine the Great",
    "Joan of Arc",
    "Alexander the Great",
  ],
  literature: [
    "Homer",
    "Jane Austen",
    "Mark Twain",
    "Emily Dickinson",
    "Leo Tolstoy",
    "Virginia Woolf",
  ],
  philosophy: [
    "Plato",
    "Socrates",
    "Confucius",
    "Immanuel Kant",
    "René Descartes",
    "Friedrich Nietzsche",
  ],
  engineering: [
    "Leonardo da Vinci",
    "Isambard Kingdom Brunel",
    "George Stephenson",
    "Grace Hopper",
    "James Watt",
  ],
};

const TOPIC_FIGURE_QUERIES: Record<Topic, string[]> = {
  physics: [
    "physicist",
    "astronomer",
    "Nobel Prize in Physics",
    "theoretical physicist",
  ],
  math: ["mathematician", "mathematical biography", "statistician"],
  chemistry: ["chemist", "Nobel Prize in Chemistry", "biochemist"],
  biology: ["biologist", "naturalist", "zoologist", "botanist"],
  history: [
    "emperor",
    "pharaoh",
    "queen regnant",
    "revolutionary leader",
    "ancient ruler",
  ],
  literature: ["poet", "novelist", "playwright", "author biography"],
  philosophy: ["philosopher", "ancient Greek philosopher", "logician"],
  engineering: ["inventor", "engineer", "industrialist", "computer scientist"],
};

const BAD_FIGURE_TITLE =
  /^(List of|History of|Timeline of|Index of|Outline of|Wars of|Battle of|Siege of|Category:|Template:)|\(disambiguation\)/i;

const GENERIC_FIGURE_TITLE =
  /^(Monarch|Emperor|Empress|Pharaoh|King|Queen|President|Philosopher|Mathematician|Physicist|Chemist|Biologist|Author|Poet|History)$/i;

const ROSTER_NAME =
  /^(Isaac Newton|Albert Einstein|Marie Curie|Charles Darwin|Leonhard Euler|Hypatia|Alan Turing|Nikola Tesla|Aristotle|William Shakespeare|Cleopatra)/i;

const NOT_A_PERSON_TITLE =
  /\b(empire|war|revolution|age|period|dynasty|kingdom|history|art|civilization|culture|economy|treaty|conflict|reformation|renaissance|cold war|ancient|mesopotamia|byzantine|industrial)\b/i;

function slugifyFigure(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 56);
}

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 42% 82%)`;
}

function extractEra(extract: string): string {
  const born = extract.match(
    /\b(?:born|b\.)\s*(?:circa\s*)?(\d{1,4}(?:\s*(?:BC|BCE|AD|CE))?)/i
  );
  const died = extract.match(/\b(?:died|d\.)\s*(\d{1,4}(?:\s*(?:BC|BCE|AD|CE))?)/i);
  if (born && died) return `${born[1]}–${died[1]}`;
  if (born) return `from ${born[1]}`;
  const century = extract.match(/\b(\d{1,2})(?:st|nd|rd|th) century\b/i);
  if (century) return `${century[0]}`;
  return "Historical era";
}

function inferGender(extract: string): "male" | "female" | "neutral" {
  if (/\b(she|her|queen|empress|actress|philosopher queen)\b/i.test(extract)) {
    return "female";
  }
  if (/\b(he|his|king|emperor|prince|duke)\b/i.test(extract)) {
    return "male";
  }
  return "neutral";
}

function titleLooksLikePersonName(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  if (BAD_FIGURE_TITLE.test(t)) return false;
  if (GENERIC_FIGURE_TITLE.test(t)) return false;
  if (NOT_A_PERSON_TITLE.test(t)) return false;
  if (isRosterFigureName(t)) return false;

  const words = t.split(/\s+/);
  if (words.length === 1) {
    return /^[A-Z][A-Za-z'().-]{2,}$/.test(t);
  }
  if (words.length <= 4) {
    return words.every((w) => /^[A-Z0-9]/.test(w));
  }
  return false;
}

function looksLikeBiography(extract: string, title: string): boolean {
  if (extract.length < 80) return false;
  if (!titleLooksLikePersonName(title)) return false;
  return /\b(born|died|reigned|ruled|was (a|an)|served as)\b/i.test(extract);
}

export function isRosterFigureName(title: string): boolean {
  return ROSTER_NAME.test(title.trim());
}

export function wikiSummaryIsBiography(wiki: WikiSummary): boolean {
  return looksLikeBiography(wiki.extract, wiki.title) && !isRosterFigureName(wiki.title);
}

export function isGuestCharacterId(characterId: string): boolean {
  return characterId.startsWith("guest-");
}

export function registerGuestFigure(characterId: string, name: string): void {
  GUEST_REGISTRY.set(characterId, name);
}

export function getGuestFigureName(characterId: string): string | undefined {
  return GUEST_REGISTRY.get(characterId);
}

export function personalityFromWikiFigure(
  wiki: WikiSummary,
  topic: Topic
): Personality {
  const name = wiki.title.replace(/_/g, " ").trim();
  const id = `guest-${slugifyFigure(name)}`;
  registerGuestFigure(id, name);

  const gender = inferGender(wiki.extract);
  return {
    id,
    name,
    era: extractEra(wiki.extract),
    subjects: [topic],
    initial: name.charAt(0).toUpperCase() || "?",
    color: colorFromName(name),
    posterAsset: "einstein",
        voicePitch: gender === "female" ? 1.02 : gender === "male" ? 0.96 : 1.0,
        voiceRate: 0.92,
    voiceGender: gender,
  };
}

/** Discover a biographical Wikipedia page as a fresh on-demand teacher. */
export async function discoverWikiFigure(
  topic: Topic,
  scrollIndex: number,
  excludeTitles: string[] = [],
  gradeLevel?: GradeLevel
): Promise<WikiSummary | null> {
  const queries = [
    ...(gradeLevel === "K-5"
      ? [`${TOPIC_LABELS[topic].toLowerCase()} for children biography`]
      : []),
    ...(gradeLevel === "6-8"
      ? [`${TOPIC_LABELS[topic].toLowerCase()} biography`]
      : []),
    ...(TOPIC_FIGURE_QUERIES[topic] ?? [TOPIC_LABELS[topic]]),
  ];

  const exclude = new Set(
    excludeTitles.map((t) => t.trim().toLowerCase()).filter(Boolean)
  );

  const figurePool =
    gradeLevel === "K-5"
      ? (K5_FAMOUS_FIGURES[topic] ?? FAMOUS_FIGURES[topic] ?? [])
      : (FAMOUS_FIGURES[topic] ?? []);

  const famous = shuffle(figurePool);
  const famousStart = scrollIndex % Math.max(1, famous.length);
  const famousOrder = [
    ...famous.slice(famousStart),
    ...famous.slice(0, famousStart),
  ].slice(0, 5);

  const famousSummaries = await Promise.all(
    famousOrder.map((name) => {
      if (exclude.has(name.toLowerCase())) return Promise.resolve(null);
      return fetchWikiSummary(name);
    })
  );

  for (const summary of famousSummaries) {
    if (!summary || summary.extract.length < 60) continue;
    if (exclude.has(summary.title.toLowerCase())) continue;
    return summary;
  }

  const searchOrder = shuffle([
    ...queries.slice(scrollIndex % queries.length),
    ...queries.slice(0, scrollIndex % queries.length),
  ]).slice(0, 2);

  for (const query of searchOrder) {
    const titles = await searchWikipediaTitles(query, 10);
    const candidates = shuffle(
      titles.filter(
        (title) =>
          !BAD_FIGURE_TITLE.test(title) &&
          !exclude.has(title.toLowerCase())
      )
    ).slice(0, 4);

    const summaries = await Promise.all(
      candidates.map((title) => fetchWikiSummary(title))
    );

    for (const summary of summaries) {
      if (!summary) continue;
      if (!looksLikeBiography(summary.extract, summary.title)) continue;
      if (exclude.has(summary.title.toLowerCase())) continue;
      return summary;
    }
  }

  return null;
}
