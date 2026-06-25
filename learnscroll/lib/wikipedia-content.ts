import type { Topic } from "./types";
import { TOPIC_LABELS } from "./grade-topics";
import { conceptIsExcluded, normalizeConceptId, shuffle } from "./feed-diversity";
import type { GradeLevel } from "./types";
import type { Personality } from "./personalities";
import { isGuestCharacterId } from "./wiki-figures";

const WIKI_REST = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_HEADERS = {
  "User-Agent": "LearnScroll/1.0 (educational; hackathon)",
};
const WIKI_TIMEOUT_MS = 3500;
const WIKI_FETCH_INIT: RequestInit = {
  headers: WIKI_HEADERS,
  next: { revalidate: 3600 },
};

async function wikiFetch(url: string, timeoutMs = WIKI_TIMEOUT_MS): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...WIKI_FETCH_INIT,
      signal: controller.signal,
    });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  thumbnailUrl?: string;
}

const summaryCache = new Map<string, WikiSummary>();

const GRADE_SEARCH_QUERIES: Partial<Record<GradeLevel, Partial<Record<Topic, string[]>>>> = {
  "K-5": {
    math: ["counting numbers kids", "addition elementary", "subtraction kids", "shapes geometry kids", "patterns numbers simple"],
    biology: ["animals for children", "plants kids", "habitat animals", "food chain simple", "butterfly life cycle"],
    history: ["ancient egypt kids", "explorers for children", "inventions for kids", "famous people kids history"],
    physics: ["gravity simple kids", "light shadow", "magnets kids", "sound for children"],
    chemistry: ["states of matter kids", "water cycle", "ice and water"],
    literature: ["fairy tale children", "fable aesop", "children poem"],
    philosophy: ["sharing kindness kids", "being fair children"],
    engineering: ["simple machines kids", "wheel invention", "bridge for kids"],
  },
  "6-8": {
    math: ["fractions middle school", "ratio proportion", "geometry angles", "probability basics"],
    biology: ["cell biology middle school", "ecosystem", "human body systems", "photosynthesis"],
    history: ["middle ages", "american revolution", "ancient rome", "civil war overview"],
    physics: ["force and motion", "energy types", "electricity basics", "waves sound light"],
    chemistry: ["periodic table basics", "chemical reaction", "atoms molecules"],
    literature: ["shakespeare summary", "poetry forms", "novel genre"],
    philosophy: ["logic basics", "ethics middle school", "greek philosophy simple"],
    engineering: ["simple robotics", "civil engineering basics", "electric motor"],
  },
  "9-12": {
    math: ["algebra", "trigonometry", "calculus introduction", "statistics probability"],
    biology: ["genetics", "evolution natural selection", "ecology", "human anatomy"],
    history: ["world war 2", "cold war", "renaissance", "civil rights movement", "french revolution"],
    physics: ["newton laws motion", "electromagnetism", "thermodynamics", "optics physics"],
    chemistry: ["organic chemistry intro", "chemical bonding", "acid base", "stoichiometry"],
    literature: ["shakespeare", "american literature", "poetry analysis", "literary theme"],
    philosophy: ["ethics", "epistemology", "political philosophy", "existentialism"],
    engineering: ["mechanical engineering", "electrical circuits", "computer engineering", "renewable energy"],
  },
  college: {
    math: ["linear algebra", "differential equations", "real analysis", "abstract algebra"],
    biology: ["molecular biology", "neuroscience", "microbiology", "biochemistry"],
    history: ["historiography", "colonialism", "intellectual history", "modern europe"],
    physics: ["quantum mechanics", "general relativity", "statistical mechanics", "particle physics"],
    chemistry: ["physical chemistry", "inorganic chemistry", "spectroscopy", "thermodynamics chemistry"],
    literature: ["literary theory", "modernism literature", "comparative literature"],
    philosophy: ["metaphysics", "philosophy of mind", "phenomenology", "formal logic"],
    engineering: ["control systems", "materials science", "signal processing", "aerospace engineering"],
  },
  graduate: {
    math: ["topology", "number theory research", "category theory"],
    biology: ["genomics", "systems biology", "immunology research"],
    history: ["historical methodology", "archival research history"],
    physics: ["quantum field theory", "condensed matter physics"],
    chemistry: ["quantum chemistry", "chemical kinetics research"],
    literature: ["critical theory", "postcolonial literature"],
    philosophy: ["philosophy of language", "philosophy of science"],
    engineering: ["nanotechnology", "machine learning engineering"],
  },
};

