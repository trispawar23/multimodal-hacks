import type { AICharacter } from "./types";
import type { Personality } from "./personalities";
import { readFeedMuted } from "./feed-audio";

let voicesReady = false;
let activeSession = 0;
let activeSpeechOwner = "";

function isPersonality(c: AICharacter): c is Personality {
  return "voicePitch" in c && "voiceGender" in c;
}

/** High-quality voices — tried in order on each platform. */
const QUALITY_VOICE_NAMES = [
  "Samantha",
  "Alex",
  "Karen",
  "Daniel",
  "Victoria",
  "Moira",
  "Tessa",
  "Fiona",
  "Serena",
  "Google US English",
  "Microsoft Zira",
  "Microsoft David",
  "Microsoft Aria",
  "Aaron",
  "Nathan",
  "Oliver",
  "Tom",
  "Lee",
  "Jamie",
  "Fred",
  "Arthur",
  "James",
  "Mark",
  "Rishi",
];

const ROBOTIC_VOICE =
  /espeak|android|compact|mobile|offline|novelty|bad news|bells|bubble|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|zarvox|bahh|boing|bubbles|junior|pipe|ralph|trinoids|whisper/i;

const PERSONALITY_VOICE_NAMES: Record<string, string[]> = {
  newton: ["Daniel", "Arthur", "Fred", "James", "Microsoft David"],
  einstein: ["Alex", "Oliver", "Aaron", "Mark", "Rishi"],
  "einstein-cartoon": ["Alex", "Oliver", "Aaron", "Junior", "Kathy"],
  darwin: ["Jamie", "Tom", "Daniel", "Fred"],
  euler: ["Thomas", "Arthur", "Daniel"],
  turing: ["Ryan", "Oliver", "Alex", "Aaron"],
  tesla: ["Tom", "Fred", "Daniel", "Jacques"],
  aristotle: ["Fred", "Arthur", "Daniel", "James"],
  shakespeare: ["Oliver", "Arthur", "Daniel", "Alex"],
  curie: ["Samantha", "Karen", "Victoria", "Moira", "Microsoft Zira"],
  hypatia: ["Victoria", "Moira", "Serena", "Samantha"],
  cleopatra: ["Samantha", "Karen", "Fiona", "Tessa"],
  sunny: ["Samantha", "Karen", "Zoe", "Tessa"],
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

function waitForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
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

function voiceQualityScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (voice.localService) score += 20;
  if (voice.lang === "en-US" || voice.lang === "en-GB") score += 8;
  if (ROBOTIC_VOICE.test(voice.name)) score -= 200;

  for (let i = 0; i < QUALITY_VOICE_NAMES.length; i += 1) {
    if (voice.name.includes(QUALITY_VOICE_NAMES[i])) {
      score += 120 - i * 3;
      break;
    }
  }

  return score;
}

function usableVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const filtered = voices.filter((v) => !ROBOTIC_VOICE.test(v.name));
  const local = filtered.filter((v) => v.localService);
  const pool = (local.length ? local : filtered).sort(
    (a, b) => voiceQualityScore(b) - voiceQualityScore(a)
  );
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
    if (hit && !ROBOTIC_VOICE.test(hit.name)) return hit;
  }
  return null;
}

function pickVoice(
  character: AICharacter,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const pool = usableVoices(voices);
  if (!pool.length) return null;

  if (!isPersonality(character)) {
    return pool[0];
  }

  const prefs = PERSONALITY_VOICE_NAMES[character.id] ?? [];
  const named = matchByName(pool, prefs);
  if (named) return named;

  const gender = character.voiceGender;
  const genderPool =
    gender === "female"
      ? pool.filter((v) => isFemaleVoice(v.name))
      : gender === "male"
        ? pool.filter((v) => !isFemaleVoice(v.name))
        : pool;

  const slot = [...character.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const candidates = genderPool.length ? genderPool : pool;
  return candidates[slot % candidates.length] ?? pool[0];
}

function speechRate(character: AICharacter): number {
  if (!isPersonality(character)) return 0.98;
  const base = Math.min(1.02, Math.max(0.92, character.voiceRate));
  return Math.round(base * 0.98 * 100) / 100;
}

function speechPitch(character: AICharacter): number {
  if (!isPersonality(character)) return 1;
  // Keep pitch near neutral — extreme values sound robotic.
  return Math.min(1.04, Math.max(0.94, character.voicePitch));
}

function humanizeForSpeech(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, ", ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\bi am\b/gi, "I'm")
    .replace(/\bit is\b/gi, "it's")
    .replace(/\bthat is\b/gi, "that's")
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bcan not\b/gi, "can't")
    .replace(/\bwill not\b/gi, "won't")
    .trim();
}

