import type { AICharacter } from "./types";

export const GEMINI_VOICES = {
  default: "Kore",
  newton: "Charon",
  einstein: "Puck",
  "einstein-cartoon": "Puck",
  curie: "Kore",
  darwin: "Charon",
  euler: "Iapetus",
  hypatia: "Kore",
  turing: "Iapetus",
  tesla: "Puck",
  aristotle: "Charon",
  shakespeare: "Puck",
  cleopatra: "Kore",
  sunny: "Puck",
} as const;

export function voiceNameForCharacter(character: AICharacter): string {
  return GEMINI_VOICES[character.id as keyof typeof GEMINI_VOICES] ?? GEMINI_VOICES.default;
}

export function voiceStyleForCharacter(character: AICharacter): string {
  switch (character.id) {
    case "newton":
      return "measured, scholarly, curious, with the cadence of a patient physics tutor";
    case "einstein":
    case "einstein-cartoon":
      return "warm, playful, lightly amused, and clear enough for a modern student";
    case "curie":
      return "precise, calm, encouraging, and quietly intense";
    case "shakespeare":
      return "expressive and theatrical, but still easy for a student to follow";
    case "sunny":
      return "bright, friendly, simple, and encouraging for younger learners";
    default:
      return "natural, conversational, and engaging, like a great tutor speaking one-on-one";
  }
}