const TOPIC_SEARCH_QUERIES: Record<Topic, string[]> = {
  physics: [
    "physics",
    "classical mechanics",
    "electromagnetism",
    "thermodynamics",
    "quantum physics",
    "relativity",
    "wave motion",
    "energy physics",
  ],
  math: [
    "mathematics",
    "geometry",
    "algebra",
    "number theory",
    "calculus",
    "probability",
    "mathematical proof",
    "symmetry mathematics",
  ],
  chemistry: [
    "chemistry",
    "chemical element",
    "molecule",
    "periodic table",
    "chemical reaction",
    "organic chemistry",
    "acid base",
  ],
  biology: [
    "biology",
    "ecosystem",
    "cell biology",
    "genetics",
    "evolution",
    "photosynthesis",
    "microorganism",
    "human anatomy",
  ],
  history: [
    "history",
    "ancient civilization",
    "world war",
    "renaissance",
    "archaeology",
    "historical figure",
    "empire history",
    "medieval history",
    "cold war",
    "industrial revolution",
    "ancient greece",
    "ancient rome",
    "byzantine empire",
    "colonial history",
  ],
  literature: [
    "literature",
    "poetry",
    "novel",
    "drama",
    "literary device",
    "epic poetry",
    "playwright",
  ],
  philosophy: [
    "philosophy",
    "ethics",
    "logic",
    "epistemology",
    "metaphysics",
    "ancient philosophy",
    "critical thinking",
  ],
  engineering: [
    "engineering",
    "mechanical engineering",
    "electrical engineering",
    "bridge structure",
    "robotics",
    "renewable energy technology",
    "computer engineering",
  ],
};

const K5_FALLBACK_ARTICLES: Partial<Record<Topic, string[]>> = {
  math: ["Addition", "Subtraction", "Multiplication", "Shape", "Pattern"],
  biology: ["Animal", "Plant", "Butterfly", "Rainforest", "Food_chain"],
  history: ["Ancient_Egypt", "Christopher_Columbus", "Silk_Road", "Printing_press"],
  physics: ["Gravity", "Magnet", "Light", "Sound"],
  chemistry: ["Water", "Ice", "Salt", "Sugar"],
  literature: ["Fable", "Fairy_tale", "Poetry", "Aesop%27s_Fables"],
  philosophy: ["Golden_Rule", "Friendship"],
  engineering: ["Wheel", "Lever", "Pulley", "Bridge"],
};

const MIDDLE_SCHOOL_FALLBACK: Partial<Record<Topic, string[]>> = {
  math: ["Fraction", "Ratio", "Pythagorean_theorem", "Probability", "Angle"],
  biology: ["Cell_(biology)", "Ecosystem", "Photosynthesis", "Human_skeleton", "DNA"],
  history: ["Middle_Ages", "American_Revolution", "Ancient_Rome", "Silk_Road", "Industrial_Revolution"],
  physics: ["Force", "Energy", "Electricity", "Wave", "Magnetism"],
  chemistry: ["Atom", "Periodic_table", "Chemical_reaction", "Molecule", "Acid"],
  literature: ["Poetry", "Novel", "Drama", "Sonnet", "Fable"],
  philosophy: ["Ethics", "Logic", "Socrates", "Stoicism"],
  engineering: ["Simple_machine", "Electric_motor", "Bridge", "Robotics", "Wheel"],
};

