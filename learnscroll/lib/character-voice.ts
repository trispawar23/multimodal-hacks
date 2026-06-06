import type { AICharacter } from "./types";
import { getPersonality, type Personality } from "./personalities";

let voicesReady = false;

// Tracks the currently playing Gemini audio so we can stop it on demand.
let currentAudio: HTMLAudioElement | null = null;
// Monotonic token: every new speak / stop bumps it, so in-flight async
// requests that have been superseded can detect it and bail out.
let speakSeq = 0;

function isPersonality(c: AICharacter): c is Personality {
  return "voicePitch" in c && "voiceGender" in c;
}

function resolveVoiceName(character: AICharacter): string {
  if (character.voiceName) return character.voiceName;
  return getPersonality(character.id).voiceName ?? "Zephyr";
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

/** Pause any playing Gemini audio + cancel browser speech (no token bump). */
function hardStop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Browser Web Speech API — used as the fallback when Gemini TTS is unavailable. */
function browserSpeak(
  spoken: string,
  character: AICharacter,
  callbacks?: SpeakCallbacks
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    callbacks?.onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(spoken);
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

/**
 * Speak as a character — Gemini TTS first, browser speechSynthesis as fallback.
 *
 * Used by both the feed auto-narration and (indirectly) anywhere else that
 * wants high-fidelity Gemini voices with a graceful offline fallback.
 */
export async function speakAsCharacter(
  text: string,
  character: AICharacter,
  callbacks?: SpeakCallbacks
): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  hardStop();
  const seq = ++speakSeq;

  const spoken = speechIntro(text);
  const voiceName = resolveVoiceName(character);

  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, voiceName }),
    });
    if (seq !== speakSeq) return; // superseded while awaiting

    if (res.ok) {
      const data = await res.json();
      if (seq !== speakSeq) return;

      if (data.audioData) {
        const bytes = Uint8Array.from(atob(data.audioData), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mp3" }));
        const audio = new Audio(url);
        currentAudio = audio;

        audio.onended = () => {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
          callbacks?.onEnd?.();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          callbacks?.onEnd?.();
        };

        try {
          await audio.play();
          callbacks?.onStart?.();
          return;
        } catch {
          // Autoplay blocked (no user gesture yet) — fall through to browser TTS
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
        }
      }
    }
    throw new Error("Gemini TTS unavailable");
  } catch {
    if (seq !== speakSeq) return;
    browserSpeak(spoken, character, callbacks);
  }
}

export function stopCharacterSpeech(): void {
  speakSeq++; // invalidate any in-flight Gemini request
  hardStop();
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
