import type { AICharacter } from "./types";
import type { Personality } from "./personalities";
import { readFeedMuted } from "./feed-audio";

let voicesReady = false;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

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

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function englishVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  return s.getVoices().filter((v) => v.lang.startsWith("en"));
}

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  const existing = englishVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const s = synth();
    if (!s) {
      resolve([]);
      return;
    }

    const finish = () => {
      s.removeEventListener("voiceschanged", onChange);
      clearTimeout(timer);
      resolve(englishVoices());
    };

    const onChange = () => {
      if (englishVoices().length) finish();
    };

    const timer = setTimeout(finish, timeoutMs);
    s.addEventListener("voiceschanged", onChange);
    s.getVoices();
  });
}

function isFemaleVoice(name: string): boolean {
  return /female|samantha|karen|victoria|zira|fiona|moira|tessa|kate|serena|amelie|martha|susan|aria|jenny|sonia|marie|shelley|hazel|heather|linda|michelle|nancy|sara|vicki|laura/i.test(
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

function pickVoice(
  character: AICharacter,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  if (!isPersonality(character)) {
    return voices[0];
  }

  const prefs = PERSONALITY_VOICE_NAMES[character.id] ?? [];
  const named = matchByName(voices, prefs);
  if (named) return named;

  const gender = character.voiceGender;

  if (gender === "female") {
    const pool = femaleVoicePool(voices);
    const slot = FEMALE_VOICE_SLOTS[character.id] ?? 0;
    return pickFromPool(pool, slot) ?? voices[0];
  }

  if (gender === "neutral") {
    const pool = kidVoicePool(voices);
    return pickFromPool(pool, 0) ?? voices[0];
  }

  const pool = maleVoicePool(voices);
  const slot = MALE_VOICE_SLOTS[character.id] ?? 0;
  return pickFromPool(pool, slot) ?? voices[0];
}

function startKeepAlive(): void {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    const s = synth();
    if (!s?.speaking) {
      stopKeepAlive();
      return;
    }
    s.pause();
    s.resume();
  }, 10000);
}

function stopKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
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
  const s = synth();
  if (!s || !text.trim()) return;

  const isMuted = hooks?.muted ?? readFeedMuted();
  if (!hooks?.force && isMuted) return;

  const spoken = speechIntro(text);

  void waitForVoices().then((voices) => {
    s.cancel();
    stopKeepAlive();

    const voice = pickVoice(character, voices);
    let started = false;

    const dispatch = () => {
      const utterance = new SpeechSynthesisUtterance(spoken);

      if (isPersonality(character)) {
        utterance.pitch = character.voicePitch;
        utterance.rate = character.voiceRate;
      } else {
        utterance.pitch = 1;
        utterance.rate = 1;
      }

      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        started = true;
        startKeepAlive();
        hooks?.onStart?.();
      };

      utterance.onend = () => {
        stopKeepAlive();
        hooks?.onEnd?.();
      };

      utterance.onerror = (event) => {
        stopKeepAlive();
        if (event.error === "canceled" || event.error === "interrupted") {
          if (started) hooks?.onEnd?.();
          return;
        }
        hooks?.onError?.();
        hooks?.onEnd?.();
      };

      s.speak(utterance);
    };

    dispatch();

    // Chrome sometimes queues but never starts — nudge after a tick
    setTimeout(() => {
      if (!started && s.speaking) {
        s.pause();
        s.resume();
      } else if (!started && !s.speaking) {
        dispatch();
      }
    }, 250);
  });
}

export function stopCharacterSpeech(): void {
  const s = synth();
  if (!s) return;
  stopKeepAlive();
  s.cancel();
}

export function preloadVoices(): void {
  if (typeof window === "undefined") return;
  const load = () => {
    synth()?.getVoices();
    voicesReady = englishVoices().length > 0;
  };
  load();
  window.speechSynthesis?.addEventListener("voiceschanged", load);
}

export function areVoicesReady(): boolean {
  return voicesReady || englishVoices().length > 0;
}

export function isSpeechOutputSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