const HIGH_SCHOOL_FALLBACK: Partial<Record<Topic, string[]>> = {
  math: ["Algebra", "Trigonometry", "Calculus", "Statistics", "Geometry"],
  biology: ["Genetics", "Evolution", "Ecology", "Cell_(biology)", "Photosynthesis"],
  history: ["World_War_II", "Cold_War", "Renaissance", "French_Revolution", "American_Civil_War"],
  physics: ["Newton%27s_laws_of_motion", "Electromagnetism", "Thermodynamics", "Optics", "Energy"],
  chemistry: ["Chemical_bond", "Organic_chemistry", "Acid–base_reaction", "Stoichiometry", "Periodic_table"],
  literature: ["Shakespeare", "Poetry", "Novel", "Tragedy", "Metaphor"],
  philosophy: ["Ethics", "Epistemology", "Plato", "Logic", "Existentialism"],
  engineering: ["Mechanical_engineering", "Electrical_circuit", "Renewable_energy", "Robotics", "Computer"],
};

/** Fallback article lists when search fails. */
const TOPIC_ARTICLES: Record<Topic, string[]> = {
  physics: ["Physics", "Gravity", "Energy", "Wave", "Thermodynamics"],
  math: ["Mathematics", "Pi", "Prime_number", "Geometry", "Fibonacci_sequence"],
  chemistry: ["Chemistry", "Atom", "Molecule", "Periodic_table", "Chemical_reaction"],
  biology: ["Biology", "DNA", "Evolution", "Ecosystem", "Photosynthesis"],
  history: ["History", "Ancient_Egypt", "Roman_Empire", "Renaissance", "Silk_Road", "Byzantine_Empire", "Industrial_Revolution", "Cold_War", "French_Revolution", "Mongol_Empire", "Ancient_Greece", "Mesopotamia"],
  literature: ["Literature", "Poetry", "Novel", "Drama", "Epic_poetry"],
  philosophy: ["Philosophy", "Ethics", "Logic", "Stoicism", "Scientific_method"],
  engineering: ["Engineering", "Bridge", "Electric_motor", "Robotics", "Renewable_energy"],
};

const K5_WORD_REPLACEMENTS: [RegExp, string][] = [
  [/\bapproximately\b/gi, "about"],
  [/\bdemonstrate[sd]?\b/gi, "show"],
  [/\bsignificant(?:ly)?\b/gi, "big"],
  [/\butilize[sd]?\b/gi, "use"],
  [/\bconsequently\b/gi, "so"],
  [/\bnevertheless\b/gi, "but"],
  [/\borganism[s]?\b/gi, "living thing"],
  [/\bhabitat[s]?\b/gi, "home"],
  [/\becosystem[s]?\b/gi, "nature area"],
  [/\brevolution\b/gi, "big change"],
  [/\bcivilization[s]?\b/gi, "old society"],
  [/\btheorem\b/gi, "math rule"],
  [/\bhypothesis\b/gi, "idea"],
  [/\bnuclei\b/gi, "centers"],
  [/\bisotope[s]?\b/gi, "atom type"],
];

const MIDDLE_SCHOOL_WORD_REPLACEMENTS: [RegExp, string][] = [
  [/\bapproximately\b/gi, "about"],
  [/\butilize[sd]?\b/gi, "use"],
  [/\bnevertheless\b/gi, "however"],
  [/\bconsequently\b/gi, "as a result"],
  [/\bphenomenon\b/gi, "event"],
  [/\bhypothesis\b/gi, "educated guess"],
];

const K5_BLOCKED_TITLE =
  /\b(war|revolution|genocide|holocaust|nuclear|quantum|calculus|theorem|molecule|electron|communism|fascism|colonialism|epistemology|metaphysics|stoichiometry|thermodynamics)\b/i;

const MIDDLE_SCHOOL_BLOCKED_TITLE =
  /\b(quantum field|differential equation|topology|phenomenology|historiography|postcolonial|nanotechnology|genomics)\b/i;

const HIGH_SCHOOL_BLOCKED_TITLE =
  /\b(doctoral dissertation|phd thesis|graduate seminar)\b/i;

function averageWordLength(text: string): number {
  const words = text.match(/[a-zA-Z]{2,}/g) ?? [];
  if (!words.length) return 0;
  return words.reduce((sum, w) => sum + w.length, 0) / words.length;
}

