import { TOPIC_LABELS } from "./grade-topics";
import {
  adaptTemplateForGrade,
  gradeFallbackOrder,
  gradeFallbackTemplate,
} from "./grade-config";
import type { SlopTemplate } from "./grade-config";
import type { Personality } from "./personalities";
import type { GradeLevel, Topic } from "./types";

export type { SlopTemplate };

type ScriptBank = Partial<
  Record<string, Partial<Record<Topic, Partial<Record<GradeLevel, SlopTemplate[]>>>>>
>;

/** First-person scripts — each personality teaches in their own voice */
const PERSONALITY_SCRIPTS: ScriptBank = {
  newton: {
    physics: {
      "6-8": [
        {
          title: "Why the apple fell — gravity as I came to see it",
          transcript:
            "I watched an apple drop and asked why the Moon never crashes into Earth. The same force — gravity — pulls every object toward our planet's center. Drop a ball: heavy or light, it falls at the same rate in air. That single law ties the falling fruit in my orchard to the Moon sailing overhead.",
          qualityScore: 0.91,
        },
      ],
      "9-12": [
        {
          title: "My third law — every action, a reaction",
          transcript:
            "When you jump, you push Earth downward and Earth pushes you upward — I called this my third law. Forces always arrive in matched pairs. Rockets rise because exhaust gas shoots down; the rocket climbs up. You cannot touch the world without the world touching you back. That symmetry runs through every machine and every orbit I ever calculated.",
          qualityScore: 0.94,
        },
      ],
      college: [
        {
          title: "Gravity and the clockwork heavens",
          transcript:
            "I showed that the same force drawing an apple to the ground keeps the Moon in orbit — not a separate celestial law, but one universal gravitation. Planets tug on one another; comets obey the same mathematics as cannonballs. The heavens, I argued, run by rules we can write down. That idea changed how humanity sees its place beneath the stars.",
          qualityScore: 0.96,
        },
      ],
    },
  },
  einstein: {
    physics: {
      "6-8": [
        {
          title: "Gravity — a simple surprise",
          transcript:
            "You feel gravity pulling you down every day. Here is a surprise: when you jump, you push Earth down a tiny bit while Earth pushes you up! Massive objects like planets actually bend space around them. The universe works in ways your eyes alone cannot see.",
          qualityScore: 0.9,
        },
      ],
      "9-12": [
        {
          title: "Gravity curves space — not just a pull",
          transcript:
            "You feel gravity as a pull, but I came to see it differently: mass curves space and time itself. Light follows that curve, which is why starlight bends near the Sun — one of the first proofs my theory was right. Jump, and you push Earth down while Earth pushes you up. The universe is stranger, and more elegant, than everyday intuition suggests.",
          qualityScore: 0.96,
        },
      ],
      college: [
        {
          title: "Time slows where gravity is strong",
          transcript:
            "I predicted that clocks tick slower in stronger gravitational fields — not metaphor, but measurable fact. GPS satellites must correct for both my special and general relativity every day, or your maps would drift by kilometers. Mass tells space how to curve; space tells matter how to move. That partnership governs everything from black holes to the phone in your pocket.",
          qualityScore: 0.97,
        },
      ],
    },
  },
  tesla: {
    physics: {
      "9-12": [
        {
          title: "Invisible forces I spent my life harnessing",
          transcript:
            "I am known for electricity, but physics is the language of every invisible force. Gravity holds the Moon in orbit with no wire between — a field, not mere tug at a distance. When you jump, you and Earth push each other in equal measure. I devoted my life to proving the unseen forces of the cosmos can be understood, measured, and put to work for humanity.",
          qualityScore: 0.92,
        },
      ],
    },
    engineering: {
      "9-12": [
        {
          title: "Why I championed alternating current",
          transcript:
            "I wagered everything on alternating current when others clung to direct current. With AC, voltage can be raised for long transmission and stepped down safely in your home — that is the grid humming around you today. DC could never have carried power across a continent. I saw engineering as poetry written in volts and oscillations, and AC made the modern electrified world possible.",
          qualityScore: 0.93,
        },
      ],
      college: [
        {
          title: "Engineering the invisible — fields and resonance",
          transcript:
            "I did not merely invent devices — I listened to nature's frequencies. Resonance can shatter a bridge or light a bulb across a room without wires. Engineering, to me, means partnering with the laws physics already wrote. Alternating current was not a preference but a necessity: only AC scales to cities and continents. The future belongs to those who hear what the equations whisper.",
          qualityScore: 0.95,
        },
      ],
    },
  },
  euler: {
    math: {
      "9-12": [
        {
          title: "Pi and the identity that still astonishes me",
          transcript:
            "Divide any circle's circumference by its diameter and you always get the same number — we call it pi. That ratio appears in rings, wheels, and waves alike. My identity e to the i pi plus one equals zero ties exponentials, circles, and negative one in a single line. Mathematics, as I practiced it, is the art of patterns that outlive any one lifetime.",
          qualityScore: 0.95,
        },
      ],
      college: [
        {
          title: "On the limits of computation — before machines existed",
          transcript:
            "I filled pages with formulas, yet some truths arrive only as elegant relations — like e to the i pi plus one equals zero, linking five constants at once. Mathematics does not care who discovers it; it waits, complete, for whoever reads carefully enough. I believed the universe is deeply composable — built from simple rules combinable without end.",
          qualityScore: 0.94,
        },
      ],
    },
  },
  hypatia: {
    math: {
      "9-12": [
        {
          title: "Pi — the ratio hidden in every circle",
          transcript:
            "In Alexandria I taught that divide any circle's edge by its width and you always find the same ratio — pi — linking wheels, orbits, and waves. Numbers reveal harmony when we reason step by step. Passion alone cannot make a proof true. I urged my students to follow the chain of logic wherever it leads, for mathematics is the light by which we test every other claim.",
          qualityScore: 0.93,
        },
      ],
    },
    philosophy: {
      "9-12": [
        {
          title: "How I taught logic in Alexandria",
          transcript:
            "I taught that an argument lives or dies by its structure. All humans are mortal; Socrates is human; therefore Socrates is mortal — the form can be valid while the premises still lie. I asked my students to separate loud certainty from clear reasoning. Philosophy, as I practiced it, was never decoration — it was the discipline of knowing how we know.",
          qualityScore: 0.92,
        },
      ],
      college: [
        {
          title: "Reason, virtue, and the examined life",
          transcript:
            "In my lectures I insisted: examine the premises before applauding the conclusion. Rhetoric without logic is a ship without a rudder. I blended mathematics with philosophy because both demand the same honesty — every step must follow from the last. A city that stops questioning its own arguments stops deserving the name of civilization.",
          qualityScore: 0.93,
        },
      ],
    },
  },
  turing: {
    math: {
      "9-12": [
        {
          title: "The halting problem — a wall built into logic",
          transcript:
            "I asked what machines could compute before anyone built one. A tape, a head, and simple rules can simulate any algorithm — that abstract machine defines computable. Yet no program can decide, for every possible program, whether it will stop or run forever. That limit is not about slow hardware; it is a fundamental boundary on what logic itself can know.",
          qualityScore: 0.96,
        },
      ],
      college: [
        {
          title: "Computation before computers",
          transcript:
            "I imagined a machine of tape and symbols that could simulate any step-by-step procedure. That blueprint — what you now call a Turing machine — defines computation itself. Every phone and server is its descendant. Before wiring circuits, we must know what is possible in principle. Some questions are not hard — they are impossible, and proving that impossibility is itself a triumph of reason.",
          qualityScore: 0.97,
        },
      ],
    },
    engineering: {
      "9-12": [
        {
          title: "The blueprint inside every computer",
          transcript:
            "During the war I designed machines to break ciphers — but my deeper work asked what any machine could ever do. A simple head reading a tape can simulate any algorithm; that idea is the ancestor of every processor today. Engineering follows once we understand the limits of mechanical thought. Build boldly, but know which walls are made of iron, not inconvenience.",
          qualityScore: 0.94,
        },
      ],
      college: [
        {
          title: "Machines, codes, and the shape of computation",
          transcript:
            "I broke Enigma because patterns hide in symbols — and I defined computation because patterns hide in procedures. A Turing machine is not a gadget; it is the definition of what step-by-step rules can achieve. Every compiler, every neural net, every search engine inherits that blueprint. Engineering without understanding those limits is guesswork dressed as progress.",
          qualityScore: 0.96,
        },
      ],
    },
  },
  curie: {
    chemistry: {
      "9-12": [
        {
          title: "How I discovered radioactivity",
          transcript:
            "I processed ton after ton of pitchblende in a freezing shed to isolate radium — proof that atoms are not immutable. Some nuclei are unstable; they shed energy as radiation and become new elements. We named this radioactivity. It was painstaking, often lonely work, but it opened a door no one knew existed. Science rewards patience more than spectacle.",
          qualityScore: 0.95,
        },
      ],
      college: [
        {
          title: "Half-life — the clock inside unstable atoms",
          transcript:
            "Every radioactive isotope decays at a fixed rate. After one half-life, half the atoms remain — a predictable clock we use to date ancient rocks and trace medical tracers safely. I did not set out to become a symbol; I set out to measure what others dismissed. When the data contradicts tradition, tradition must yield.",
          qualityScore: 0.94,
        },
      ],
    },
  },
  darwin: {
    biology: {
      "6-8": [
        {
          title: "What I saw on the Beagle voyage",
          transcript:
            "I sailed on the Beagle and noticed finches whose beaks matched their islands. Organisms vary, resources are limited, and helpful traits get passed on. Over generations, species change — not because individuals try harder, but because fitter variants leave more offspring. That simple observation, pursued for decades, became the foundation of modern biology.",
          qualityScore: 0.92,
        },
      ],
      "9-12": [
        {
          title: "Natural selection — nature's slow editor",
          transcript:
            "I argued that life edits itself across generations. DNA stores instructions in four-letter sequences; genes are chapters, mutations are typos. Some typos harm, some help, and nature selects among them over millions of years. Fitness is not strength alone — it is reproductive success in a given place. The tree of life branches because variation never stops.",
          qualityScore: 0.93,
        },
      ],
      college: [
        {
          title: "Fitness is reproduction, not perfection",
          transcript:
            "I coined natural selection to mean differential reproductive success — not progress toward some ideal form. A trait can spread even if it shortens individual life, provided it raises offspring survival. Evolution reads the library of DNA without intent. My critics wanted design; I found process. Both humility and evidence demand we follow the fossils and the finches wherever they point.",
          qualityScore: 0.94,
        },
      ],
    },
  },
  aristotle: {
    biology: {
      "9-12": [
        {
          title: "How I classified the living world",
          transcript:
            "In the Lyceum I sorted living things by form and function — what distinguishes a fish from a bird is not merely shape but how it lives. Organisms vary, environments select, and lineages shift across generations though individuals do not choose their traits. I sought causes: why each creature is organized as it is. Biology begins with careful observation, not haste.",
          qualityScore: 0.91,
        },
      ],
    },
    philosophy: {
      "9-12": [
        {
          title: "Virtue, logic, and the good life",
          transcript:
            "I taught that a good life grows from practiced virtue — courage, temperance, justice — not from a single rule or a quick calculation. Later thinkers asked whether duty or outcomes matter most; I mapped the trade-offs first. If a conclusion does not follow from the premises, no eloquence saves the argument. Philosophy begins when we examine our own reasoning honestly.",
          qualityScore: 0.93,
        },
      ],
      college: [
        {
          title: "Ethics — habits, rules, and consequences",
          transcript:
            "I asked what habits make a flourishing life. Some after me demanded rigid rules; others weighed outcomes alone. Each approach captures part of the truth and neglects another. Ethics is not a slogan — it is the daily practice of choosing well under uncertainty. Begin with character, test with logic, and revise when experience proves you wrong.",
          qualityScore: 0.93,
        },
      ],
    },
  },
  cleopatra: {
    history: {
      "9-12": [
        {
          title: "How I ruled Egypt when Rome watched",
          transcript:
            "I ruled Egypt when Rome's shadow covered the Mediterranean. I spoke nine languages because diplomacy was survival — Greek, Egyptian, and others. Alliances with Caesar and Antony secured trade routes and armies, not romance alone. A kingdom endures by reading power as it moves. History remembers spectacle, but I negotiated grain, ships, and borders in a world ready to swallow Egypt whole.",
          qualityScore: 0.91,
        },
      ],
      college: [
        {
          title: "Sources, power, and the historian's caution",
          transcript:
            "Posterity paints me as myth; I lived as strategist. Coins, letters, and ruins outlive flattery and slander alike. When you read of my court, ask who wrote the account and what they gained. I managed fleets and harvests while empires shifted. Primary evidence — not gossip — is how nations, and queens, should be judged.",
          qualityScore: 0.92,
        },
      ],
    },
  },
  shakespeare: {
    literature: {
      "9-12": [
        {
          title: "Metaphor — saying one thing, meaning another",
          transcript:
            "When I wrote that Juliet is the sun, I did not mean she orbits the sky — I meant her warmth and light outshine the room. Metaphor packs feeling into a single stroke. In Hamlet's soliloquy, no other character hears him; the audience alone receives his private doubt. That device lets theatre show inner life without breaking the world's realism.",
          qualityScore: 0.9,
        },
      ],
      college: [
        {
          title: "Soliloquy — the audience hears private thought",
          transcript:
            "When Hamlet asks to be or not to be, the stage is his confessional. Other players cannot hear; only you in the dark receive his doubt. I used soliloquy because some truths cannot be spoken to another soul yet must be spoken at all. Literature lives in that gap between what we say aloud and what we mean entirely.",
          qualityScore: 0.91,
        },
      ],
    },
  },
  sunny: {
    biology: {
      "K-5": [
        {
          title: "Seeds waking up!",
          transcript:
            "Hi friends! Jo and I planted seeds last week — we put them in soil, gave them water, and guess what? Roots went down and tiny green shoots popped up! A seed is like a lunchbox with a baby plant inside. With warmth and water it wakes up. That's how flowers, trees, and all the plants we love get their start!",
          qualityScore: 0.88,
        },
      ],
      "6-8": [
        {
          title: "How species change over time",
          transcript:
            "Hey! Jo and I learned that animals on different islands can look different even if they're related — like finches with different beaks! Organisms vary, resources are limited, and traits that help survival get passed on. Over many generations, species change. Evolution isn't about trying harder — it's about which helpful traits stick around!",
          qualityScore: 0.9,
        },
      ],
    },
    math: {
      "K-5": [
        {
          title: "Patterns in our stair steps",
          transcript:
            "Hey! Jo found a pattern in our stair steps — one step, two steps, three steps, like counting blocks! When you add the same number again and again, you build a pattern. Patterns help you guess what comes next without counting every time. Math is really just finding those secret shapes hiding in numbers!",
          qualityScore: 0.87,
        },
      ],
      "6-8": [
        {
          title: "Pi — the same number in every circle",
          transcript:
            "Jo and I measured lots of circles — cups, lids, wheels — and every time we divided the edge by the width, we got the same special number: pi! It shows up in wheels, waves, and orbits. Math has these amazing patterns that stay the same no matter where you look. Once you spot one, you start seeing it everywhere!",
          qualityScore: 0.9,
        },
      ],
    },
    history: {
      "K-5": [
        {
          title: "Clues from long ago",
          transcript:
            "Long ago — way before phones or cars — people built villages along rivers and traded with neighbors far away. We learn about them from old pots, buildings, and markings they left behind, like clues in a treasure hunt. History is the story of real people who lived in places we can still visit today!",
          qualityScore: 0.86,
        },
      ],
      "6-8": [
        {
          title: "Why Egypt grew along the Nile",
          transcript:
            "Jo and I read about Egypt — every year the Nile flooded and left rich soil behind! Farmers could predict good harvests, feed cities, and build a civilization that lasted thousands of years. Rivers aren't just water; they're lifelines. That's why so many ancient cultures grew up right beside them!",
          qualityScore: 0.9,
        },
      ],
    },
  },
};

