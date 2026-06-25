import type { Personality } from "./personalities";
import type { GradeLevel, Topic } from "./types";

export interface VoiceTurn {
  role: "user" | "character";
  text: string;
}

const STOP_WORDS = new Set([
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "the",
  "and",
  "for",
  "are",
  "you",
  "your",
  "this",
  "that",
  "with",
  "from",
  "about",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "tell",
  "explain",
  "mean",
  "please",
]);

function questionTokens(question: string): string[] {
  return question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function bestMatchingSnippet(question: string, transcript: string): string {
  const sentences = splitSentences(transcript);
  const tokens = questionTokens(question);
  const pool = sentences.length ? sentences : [transcript.trim()];

  if (!tokens.length) {
    return pool[0]!.slice(0, 320);
  }

  let best = pool[0]!;
  let bestScore = -1;

  for (const sentence of pool) {
    const lower = sentence.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (lower.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  return best.slice(0, 360);
}

function shortenForGrade(text: string, gradeLevel: GradeLevel): string {
  if (gradeLevel !== "K-5" && gradeLevel !== "6-8") return text;
  const words = text.split(/\s+/);
  if (words.length <= 28) return text;
  return `${words.slice(0, 28).join(" ")}…`;
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function biographyReply(personality: Personality, gradeLevel: GradeLevel): string {
  const who = firstName(personality.name);
  const subjects = personality.subjects.length
    ? personality.subjects.join(" and ")
    : "many subjects";

  if (personality.id === "sunny" || personality.id === "einstein-cartoon") {
    return gradeLevel === "K-5"
      ? `Hi! I'm ${who}. I love helping kids explore ${subjects} in fun ways!`
      : `I'm ${personality.name}! I help students learn ${subjects} in a friendly, easy way.`;
  }

  return `I'm ${personality.name}, from the ${personality.era} era. I spent my life studying ${subjects}.`;
}

function followUpFromHistory(
  question: string,
  history: VoiceTurn[]
): string | null {
  const q = question.toLowerCase().trim();
  if (!/^(yes|yeah|yep|no|nope|ok|okay|thanks|thank you)\b/.test(q)) {
    return null;
  }

  const lastCharacter = [...history]
    .reverse()
    .find((t) => t.role === "character")?.text;
  if (!lastCharacter) return null;

  if (/^(yes|yeah|yep|ok|okay)\b/.test(q)) {
    return `Wonderful! Let's keep going — what part would you like me to unpack next?`;
  }
  if (/^thanks|thank you/.test(q)) {
    return `You're very welcome! I'm glad to help. Ask me anything else about the lesson.`;
  }
  return `No problem at all. Would you like a simpler explanation, or a different example?`;
}

/** Grounded in-lesson replies without an LLM — matches question intent to transcript. */
export function buildLocalCharacterReply(
  personality: Personality,
  question: string,
  context: {
    title: string;
    transcript: string;
    gradeLevel: GradeLevel;
    topics: Topic[];
  },
  history: VoiceTurn[] = []
): string {
  const q = question.trim();
  const lower = q.toLowerCase();
  const snippet = shortenForGrade(
    bestMatchingSnippet(q, context.transcript),
    context.gradeLevel
  );
  const who = firstName(personality.name);
  const topic = context.topics[0] ?? personality.subjects[0] ?? "this topic";

  const followUp = followUpFromHistory(q, history);
  if (followUp) return followUp;

  if (
    /\b(who are you|your name|about you|tell me about yourself|who is)\b/.test(
      lower
    )
  ) {
    return biographyReply(personality, context.gradeLevel);
  }

  if (
    /\b(your life|when were you born|where were you born|childhood|biography)\b/.test(
      lower
    )
  ) {
    return `${biographyReply(personality, context.gradeLevel)} In this lesson on ${context.title}, I wanted you to understand: ${snippet}`;
  }

  if (/\b(explain|simpler|simply|easier|don't understand|do not understand|what does|what is|what's|mean)\b/.test(lower)) {
    return `Sure! ${snippet} Think of it this way — it's a key idea in ${topic}, and it connects directly to ${context.title}.`;
  }

  if (/\b(remember|key|important|takeaway|main idea|summary)\b/.test(lower)) {
    return `The big thing to remember from "${context.title}" is this: ${snippet}`;
  }

  if (/\b(example|instance|like what)\b/.test(lower)) {
    return `Great question. From our lesson: ${snippet} That's a concrete example tied to what you asked.`;
  }

  if (/\b(why|how come|reason)\b/.test(lower)) {
    return `Why is a smart question. ${snippet} That's the reason it matters in ${topic}.`;
  }

  if (/\b(how|work|works|happen|happens)\b/.test(lower)) {
    return `Here's how I'd put it: ${snippet}`;
  }

  const tokens = questionTokens(q);
  if (tokens.length > 0) {
    return `Good question about ${tokens.slice(0, 3).join(", ")}. ${snippet}`;
  }

  return `You asked: "${q}". From "${context.title}": ${snippet}`;
}
