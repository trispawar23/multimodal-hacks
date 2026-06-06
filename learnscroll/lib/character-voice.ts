import type { AICharacter } from "./types";
import type { Personality } from "./personalities";
import { readFeedMuted } from "./feed-audio";

let voicesReady = false;

function isPersonality(c: AICharacter): c is Personality {
  return "voicePitch" in c && "voiceGender" in c;
}

/** Preferred system voice names per personality (tried in order) */
const PERSONALITY_VOICE_NAMES: Record<string, string[]> = {
  newton: ["Daniel", "Fred", "Arthur", "James", "David", "Microsoft David"],
  einstein: ["Alex", "Oliver", "Mark", "Google UK English Male", "Rishi"],
  darwin: ["Jamie", "Lee", "Tom", "Daniel", "Fred"],
  euler: ["Thomas", "Nicky", "Arthur", "Daniel"],
  turing: ["Ryan", "Oliver", "Alex", "Mark", "Daniel"],
  tesla: ["Jacques", "Tom", "Fred", "Daniel"],
  aristotle: ["Fred", "Arthur", "Daniel", "James"],
  shakespeare: ["Oliver", "Arthur", "Daniel", "Alex"],
  curie: ["Amelie", "Marie", "Karen", "Samantha", "Tessa", "Microsoft Zira"],
  hypatia: ["Victoria", "Moira", "Serena", "Kate", "Samantha"],
  cleopatra: ["Samantha", "Karen", "Fiona", "Tessa", "Microsoft Zira"],
  sunny: ["Junior", "Kathy", "Zoe", "Google UK English Female"],
};

/** Stable slot when name matching fails — each personality gets a different voice */
const MALE_VOICE_SLOTS: Record<string, number> = {
  newton: 0,
  aristotle: 1,
  darwin: 2,
  euler: 3,
  shakespeare: 4,
  tesla: 5,
  einstein: 6,
  turing: 7,
};

const FEMALE_VOICE_SLOTS: Record<string, number> = {
  curie: 0,
  hypatia: 1,
  cleopatra: 2,
};

function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en"));
}

function isFemaleVoice(name: string): boolean {
  return /female|samantha|karen|victoria|zira|fiona|moira|tessa|kate|serena|amelie|martha|susan|aria|jenny|sonia|marie|zira|shelley|hazel|heather|linda|michelle|nancy|sara|vicki|laura|susan/i.test(
    name
  );
}

function isKidVoice(name: string): boolean {
  return /junior|child|kathy|zoe|ana \(child\)|kids/i.test(name);
}

function maleVoicePool(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const pool = voices.filter(
    (v) =>
      !isFemaleVoice(v.name) &&
      !isKidVoice(v.name) &&
      (/male|daniel|alex|fred|david|tom|james|aaron|nathan|arthur|oliver|rishi|mark|ryan|jamie|lee|thomas|nicky|jacques|microsoft david|google uk english male/i.test(
        v.name
      ) ||
        !isFemaleVoice(v.name))
  );
  return pool.length ? pool : voices;
}

function femaleVoicePool(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const pool = voices.filter((v) => isFemaleVoice(v.name));
  return pool.length ? pool : voices;
}

function kidVoicePool(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const pool = voices.filter((v) => isKidVoice(v.name) || isFemaleVoice(v.name));
  return pool.length ? pool : voices;
}

function matchByName(
  voices: SpeechSynthesisVoice[],
  names: string[]
): SpeechSynthesisVoice | null {
  for (const preferred of names) {
    const hit = voices.find((v) =>
      v.name.toLowerCase().includes(preferred.toLowerCase())
    );
    if (hit) return hit;
  }
  return null;
}

function pickFromPool(
  pool: SpeechSynthesisVoice[],
  slot: number
): SpeechSynthesisVoice | null {
  if (!pool.length) return null;
  return pool[slot % pool.length];
}

function pickVoice(character: AICharacter): SpeechSynthesisVoice | null {
  const en = englishVoices();
  if (!en.length) return null;

  if (!isPersonality(character)) {
    return en[0];
  }

  const prefs = PERSONALITY_VOICE_NAMES[character.id] ?? [];
  const named = matchByName(en, prefs);
  if (named) return named;

  const gender = character.voiceGender;

  if (gender === "female") {
    const pool = femaleVoicePool(en);
    const slot = FEMALE_VOICE_SLOTS[character.id] ?? 0;
    return pickFromPool(pool, slot) ?? en[0];
  }

  if (gender === "neutral") {
    const pool = kidVoicePool(en);
    return pickFromPool(pool, 0) ?? en[0];
  }

  const pool = maleVoicePool(en);
  const slot = MALE_VOICE_SLOTS[character.id] ?? 0;
  return pickFromPool(pool, slot) ?? en[0];
}

/** Spoken intro — enough to hear the character teach the topic in view */
export function speechIntro(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts?.length) return text.slice(0, 280);
  if (parts.length <= 4 || text.length <= 280) return text.trim();
  return parts.slice(0, 4).join(" ").trim();
}

export function speakAsCharacter(
  text: string,
  character: AICharacter,
  hooks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
    force?: boolean;
    muted?: boolean;
  }
): void {
  if (typeof window === "undefined" || !text.trim()) return;
  const isMuted = hooks?.muted ?? readFeedMuted();
  if (!hooks?.force && isMuted) return;

  const run = () => {
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

    utterance.onstart = () => hooks?.onStart?.();
    utterance.onend = () => hooks?.onEnd?.();
    utterance.onerror = () => {
      hooks?.onError?.();
      hooks?.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length) {
    run();
    return;
  }

  const onVoices = () => {
    window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
    run();
  };
  window.speechSynthesis.addEventListener("voiceschanged", onVoices);
  window.speechSynthesis.getVoices();
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