const VOICE_OPENERS: Partial<
  Record<string, Partial<Record<Topic, string>>>
> = {
  newton: {
    physics: "Consider this, as I once did in my study — ",
    math: "Numbers obey laws as strict as the planets — ",
  },
  einstein: {
    physics: "Let me tell you what I found when I stopped taking gravity for granted — ",
  },
  tesla: {
    physics: "The forces I chased my whole life begin here — ",
    engineering: "I saw the future in oscillations and fields — ",
  },
  euler: { math: "A pattern worth your attention — " },
  hypatia: {
    math: "In my lectures at Alexandria I began simply — ",
    philosophy: "Before we argue, we must examine — ",
  },
  turing: {
    math: "I posed this question before computers existed — ",
    engineering: "Every machine today inherits an idea I wrote on paper — ",
  },
  curie: { chemistry: "In my laboratory, behind lead screens, I learned — " },
  darwin: { biology: "On my voyage I noticed something that changed everything — " },
  aristotle: {
    biology: "Walking the Lyceum gardens, I sorted life by its causes — ",
    philosophy: "Let us reason together, step by step — ",
  },
  shakespeare: { literature: "On my stage, words carry double meanings — " },
  cleopatra: { history: "I ruled when empires shifted like sand — " },
  sunny: {
    biology: "Hey friends! Jo and I just discovered — ",
    math: "Okay, check this out — Jo and I noticed — ",
    history: "Story time! Jo and I were reading about — ",
  },
};