function simplifyVocabulary(text: string, gradeLevel: GradeLevel): string {
  const replacements =
    gradeLevel === "K-5"
      ? K5_WORD_REPLACEMENTS
      : gradeLevel === "6-8"
        ? MIDDLE_SCHOOL_WORD_REPLACEMENTS
        : [];
  let out = text;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function isConceptAppropriateForGrade(
  summary: WikiSummary,
  gradeLevel: GradeLevel
): boolean {
  const title = summary.title;
  const extract = summary.extract;
  const combined = `${title} ${extract}`;

  if (gradeLevel === "K-5") {
    if (K5_BLOCKED_TITLE.test(combined)) return false;
    if (averageWordLength(extract) > 6.2) return false;
    if (extract.length > 520) return false;
    return true;
  }

  if (gradeLevel === "6-8") {
    if (MIDDLE_SCHOOL_BLOCKED_TITLE.test(combined)) return false;
    if (averageWordLength(extract) > 7.4) return false;
    return true;
  }

  if (gradeLevel === "9-12") {
    if (HIGH_SCHOOL_BLOCKED_TITLE.test(combined)) return false;
    return true;
  }

  return true;
}

function fallbackArticlesForGrade(
  topic: Topic,
  gradeLevel?: GradeLevel
): string[] {
  if (gradeLevel === "K-5") {
    return K5_FALLBACK_ARTICLES[topic] ?? TOPIC_ARTICLES[topic] ?? [TOPIC_LABELS[topic]];
  }
  if (gradeLevel === "6-8") {
    return MIDDLE_SCHOOL_FALLBACK[topic] ?? TOPIC_ARTICLES[topic] ?? [TOPIC_LABELS[topic]];
  }
  if (gradeLevel === "9-12") {
    return HIGH_SCHOOL_FALLBACK[topic] ?? TOPIC_ARTICLES[topic] ?? [TOPIC_LABELS[topic]];
  }
  return TOPIC_ARTICLES[topic] ?? [TOPIC_LABELS[topic]];
}

/** Wikipedia search queries tied to a specific teacher's real expertise. */
const EXPERT_CONCEPT_QUERIES: Partial<
  Record<string, Partial<Record<Topic, string[]>>>
> = {
  newton: {
    physics: [
      "Newton laws of motion",
      "Newtonian gravity",
      "Newton optics",
      "classical mechanics",
    ],
    math: ["calculus", "binomial theorem", "Newton method mathematics"],
  },
  einstein: {
    physics: [
      "theory of relativity",
      "photoelectric effect",
      "mass energy equivalence",
      "general relativity",
    ],
  },
  "einstein-cartoon": {
    physics: ["gravity simple", "light speed", "energy physics kids"],
    math: ["counting numbers", "shapes geometry kids", "patterns numbers"],
  },
  tesla: {
    physics: [
      "alternating current",
      "Tesla coil",
      "electromagnetic induction",
      "electric field",
    ],
    engineering: [
      "alternating current",
      "wireless power transfer",
      "electric motor",
      "polyphase system",
    ],
  },
  curie: {
    chemistry: [
      "radium",
      "radioactivity discovery",
      "polonium",
      "pitchblende",
      "Marie Curie chemistry",
    ],
    physics: ["radioactivity", "X-ray Marie Curie", "nuclear radiation"],
  },
  darwin: {
    biology: [
      "natural selection",
      "evolution Darwin",
      "origin of species",
      "Galapagos finches",
      "adaptation biology",
    ],
  },
  euler: {
    math: [
      "Euler identity",
      "graph theory Euler",
      "number theory Euler",
      "Euler formula",
    ],
  },
  hypatia: {
    math: [
      "conic sections",
      "Diophantine equations",
      "Alexandria mathematics",
    ],
    philosophy: ["Neoplatonism", "ancient logic", "virtue philosophy"],
  },
  turing: {
    math: ["Turing machine", "computable function", "halting problem"],
    engineering: ["Enigma machine", "computer science history", "Bletchley Park"],
  },
  aristotle: {
    biology: [
      "Aristotle biology classification",
      "natural history Aristotle",
      "animal classification",
    ],
    philosophy: ["Aristotle ethics", "syllogism logic", "virtue ethics"],
    history: ["ancient Greece history", "Macedonian empire"],
  },
  shakespeare: {
    literature: [
      "Shakespeare sonnet",
      "iambic pentameter",
      "Shakespeare tragedy",
      "Elizabethan drama",
    ],
  },
  cleopatra: {
    history: [
      "Ptolemaic Egypt",
      "Battle of Actium",
      "ancient Alexandria Egypt",
      "Roman Egypt",
    ],
  },
  sunny: {
    biology: ["animals for children", "plants kids", "habitat animals"],
    math: ["counting numbers kids", "shapes geometry kids"],
    history: ["famous people kids history", "ancient egypt kids"],
  },
};

/** Guest / historical figure queries by display name. */
const FIGURE_EXPERT_QUERIES: Record<string, Partial<Record<Topic, string[]>>> = {
  "Gregor Mendel": {
    biology: ["Mendelian inheritance", "pea plant genetics", "dominant recessive allele"],
  },
  "Jane Goodall": {
    biology: ["Jane Goodall chimpanzee", "primate ethology", "Gombe Stream research"],
  },
  "Louis Pasteur": {
    biology: ["pasteurization", "germ theory Pasteur", "vaccine rabies"],
    chemistry: ["stereochemistry Pasteur", "fermentation Pasteur"],
  },
  "Carl Linnaeus": {
    biology: ["binomial nomenclature", "Linnaean taxonomy", "classification species"],
  },
  "Rachel Carson": {
    biology: ["Silent Spring", "environmental toxicology", "DDT ecology"],
  },
  "Galileo Galilei": {
    physics: ["Galileo telescope", "heliocentrism Galileo", "kinematics falling bodies"],
  },
  "Michael Faraday": {
    physics: ["electromagnetic induction Faraday", "Faraday cage", "electric motor"],
  },
  "James Clerk Maxwell": {
    physics: ["Maxwell equations", "electromagnetic theory Maxwell"],
  },
  "Dmitri Mendeleev": {
    chemistry: ["periodic table Mendeleev", "periodic law"],
  },
  "Rosalind Franklin": {
    chemistry: ["X-ray diffraction DNA Franklin", "Photo 51"],
    biology: ["DNA structure Franklin"],
  },
  "Ada Lovelace": {
    math: ["Ada Lovelace analytical engine", "first computer program"],
    engineering: ["Analytical Engine Babbage Lovelace"],
  },
  "Leonardo da Vinci": {
    engineering: ["Leonardo flying machine", "Renaissance engineering inventions"],
  },
  "Grace Hopper": {
    engineering: ["Grace Hopper compiler", "COBOL programming language"],
  },
  "Plato": {
    philosophy: ["Plato theory of forms", "Platonic philosophy", "Republic Plato"],
  },
  "Socrates": {
    philosophy: ["Socratic method", "Socratic dialogue"],
  },
  "Homer": {
    literature: ["Homer Iliad", "Homer Odyssey", "epic poetry ancient Greece"],
  },
  "Jane Austen": {
    literature: ["Jane Austen Pride Prejudice", "Regency novel social satire"],
  },
};

export function expertQueriesForPersonality(
  personality: Personality,
  topic: Topic,
  gradeLevel?: GradeLevel
): string[] {
  const byId = EXPERT_CONCEPT_QUERIES[personality.id]?.[topic] ?? [];
  const byName = FIGURE_EXPERT_QUERIES[personality.name]?.[topic] ?? [];
  const merged = [...byId, ...byName];

  if (merged.length) return [...new Set(merged)];

  if (personality.id === "sunny" || personality.id === "einstein-cartoon") {
    const kidQueries =
      gradeLevel === "K-5"
        ? GRADE_SEARCH_QUERIES["K-5"]?.[topic] ?? []
        : EXPERT_CONCEPT_QUERIES[personality.id]?.[topic] ?? [];
    return [...new Set(kidQueries)];
  }

  if (isGuestCharacterId(personality.id)) {
    return [
      `${personality.name} ${TOPIC_LABELS[topic].toLowerCase()}`,
      `${personality.name} discovery`,
      `${personality.name} theory`,
      `${personality.name} experiment`,
      `${personality.name} research`,
    ];
  }

  if (personality.subjects.includes(topic)) {
    return [
      `${personality.name} ${TOPIC_LABELS[topic].toLowerCase()}`,
      `${personality.name} contribution`,
      `${personality.name} work ${TOPIC_LABELS[topic].toLowerCase()}`,
    ];
  }

  return [];
}

function buildConceptExcludeSet(
  topic: Topic,
  excludeTitles: string[]
): Set<string> {
  const exclude = new Set<string>();
  for (const entry of excludeTitles) {
    const lower = entry.trim().toLowerCase();
    if (!lower) continue;
    exclude.add(lower);
    if (lower.includes(":")) {
      const bare = lower.split(":").pop();
      if (bare) {
        exclude.add(bare);
        exclude.add(normalizeConceptId(bare));
      }
    } else {
      exclude.add(`${topic}:${lower}`);
      exclude.add(`${topic}:${normalizeConceptId(lower)}`);
    }
  }
  return exclude;
}

function titleIsExcluded(
  topic: Topic,
  title: string,
  exclude: Set<string>
): boolean {
  const lower = title.trim().toLowerCase();
  const normalized = normalizeConceptId(title);
  return (
    exclude.has(lower) ||
    exclude.has(normalized) ||
    exclude.has(`${topic}:${lower}`) ||
    exclude.has(`${topic}:${normalized}`) ||
    conceptIsExcluded(topic, title, [...exclude])
  );
}

async function searchConceptCandidates(
  queries: string[],
  scrollIndex: number,
  topic: Topic,
  exclude: Set<string>,
  gradeLevel?: GradeLevel
): Promise<WikiSummary | null> {
  const searchOrder = shuffle([
    ...queries.slice(scrollIndex % Math.max(1, queries.length)),
    ...queries.slice(0, scrollIndex % Math.max(1, queries.length)),
  ]).slice(0, 2);

  for (const query of searchOrder) {
    const titles = await searchWikipediaTitles(query, 8);
    const candidates = shuffle(
      titles.filter((title) => !titleIsExcluded(topic, title, exclude))
    ).slice(0, 5);

    const summaries = await Promise.all(
      candidates.map((title) => fetchWikiSummary(title))
    );

    for (const summary of summaries) {
      if (
        summary &&
        !titleIsExcluded(topic, summary.title, exclude) &&
        (!gradeLevel || isConceptAppropriateForGrade(summary, gradeLevel))
      ) {
        return summary;
      }
    }
  }

  return null;
}

/** Pick a Wikipedia concept aligned with a teacher's expertise, avoiding recent titles. */
export async function discoverWikiConceptForPersonality(
  personality: Personality,
  topic: Topic,
  scrollIndex: number,
  excludeTitles: string[] = [],
  gradeLevel?: GradeLevel
): Promise<WikiSummary | null> {
  const exclude = buildConceptExcludeSet(topic, excludeTitles);
  const queries = expertQueriesForPersonality(personality, topic, gradeLevel);

  if (!queries.length) return null;

  const fallbacks = fallbackArticlesForGrade(topic, gradeLevel);
  const start = scrollIndex % Math.max(1, fallbacks.length);
  const fastTitles = [0, 1, 2, 3].map(
    (i) => fallbacks[(start + i) % fallbacks.length]
  );
  const fastHits = await Promise.all(fastTitles.map((t) => fetchWikiSummary(t)));
  for (const summary of fastHits) {
    if (
      summary &&
      !titleIsExcluded(topic, summary.title, exclude) &&
      (!gradeLevel || isConceptAppropriateForGrade(summary, gradeLevel))
    ) {
      return summary;
    }
  }

  const hit = await searchConceptCandidates(
    queries,
    scrollIndex,
    topic,
    exclude,
    gradeLevel
  );
  if (hit) return hit;

  const offset = scrollIndex % Math.max(1, queries.length);
  const query = queries[offset];
  const titles = await searchWikipediaTitles(query, 6);
  const candidates = titles
    .filter((title) => !titleIsExcluded(topic, title, exclude))
    .slice(0, 4);
  const summaries = await Promise.all(
    candidates.map((title) => fetchWikiSummary(title))
  );
  for (const summary of summaries) {
    if (
      summary &&
      !titleIsExcluded(topic, summary.title, exclude) &&
      (!gradeLevel || isConceptAppropriateForGrade(summary, gradeLevel))
    ) {
      return summary;
    }
  }

  return null;
}

function shortenForGrade(text: string, gradeLevel: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const limits: Record<string, number> = {
    "K-5": 2,
    "6-8": 3,
    "9-12": 4,
    college: 5,
    graduate: 6,
  };
  const limit = limits[gradeLevel] ?? 4;
  let out = sentences.slice(0, limit).join(" ").trim();
  out = simplifyVocabulary(out, gradeLevel as GradeLevel);
  return out;
}

export async function searchWikipediaTitles(
  query: string,
  limit = 20
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json",
    origin: "*",
  });

  try {
    const res = await wikiFetch(`${WIKI_API}?${params}`, 3000);
    if (!res) return [];

    const data = (await res.json()) as {
      query?: { search?: { title?: string }[] };
    };
    return (data.query?.search ?? [])
      .map((hit) => hit.title)
      .filter((title): title is string => Boolean(title));
  } catch {
    return [];
  }
}

