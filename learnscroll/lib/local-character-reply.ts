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

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "hmm",
  "like",
  "so",
  "okay",
  "ok",
  "yeah",
  "yes",
]);

function questionTokens(question: string): string[] {
  return question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function speechWords(question: string): string[] {
  return question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !FILLER_WORDS.has(w));
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

function topicLabel(topic: Topic | string): string {
  return topic.replace(/-/g, " ");
}

function titleIdea(title: string): string {
  const afterDash = title.split(/\s+[—-]\s+/).slice(1).join(" ");
  const raw = afterDash || title;
  return raw
    .replace(/\b(how|why|what)\s+i\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
}

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickVariant<T>(items: T[], seed: string): T {
  return items[hashText(seed) % items.length]!;
}

function characterLens(personality: Personality): string {
  switch (personality.id) {
    case "newton":
      return "I would look for the simple rule hiding underneath the motion.";
    case "einstein":
      return "I would ask what changes when you look from a different point of view.";
    case "curie":
      return "I would be patient with the evidence and let careful measurement guide us.";
    case "darwin":
      return "I would compare many small observations before jumping to a big answer.";
    case "turing":
      return "I would separate the problem into clear steps and see where the logic stops.";
    case "tesla":
      return "I would picture the system as energy moving through a design.";
    case "aristotle":
      return "I would start by asking what the thing is for and what pattern it follows.";
    case "shakespeare":
      return "I would listen for the human motive underneath the event.";
    case "cleopatra":
      return "I would notice the power, incentives, and alliances around the choice.";
    case "sunny":
    case "einstein-cartoon":
      return "Let's make it simple and picture it like a small story.";
    default:
      return "I would connect the idea to the bigger pattern, then make it practical.";
  }
}

function conversationalDetail(
  question: string,
  context: { title: string; transcript: string; topics: Topic[] },
  personality: Personality,
  history: VoiceTurn[]
): string {
  const idea = titleIdea(context.title);
  const topic = topicLabel(context.topics[0] ?? personality.subjects[0] ?? "this topic");
  const tokens = questionTokens(question);
  const focus = tokens.slice(0, 2).join(" and ");
  const seed = `${personality.id}:${question}:${history.length}:${idea}`;

  return pickVariant(
    [
      `I would frame it as ${idea || `a ${topic} idea`}: what changes, who or what reacts, and why that reaction matters.`,
      `Let's not memorize the caption. Think of ${idea || topic} as a moving system, with one pressure creating the next result.`,
      `The useful angle is ${focus || topic}: start with the cause, then ask what it made easier, harder, or more visible.`,
      `I would put it this way: ${idea || topic} matters because it reveals a pattern, not just a fact on a timeline.`,
      `For a quick mental model, picture the situation before the change, the push that disturbed it, and the new behavior after.`,
    ],
    seed
  );
}

function directAnswer(
  question: string,
  context: { title: string; topics: Topic[] },
  personality: Personality,
  history: VoiceTurn[]
): string {
  const idea = titleIdea(context.title);
  const topic = topicLabel(context.topics[0] ?? personality.subjects[0] ?? "this topic");
  const tokens = questionTokens(question);
  const focus = tokens[0] ?? (idea || topic);
  const seed = `${personality.id}:direct:${question}:${history.length}:${idea}`;

  return pickVariant(
    [
      `On ${focus}, I would answer this way: it matters because it changes what happens next, not because it is a phrase to memorize.`,
      `If you mean ${focus}, the short answer is that it is part of the cause-and-effect chain in ${idea || topic}.`,
      `${focus.charAt(0).toUpperCase()}${focus.slice(1)} is the piece I would watch closely: it tells us what pressure is acting on the situation.`,
      `I would connect ${focus} back to the bigger idea: what was stable, what got disturbed, and what result followed.`,
    ],
    seed
  );
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
  const detail = shortenForGrade(
    conversationalDetail(q, context, personality, history),
    context.gradeLevel
  );
  const topic = context.topics[0] ?? personality.subjects[0] ?? "this topic";
  const idea = titleIdea(context.title);
  const seed = `${personality.id}:${q}:${history.length}:${idea}`;
  const words = speechWords(q);

  const followUp = followUpFromHistory(q, history);
  if (followUp) return followUp;

  if (words.length > 0 && words.length <= 3) {
    return directAnswer(q, context, personality, history);
  }

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
    return `${biographyReply(personality, context.gradeLevel)} For this question, I would connect my perspective to ${idea || topicLabel(topic)} rather than just recite dates.`;
  }

  if (/\b(explain|simpler|simply|easier|don't understand|do not understand|what does|what is|what's|mean)\b/.test(lower)) {
    return pickVariant(
      [
        `Sure. ${detail} ${characterLens(personality)} Which part should we slow down: the setup, the change, or the consequence?`,
        `Yes, let's make it plainer. ${detail} Say one word back to me from that idea, and I'll build from there.`,
        `Absolutely. ${detail} The trick is to follow the motion of the idea, not the exact wording.`,
      ],
      seed
    );
  }

  if (/\b(remember|key|important|takeaway|main idea|summary)\b/.test(lower)) {
    return pickVariant(
      [
        `Keep this: ${idea || topicLabel(topic)} is a relationship between a cause and a result. If you can say what changed and why, you have it.`,
        `The takeaway is not a sentence to recite. It is the pattern behind ${idea || topicLabel(topic)}: pressure, change, consequence.`,
        `Remember the movement of the idea. What was true before, what shifted, and what became possible afterward?`,
      ],
      seed
    );
  }

  if (/\b(example|instance|like what)\b/.test(lower)) {
    return pickVariant(
      [
        `Good request. Imagine a small chain: one choice or force starts moving, then people or objects respond. ${characterLens(personality)}`,
        `Here's a simple example shape: if one pressure rises, the system has to adjust. That adjustment is where the lesson lives.`,
        `Think of it like a scene: something pushes, someone responds, and the response changes the next move.`,
      ],
      seed
    );
  }

  if (/\b(why|how come|reason)\b/.test(lower)) {
    return pickVariant(
      [
        `Why is the right question. ${detail} Usually it is not one magic cause; it is pressure building until something has to change.`,
        `Because the situation had tension in it. ${detail} Once you spot the tension, the answer feels less random.`,
        `The reason sits in the incentives. Ask who benefits, who loses, and what force keeps pushing the system forward.`,
      ],
      seed
    );
  }

  if (/\b(how|work|works|happen|happens)\b/.test(lower)) {
    return pickVariant(
      [
        `Here's the flow: start with the setup, watch what changes, then ask what that change makes possible next.`,
        `${detail} Then follow the next step: what does that change make people, objects, or ideas do?`,
        `It works like a sequence, not a definition. First the pressure, then the response, then the consequence.`,
      ],
      seed
    );
  }

  const tokens = questionTokens(q);
  if (tokens.length > 0) {
    return pickVariant(
      [
        `Good question about ${tokens.slice(0, 2).join(" and ")}. ${detail}`,
        `I like that question. For ${tokens[0]}, I would zoom out first: what role does it play in the larger pattern?`,
        `That is worth asking because it points to the mechanism, not just the surface detail. ${characterLens(personality)}`,
      ],
      seed
    );
  }

  return pickVariant(
    [
      `${directAnswer(q, context, personality, history)} ${characterLens(personality)}`,
      `Here is my direct answer: ${detail}`,
      `I would answer from the pattern, not the caption. ${detail}`,
    ],
    seed
  );
}
