import type { AICharacter } from "./types";
import type { Personality } from "./personalities";
import { readFeedMuted } from "./feed-audio";

let voicesReady = false;
let activeSession = 0;
let activeSpeechOwner = "";

function isPersonality(c: AICharacter): c is Personality {
  return "voicePitch" in c && "voiceGender" in c;
}

/** Natural browser voices — tried in order on each platform. */
const QUALITY_VOICE_NAMES = [
  "Alex",
  "Microsoft Aria Online",
  "Microsoft Guy Online",
  "Microsoft Jenny Online",
  "Google US English",
  "Google UK English Male",
  "Google UK English Female",
  "Samantha",
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
  /espeak|android|compact|mobile|novelty|bad news|bells|bubble|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|zarvox|bahh|boing|bubbles|junior|pipe|ralph|trinoids|whisper/i;

const PERSONALITY_VOICE_NAMES: Record<string, string[]> = {
  newton: ["Microsoft Guy Online", "Daniel", "Arthur", "James", "Google UK English Male"],
  einstein: ["Alex", "Microsoft Guy Online", "Google US English", "Oliver", "Aaron"],
  "einstein-cartoon": ["Google US English", "Alex", "Samantha", "Oliver"],
  darwin: ["Google UK English Male", "Daniel", "Jamie", "Tom"],
  euler: ["Microsoft Guy Online", "Thomas", "Arthur", "Daniel"],
  turing: ["Microsoft Guy Online", "Alex", "Oliver", "Ryan"],
  tesla: ["Microsoft Guy Online", "Google US English", "Tom", "Daniel"],
  aristotle: ["Google UK English Male", "Arthur", "Daniel", "James"],
  shakespeare: ["Google UK English Male", "Oliver", "Arthur", "Daniel"],
  curie: ["Microsoft Jenny Online", "Microsoft Aria Online", "Samantha", "Karen", "Victoria"],
  hypatia: ["Microsoft Aria Online", "Victoria", "Moira", "Serena", "Samantha"],
  cleopatra: ["Microsoft Aria Online", "Samantha", "Karen", "Fiona", "Tessa"],
  sunny: ["Google US English", "Microsoft Jenny Online", "Samantha", "Karen", "Tessa"],
};

const FIGURE_VOICE_NAMES: Record<string, string[]> = {
  leonardo: [
    "Daniel",
    "Google UK English Male",
    "Microsoft Guy Online",
    "Alex",
    "Arthur",
  ],
  descartes: [
    "Thomas",
    "Daniel",
    "Microsoft Guy Online",
    "Google UK English Male",
    "Arthur",
  ],
  galileo: [
    "Daniel",
    "Google UK English Male",
    "Microsoft Guy Online",
    "Alex",
  ],
  ada: [
    "Microsoft Aria Online",
    "Victoria",
    "Samantha",
    "Serena",
  ],
  lovelace: [
    "Microsoft Aria Online",
    "Victoria",
    "Samantha",
    "Serena",
  ],
  washington: [
    "Microsoft Guy Online",
    "Alex",
    "Daniel",
    "Google US English",
    "Arthur",
  ],
  lincoln: [
    "Alex",
    "Microsoft Guy Online",
    "Daniel",
    "Google US English",
    "Fred",
  ],
  franklin: [
    "Alex",
    "Google US English",
    "Microsoft Guy Online",
    "Daniel",
  ],
  napoleon: [
    "Thomas",
    "Daniel",
    "Microsoft Guy Online",
    "Google UK English Male",
  ],
  "american-statesman": [
    "Microsoft Guy Online",
    "Alex",
    "Google US English",
    "Daniel",
  ],
  ruler: [
    "Daniel",
    "Google UK English Male",
    "Microsoft Guy Online",
    "Arthur",
  ],
  "female-ruler": [
    "Microsoft Aria Online",
    "Victoria",
    "Samantha",
    "Serena",
  ],
  scientist: [
    "Alex",
    "Microsoft Guy Online",
    "Google US English",
    "Daniel",
  ],
  "female-scholar": [
    "Microsoft Aria Online",
    "Microsoft Jenny Online",
    "Samantha",
    "Victoria",
  ],
  writer: [
    "Oliver",
    "Google UK English Male",
    "Alex",
    "Daniel",
  ],
  "female-writer": [
    "Serena",
    "Samantha",
    "Microsoft Aria Online",
    "Victoria",
  ],
  ancient: [
    "Arthur",
    "Fred",
    "Daniel",
    "Google UK English Male",
  ],
};

const FIGURE_RATE: Record<string, number> = {
  leonardo: 0.89,
  descartes: 0.9,
  galileo: 0.91,
  ada: 0.94,
  lovelace: 0.94,
  washington: 0.88,
  lincoln: 0.86,
  franklin: 0.92,
  napoleon: 0.91,
  "american-statesman": 0.89,
  ruler: 0.88,
  "female-ruler": 0.91,
  scientist: 0.94,
  "female-scholar": 0.95,
  writer: 0.9,
  "female-writer": 0.94,
  ancient: 0.86,
};

const FIGURE_PITCH: Record<string, number> = {
  leonardo: 0.91,
  descartes: 0.92,
  galileo: 0.93,
  ada: 1.01,
  lovelace: 1.01,
  washington: 0.88,
  lincoln: 0.9,
  franklin: 0.94,
  napoleon: 0.89,
  "american-statesman": 0.9,
  ruler: 0.88,
  "female-ruler": 1,
  scientist: 0.95,
  "female-scholar": 1.01,
  writer: 0.96,
  "female-writer": 1.02,
  ancient: 0.9,
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

function normalizedCharacterText(character: AICharacter): string {
  return [
    character.id,
    character.name,
    character.era,
    character.subjects.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function figureKey(character: AICharacter): string | null {
  const text = normalizedCharacterText(character);
  if (/\bleonardo\b|\bvinci\b/.test(text)) return "leonardo";
  if (/\bdescartes\b/.test(text)) return "descartes";
  if (/\bgalileo\b/.test(text)) return "galileo";
  if (/\bada\b|\blovelace\b/.test(text)) return "ada";
  if (/\bgeorge washington\b|\bwashington\b/.test(text)) return "washington";
  if (/\babraham lincoln\b|\blincoln\b/.test(text)) return "lincoln";
  if (/\bbenjamin franklin\b|\bfranklin\b/.test(text)) return "franklin";
  if (/\bnapoleon\b|\bbonaparte\b/.test(text)) return "napoleon";
  if (/\bpresident\b|\bfounding father\b|\bstatesman\b|\brevolutionary\b|\bamerican revolution\b/.test(text)) {
    return "american-statesman";
  }
  if (/\bqueen\b|\bempress\b|\bprincess\b|\bhatshepsut\b|\belizabeth\b|\bcatherine\b|\bjoan of arc\b/.test(text)) {
    return "female-ruler";
  }
  if (/\bking\b|\bemperor\b|\bruler\b|\bcaesar\b|\balexander\b|\bgenghis\b|\bkhan\b|\bcharlemagne\b|\bramesses\b|\bsuleiman\b|\bashoka\b/.test(text)) {
    return "ruler";
  }
  if (/\bancient\b|\bbc\b|\bgreek\b|\broman\b|\begyptian\b|\bmesopotamian\b/.test(text)) {
    return "ancient";
  }
  if (/\bnovelist\b|\bpoet\b|\bwriter\b|\bauthor\b|\bplaywright\b|\bliterature\b|\bausten\b|\btwain\b|\bhomer\b/.test(text)) {
    return inferredVoiceGender(character) === "female" ? "female-writer" : "writer";
  }
  if (/\bscientist\b|\bphysicist\b|\bchemist\b|\bmathematician\b|\bengineer\b|\binventor\b|\bastronomer\b|\bbiology\b|\bphysics\b|\bchemistry\b|\bmath\b|\bengineering\b/.test(text)) {
    return inferredVoiceGender(character) === "female" ? "female-scholar" : "scientist";
  }
  return null;
}

function inferredVoiceGender(
  character: AICharacter
): "male" | "female" | "neutral" {
  if (isPersonality(character)) return character.voiceGender;
  const text = normalizedCharacterText(character);
  if (
    /\bmarie\b|\bcurie\b|\bhypatia\b|\bcleopatra\b|\bada\b|\blovelace\b|\bjane\b|\bemmy\b|\bnoether\b|\bflorence\b|\brosalind\b|\bharriet\b|\bsacagawea\b|\bpocahontas\b|\bamelia\b|\brachel\b|\bsofia\b|\belizabeth\b|\bcatherine\b|\bjoan\b|\bhatshepsut\b/.test(
      text
    )
  ) {
    return "female";
  }
  if (
    /\bleonardo\b|\bvinci\b|\bdescartes\b|\bgalileo\b|\bnewton\b|\beinstein\b|\bdarwin\b|\btesla\b|\baristotle\b|\bshakespeare\b|\bgeorge\b|\bwashington\b|\blincoln\b|\bfranklin\b|\bnapoleon\b|\bcaesar\b|\balexander\b|\bgenghis\b|\bkhan\b|\bcharlemagne\b|\bramesses\b|\bsuleiman\b|\bashoka\b/.test(
      text
    )
  ) {
    return "male";
  }
  return "neutral";
}

function voicePreferencesForCharacter(character: AICharacter): string[] {
  const figure = figureKey(character);
  if (figure) return FIGURE_VOICE_NAMES[figure] ?? [];
  return PERSONALITY_VOICE_NAMES[character.id] ?? [];
}

function voiceQualityScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  const signature = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (voice.default) score += 4;
  if (voice.localService) score += 6;
  if (voice.lang === "en-US" || voice.lang === "en-GB") score += 8;
  if (/online|natural|neural|premium|enhanced|google|siri/i.test(signature)) {
    score += 45;
  }
  if (ROBOTIC_VOICE.test(voice.name)) score -= 200;

  for (let i = 0; i < QUALITY_VOICE_NAMES.length; i += 1) {
    if (voice.name.toLowerCase().includes(QUALITY_VOICE_NAMES[i].toLowerCase())) {
      score += 120 - i * 3;
      break;
    }
  }

  return score;
}

function usableVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const filtered = voices.filter((v) => !ROBOTIC_VOICE.test(v.name));
  const pool = filtered.sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
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

  const prefs = voicePreferencesForCharacter(character);
  const named = matchByName(pool, prefs);
  if (named) return named;

  const gender = inferredVoiceGender(character);
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
  const figure = figureKey(character);
  if (figure && FIGURE_RATE[figure]) return FIGURE_RATE[figure];
  if (!isPersonality(character)) return 0.92;
  const base = Math.min(1, Math.max(0.88, character.voiceRate));
  const characterRates: Record<string, number> = {
    shakespeare: 0.9,
    aristotle: 0.9,
    newton: 0.91,
    curie: 0.94,
    cleopatra: 0.93,
    sunny: 1,
    "einstein-cartoon": 0.98,
  };
  return Math.round((characterRates[character.id] ?? base * 0.94) * 100) / 100;
}

function speechPitch(character: AICharacter): number {
  const figure = figureKey(character);
  if (figure && FIGURE_PITCH[figure]) return FIGURE_PITCH[figure];
  if (!isPersonality(character)) return inferredVoiceGender(character) === "female" ? 1.01 : 0.94;
  const characterPitches: Record<string, number> = {
    shakespeare: 0.93,
    aristotle: 0.92,
    newton: 0.94,
    darwin: 0.94,
    tesla: 0.96,
    curie: 1.02,
    hypatia: 1.01,
    cleopatra: 1.02,
    sunny: 1.04,
    "einstein-cartoon": 1.03,
  };
  return characterPitches[character.id] ?? Math.min(1.03, Math.max(0.95, character.voicePitch));
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