/** Text optimized for TTS — short, clear, and within model limits. */
export function spokenLessonText(
  text: string,
  gradeLevel?: string
): string {
  const limits: Record<string, { sentences: number; chars: number }> = {
    "K-5": { sentences: 2, chars: 220 },
    "6-8": { sentences: 3, chars: 280 },
    "9-12": { sentences: 3, chars: 340 },
    college: { sentences: 4, chars: 380 },
    graduate: { sentences: 4, chars: 400 },
  };
  const limit = limits[gradeLevel ?? "9-12"] ?? limits["9-12"];

  const clean = humanizeForSpeech(text);

  const sentences = clean.match(/[^.!?]+[.!?]+/g);
  if (!sentences?.length) {
    return clean.slice(0, limit.chars);
  }

  let out = "";
  for (const sentence of sentences.slice(0, limit.sentences)) {
    const next = `${out}${sentence}`;
    if (next.length > limit.chars && out) break;
    out = next;
  }

  const spoken = (out.trim() || sentences[0].trim()).slice(0, limit.chars);
  return spoken;
}

/** @deprecated Use spokenLessonText */
export function speechIntro(text: string): string {
  return spokenLessonText(text, "9-12");
}

function speechParts(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g);
  if (!sentences?.length) return [trimmed.slice(0, 420)];

  const full = sentences.join(" ").trim();
  if (full.length <= 480) return [full];

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = `${current}${sentence}`;
    if (next.length > 300 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [trimmed.slice(0, 420)];
}

let activeFingerprint = "";

type SpeakHooks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  force?: boolean;
  muted?: boolean;
  speechKey?: string;
  speechOwner?: string;
};

function speakPart(
  part: string,
  character: AICharacter,
  voice: SpeechSynthesisVoice | null,
  session: number,
  hooks?: SpeakHooks
): Promise<void> {
  return new Promise((resolve) => {
    const s = synth();
    if (!s || session !== activeSession) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(part);
    utterance.lang = voice?.lang ?? "en-US";
    utterance.rate = speechRate(character);
    utterance.pitch = speechPitch(character);
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    let started = false;

    utterance.onstart = () => {
      if (session !== activeSession) return;
      started = true;
      hooks?.onStart?.();
    };

    utterance.onend = () => {
      if (session !== activeSession) return;
      resolve();
    };

    utterance.onerror = (event) => {
      if (session !== activeSession) return;
      if (event.error !== "canceled" && event.error !== "interrupted") {
        hooks?.onError?.();
      }
      resolve();
    };

    s.speak(utterance);

    window.setTimeout(() => {
      if (session !== activeSession || started) return;
      if (s.speaking && !s.paused) {
        s.pause();
        s.resume();
      }
    }, 250);
  });
}

export function speakAsCharacter(
  text: string,
  character: AICharacter,
  hooks?: SpeakHooks
): void {
  const s = synth();
  if (!s || !text.trim()) return;

  const isMuted = hooks?.muted ?? readFeedMuted();
  if (!hooks?.force && isMuted) return;

  const owner = hooks?.speechOwner ?? hooks?.speechKey ?? character.id;
  if (activeSpeechOwner && activeSpeechOwner !== owner) {
    stopCharacterSpeech();
  }
  activeSpeechOwner = owner;

  const session = ++activeSession;
  const parts = speechParts(text);
  if (!parts.length) return;

  const fingerprint =
    hooks?.speechKey ?? `${owner}:${parts.join("|").slice(0, 120)}`;

  void waitForVoices().then(async (voices) => {
    if (session !== activeSession) return;

    const alreadyPlayingSame =
      fingerprint === activeFingerprint && (s.speaking || s.pending);
    if (!alreadyPlayingSame) {
      if (s.speaking || s.pending) {
        s.cancel();
        await new Promise((r) => setTimeout(r, 50));
      }
      activeFingerprint = fingerprint;
    }
    if (session !== activeSession) return;

    const voice = pickVoice(character, voices);
    let started = false;

    for (const part of parts) {
      if (session !== activeSession) break;
      await speakPart(part, character, voice, session, {
        ...hooks,
        onStart: () => {
          if (!started) {
            started = true;
            hooks?.onStart?.();
          }
        },
      });
    }

    if (session !== activeSession) return;
    if (activeSpeechOwner === owner) {
      activeSpeechOwner = "";
    }
    hooks?.onEnd?.();
  });
}

export function stopCharacterSpeech(speechOwner?: string): void {
  if (speechOwner && activeSpeechOwner && speechOwner !== activeSpeechOwner) {
    return;
  }
  activeSpeechOwner = "";
  activeSession += 1;
  activeFingerprint = "";
  const s = synth();
  if (!s) return;
  s.cancel();
}

export function isCharacterSpeaking(): boolean {
  return synth()?.speaking ?? false;
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
