import type { AICharacter } from "./types";
import type { Personality } from "./personalities";
import { isGuestCharacterId } from "./wiki-figures";

function isPersonality(c: AICharacter): c is Personality {
  return "voiceGender" in c;
}

function voiceGenderFor(character: AICharacter): "male" | "female" | "neutral" {
  if (isPersonality(character)) return character.voiceGender;
  return "neutral";
}

/** Gemini prebuilt voices — warmer, conversational picks (avoid overusing Firm voices). */
export const GEMINI_VOICES = {
  default: "Aoede",
  newton: "Charon",
  einstein: "Charon",
  "einstein-cartoon": "Puck",
  curie: "Aoede",
  darwin: "Charon",
  euler: "Charon",
  hypatia: "Aoede",
  turing: "Charon",
  tesla: "Charon",
  aristotle: "Charon",
  shakespeare: "Puck",
  cleopatra: "Aoede",
  sunny: "Leda",
} as const;

export function voiceNameForCharacter(character: AICharacter): string {
  if (isGuestCharacterId(character.id)) {
    const gender = voiceGenderFor(character);
    if (gender === "female") return "Aoede";
    if (gender === "male") return "Charon";
    return "Zephyr";
  }
  return GEMINI_VOICES[character.id as keyof typeof GEMINI_VOICES] ?? GEMINI_VOICES.default;
}

export function voiceStyleForCharacter(character: AICharacter): string {
  if (isGuestCharacterId(character.id)) {
    const era =
      character.era && character.era !== "Historical era"
        ? character.era
        : "their era";
    return `Warm teacher from ${era}. Talk like you're explaining to one student, not reading a textbook.`;
  }
  switch (character.id) {
    case "newton":
      return "Calm, thoughtful mentor — curious and patient, not stiff or formal.";
    case "einstein":
      return "Warm and gently amused, like sharing a neat idea with a friend.";
    case "einstein-cartoon":
      return "Upbeat and friendly for kids — playful but natural, not cartoonishly squeaky.";
    case "curie":
      return "Steady and encouraging, with quiet confidence.";
    case "shakespeare":
      return "Expressive storyteller — vivid but still easy to follow.";
    case "sunny":
      return "Cheerful kid-friendly guide — smile in the voice, short natural phrases.";
    case "aristotle":
      return "Reflective teacher — clear and grounded, conversational authority.";
    case "cleopatra":
      return "Confident and engaging, with natural rhythm.";
    case "darwin":
      return "Gentle observer's tone — curious, unhurried, human.";
    default:
      return "Friendly tutor in a one-on-one chat — relaxed, human, not announcer-like.";
  }
}

/** Gemini TTS prompt — director notes separate from script so delivery stays natural. */
export function buildGeminiTtsPrompt(
  character: AICharacter,
  spoken: string
): string {
  const style = voiceStyleForCharacter(character);
  return `# AUDIO PROFILE
${character.name} — a teacher sharing one idea with a single student.

# SCENE
Quiet moment, face to face. Casual and warm, not a lecture hall or commercial.

# DIRECTOR'S NOTES
${style}
Pacing: natural conversational speed — not slow, not rushed.
Delivery: human and relaxed. Use normal intonation. Do not over-enunciate, drone, or sound robotic.

# SCRIPT
Say exactly the following words and nothing else:

${spoken}`;
}