function pickFromPersonalityScripts(
  personality: Personality,
  topic: Topic,
  gradeLevel: GradeLevel
): SlopTemplate | null {
  const byTopic = PERSONALITY_SCRIPTS[personality.id]?.[topic];
  if (!byTopic) return null;

  for (const grade of gradeFallbackOrder(gradeLevel)) {
    const pool = byTopic[grade];
    if (pool?.length) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return null;
}

/** Rewrite a generic template in first-person character voice */
export function voiceWrapTemplate(
  template: SlopTemplate,
  personality: Personality,
  topic: Topic,
  gradeLevel: GradeLevel
): SlopTemplate {
  const topicLabel = TOPIC_LABELS[topic].toLowerCase();
  const opener =
    VOICE_OPENERS[personality.id]?.[topic] ??
    `Let me speak plainly about ${topicLabel} — `;

  let transcript = template.transcript;

  const thirdPersonFixes: Record<string, [RegExp, string][]> = {
    tesla: [[/\bTesla championed\b/g, "I championed"]],
    curie: [[/\bMarie Curie\b/g, "I"], [/\bCurie isolated\b/g, "I isolated"]],
    cleopatra: [
      [/\bCleopatra ruled\b/g, "I ruled"],
      [/\bCleopatra spoke\b/g, "I spoke"],
    ],
    darwin: [[/\bDarwin argued\b/g, "I argued"]],
    euler: [[/\bEuler's identity\b/g, "My identity"]],
    shakespeare: [
      [/\bShakespeare compares\b/g, "I compare"],
      [/\bWhen I wrote\b/g, "When I wrote"],
    ],
    aristotle: [[/\bAristotle asked\b/g, "I asked"]],
    hypatia: [[/\bHypatia of Alexandria\b/g, "I"]],
    turing: [[/\bTuring machine\b/g, "Turing machine"]],
    newton: [[/\bNewton's third law\b/g, "my third law"]],
    einstein: [[/\bEinstein's relativity\b/g, "my relativity"]],
  };

  for (const [pattern, replacement] of thirdPersonFixes[personality.id] ?? []) {
    transcript = transcript.replace(pattern, replacement);
  }

  if (!/^(I |Hi |Hey |Let me |Consider |When I |In my |On my )/.test(transcript)) {
    transcript = `${opener}${transcript.charAt(0).toLowerCase()}${transcript.slice(1)}`;
  }

  const shortName = personality.name.split(" ").pop() ?? personality.name;
  const title = template.title.toLowerCase().includes(shortName.toLowerCase())
    ? template.title
    : `${personality.name} on ${topicLabel}`;

  return adaptTemplateForGrade(
    { title, transcript, qualityScore: template.qualityScore },
    gradeLevel,
    personality,
    topic
  );
}

export function pickVoicedTemplate(
  genericPicker: (topic: Topic, gradeLevel: GradeLevel) => SlopTemplate,
  topic: Topic,
  gradeLevel: GradeLevel,
  personality: Personality
): SlopTemplate {
  const personal = pickFromPersonalityScripts(personality, topic, gradeLevel);
  if (personal) {
    return adaptTemplateForGrade(personal, gradeLevel, personality, topic);
  }

  const generic = genericPicker(topic, gradeLevel);
  if (generic) {
    return voiceWrapTemplate(generic, personality, topic, gradeLevel);
  }

  const fallback = gradeFallbackTemplate(topic, gradeLevel);
  if (fallback) {
    return voiceWrapTemplate(fallback, personality, topic, gradeLevel);
  }

  return adaptTemplateForGrade(
    {
      title: `${personality.name} on ${TOPIC_LABELS[topic]}`,
      transcript: `Let me share something important about ${TOPIC_LABELS[topic].toLowerCase()} that is worth remembering.`,
      qualityScore: 0.85,
    },
    gradeLevel,
    personality,
    topic
  );
}
