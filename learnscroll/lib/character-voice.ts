import type { AICharacter } from "./types";
import type { Personality } from "./personalities";

let voicesReady = false;

function isPersonality(c: AICharacter): c is Personality {
  return "voicePitch" in c && "voiceGender" in c;
}

function pickVoice(character: AICharacter): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const gender = isPersonality(character) ? character.voiceGender : "neutral";
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const female = en.find((v) =>
    /female|samantha|karen|victoria|zira|fiona|moira|tessa/i.test(v.name)
  );
  const male = en.find((v) =>
    /male|daniel|alex|fred|david|tom|james|aaron|nathan/i.test(v.name)
  );
  const kid = en.find((v) => /junior|child|kathy/i.test(v.name));

  if (gender === "female") return female ?? en[0] ?? null;
  if (gender === "neutral") return kid ?? female ?? en[0] ?? null;
  return male ?? en[0] ?? null;
}

/** First ~2 sentences — starts faster, feels less like buffering */
export function speechIntro(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts?.length) return text.slice(0, 180);
  return parts.slice(0, 2).join(" ").trim();
}

interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

export function speakAsCharacter(
  text: string,
  character: AICharacter,
  callbacks?: SpeakCallbacks
): void {
  if (typeof window === "undefined" || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(speechIntro(text));

  if (isPersonality(character)) {
    utterance.pitch = character.voicePitch;
    utterance.rate = character.voiceRate;
  } else {
    utterance.pitch = 1;
    utterance.rate = 1;
  }

  const voice = pickVoice(character);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export function stopCharacterSpeech(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

export function preloadVoices(): void {
  if (typeof window === "undefined") return;
  const load = () => {
    window.speechSynthesis.getVoices();
    voicesReady = true;
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function areVoicesReady(): boolean {
  return voicesReady;
}