export async function fetchWikiSummary(
  pageTitle: string
): Promise<WikiSummary | null> {
  const cacheKey = pageTitle.toLowerCase();
  const cached = summaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await wikiFetch(
      `${WIKI_REST}/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`
    );
    if (!res) return null;

    const data = (await res.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
      thumbnail?: { source?: string };
    };

    if (!data.extract?.trim()) return null;

    const summary: WikiSummary = {
      title: data.title ?? pageTitle.replace(/_/g, " "),
      extract: data.extract.trim(),
      url:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
      thumbnailUrl: data.thumbnail?.source,
    };
    summaryCache.set(cacheKey, summary);
    return summary;
  } catch {
    return null;
  }
}

/** Pick a random Wikipedia concept for this topic, avoiding recent titles. */
export async function discoverRandomWikiConcept(
  topic: Topic,
  scrollIndex: number,
  excludeTitles: string[] = [],
  gradeLevel?: GradeLevel
): Promise<WikiSummary | null> {
  const exclude = buildConceptExcludeSet(topic, excludeTitles);

  const gradeQueries = gradeLevel
    ? GRADE_SEARCH_QUERIES[gradeLevel]?.[topic]
    : undefined;
  const queries =
    gradeQueries ??
    TOPIC_SEARCH_QUERIES[topic] ??
    [TOPIC_LABELS[topic]];

  const hit = await searchConceptCandidates(
    queries,
    scrollIndex,
    topic,
    exclude,
    gradeLevel
  );
  if (hit) return hit;

  const fallback = fallbackArticlesForGrade(topic, gradeLevel);
  const offset = scrollIndex + Math.floor(Math.random() * fallback.length);
  for (let i = 0; i < fallback.length; i++) {
    const page = fallback[(offset + i) % fallback.length];
    const summary = await fetchWikiSummary(page);
    if (
      summary &&
      !titleIsExcluded(topic, summary.title, exclude) &&
      (!gradeLevel || isConceptAppropriateForGrade(summary, gradeLevel))
    ) {
      return summary;
    }
  }

  return null;
}

export function adaptWikiForGrade(
  wiki: WikiSummary,
  gradeLevel: string,
  _characterId: string
): WikiSummary {
  return {
    ...wiki,
    extract: shortenForGrade(wiki.extract, gradeLevel),
  };
}
