import type { GradeLevel, Topic } from "./types";
import type { Personality } from "./personalities";

export interface SlopTemplate {
  title: string;
  transcript: string;
  qualityScore: number;
}

type TemplateBank = Partial<
  Record<Topic, Partial<Record<GradeLevel, SlopTemplate[]>>>
>;

const BANK: TemplateBank = {
  physics: {
    "K-5": [],
    "6-8": [
      {
        title: "Why things fall — gravity in plain words",
        transcript:
          "Gravity pulls everything toward Earth's center. Drop a ball and it falls at the same rate whether it's heavy or light — that's why astronauts float when they're far from Earth.",
        qualityScore: 0.89,
      },
    ],
    "9-12": [
      {
        title: "Newton's third law — every action has a reaction",
        transcript:
          "When you jump, you push Earth down and Earth pushes you up. Rockets work the same way: exhaust gas shoots down, and the rocket rises. Forces always come in matched pairs.",
        qualityScore: 0.94,
      },
      {
        title: "Why light bends near the Sun",
        transcript:
          "Mass curves space itself. Light follows that curve, so starlight grazing the Sun appears shifted — one of the first proofs that gravity isn't just a pull between objects.",
        qualityScore: 0.96,
      },
    ],
    college: [
      {
        title: "Relativity — time runs slower in strong gravity",
        transcript:
          "Clocks tick slower in stronger gravitational fields. GPS satellites must correct for both special and general relativity or your maps would drift by kilometers every day.",
        qualityScore: 0.97,
      },
    ],
  },
  math: {
    "K-5": [
      {
        title: "Counting patterns — see the shape in numbers",
        transcript:
          "Numbers follow patterns like stairs and squares. If you add the same amount each time, you're building a pattern — and patterns help you predict what comes next.",
        qualityScore: 0.87,
      },
    ],
    "6-8": [
      {
        title: "Pi — why circles hide the same number everywhere",
        transcript:
          "Divide any circle's circumference by its diameter and you always get pi. That one ratio links rings, wheels, and waves — it's why circular motion shows up in so much of physics.",
        qualityScore: 0.91,
      },
    ],
    "9-12": [
      {
        title: "Euler's identity — five constants, one elegant line",
        transcript:
          "e to the i pi plus one equals zero ties together exponentials, circles, and negative one. It's often called the most beautiful equation because so much math meets in a single statement.",
        qualityScore: 0.95,
      },
    ],
    college: [
      {
        title: "The halting problem — some questions can't be coded",
        transcript:
          "No program can decide, for every possible program, whether it will stop or run forever. That limit isn't about slow computers — it's a fundamental boundary on what algorithms can know.",
        qualityScore: 0.96,
      },
    ],
  },
  chemistry: {
    "9-12": [
      {
        title: "Radioactivity — atoms that transform themselves",
        transcript:
          "Unstable nuclei shed energy as radiation and become new elements. Marie Curie isolated radium by processing tons of ore — proving atoms aren't immutable.",
        qualityScore: 0.95,
      },
    ],
    college: [
      {
        title: "Half-life — why radiation fades predictably",
        transcript:
          "Every radioactive isotope decays at a fixed rate. After one half-life, half the atoms remain — that clock lets us date ancient rocks and trace medical tracers safely.",
        qualityScore: 0.94,
      },
    ],
  },
  biology: {
    "K-5": [
      {
        title: "How seeds become plants",
        transcript:
          "A seed holds a tiny plant and food to start growing. With water, warmth, and soil, roots go down and shoots go up — that's how forests and flowers begin.",
        qualityScore: 0.88,
      },
    ],
    "6-8": [
      {
        title: "Natural selection in one minute",
        transcript:
          "Organisms vary, resources are limited, and traits that help survival get passed on. Over generations, species change — not because individuals try harder, but because fitter traits accumulate.",
        qualityScore: 0.92,
      },
    ],
    "9-12": [
      {
        title: "DNA — the instruction book in every cell",
        transcript:
          "DNA stores information in four-letter sequences. Genes are chapters; mutations are typos. Some typos harm, some help, and evolution reads that library over millions of years.",
        qualityScore: 0.93,
      },
    ],
    college: [
      {
        title: "Evolutionary fitness isn't strength — it's reproduction",
        transcript:
          "Fitness means leaving viable offspring in a given environment. A trait can spread even if it shortens individual lifespan, as long as it increases reproductive success.",
        qualityScore: 0.94,
      },
    ],
  },
  history: {
    "K-5": [
      {
        title: "Long ago places — maps tell old stories",
        transcript:
          "People lived in villages and kingdoms long before phones and cars. We learn about them from buildings, tools, and writing left behind — like clues in a treasure hunt.",
        qualityScore: 0.86,
      },
    ],
    "6-8": [
      {
        title: "The Nile — why Egypt grew along one river",
        transcript:
          "Annual floods deposited rich soil along the Nile. Farmers could predict harvests, support cities, and build a civilization that lasted thousands of years.",
        qualityScore: 0.9,
      },
    ],
    "9-12": [
      {
        title: "Cleopatra — diplomacy as survival",
        transcript:
          "Cleopatra ruled Egypt by aligning with Rome's power players. She spoke many languages and negotiated trade and military alliances — politics as much as spectacle.",
        qualityScore: 0.91,
      },
    ],
    college: [
      {
        title: "Primary sources vs. propaganda",
        transcript:
          "Letters, coins, and ruins speak differently than later chronicles. Historians cross-check who wrote a source, when, and what they stood to gain before trusting it.",
        qualityScore: 0.92,
      },
    ],
  },
  literature: {
    "9-12": [
      {
        title: "Metaphor — saying one thing, meaning another",
        transcript:
          "Juliet is not literally the sun — Shakespeare compares her warmth and light to the sun's. Metaphor packs feeling and image into a single striking phrase.",
        qualityScore: 0.9,
      },
    ],
    college: [
      {
        title: "Soliloquy — the audience hears private thought",
        transcript:
          "When Hamlet asks to be or not to be, no other character hears him. The soliloquy lets playwrights reveal inner conflict without breaking the scene's realism.",
        qualityScore: 0.91,
      },
    ],
  },
  philosophy: {
    "6-8": [
      {
        title: "Logic — good reasons vs. loud opinions",
        transcript:
          "An argument needs clear claims and evidence. If the conclusion doesn't follow from the premises, the argument fails — even if it sounds convincing.",
        qualityScore: 0.88,
      },
    ],
    "9-12": [
      {
        title: "Syllogisms — Aristotle's chain of reasoning",
        transcript:
          "All humans are mortal. Socrates is human. Therefore Socrates is mortal. Valid form doesn't guarantee true premises — but invalid form guarantees a bad argument.",
        qualityScore: 0.92,
      },
    ],
    college: [
      {
        title: "Ethics — virtue vs. rules vs. outcomes",
        transcript:
          "Aristotle asked what habits make a good life. Later thinkers asked which rules or which results matter most. Philosophy maps the trade-offs before we pick a side.",
        qualityScore: 0.93,
      },
    ],
  },
  engineering: {
    "9-12": [
      {
        title: "Alternating current — why wires hum with power",
        transcript:
          "Tesla championed AC because voltage could be stepped up for long-distance transmission, then stepped down safely in homes — making the grid we use today possible.",
        qualityScore: 0.93,
      },
    ],
    college: [
      {
        title: "Turing machines — the blueprint of computation",
        transcript:
          "A tape, a head, and simple rules can simulate any algorithm. That abstract machine defines what 'computable' means — from phones to proofs about limits of software.",
        qualityScore: 0.96,
      },
    ],
  },
};

export function pickTemplate(
  topic: Topic,
  gradeLevel: GradeLevel,
  personality: Personality
): SlopTemplate {
  const byTopic = BANK[topic];
  const fallback: SlopTemplate = {
    title: `${personality.name} teaches ${topic}`,
    transcript: `Here's something important about ${topic} — a idea worth carrying with you after this lesson ends.`,
    qualityScore: 0.85,
  };

  if (!byTopic) return fallback;

  const pool =
    byTopic[gradeLevel] ??
    byTopic["9-12"] ??
    byTopic["6-8"] ??
    byTopic["K-5"] ??
    byTopic.college ??
    [];

  if (!pool.length) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}
