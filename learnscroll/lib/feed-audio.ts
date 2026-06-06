import type { GradeLevel } from "./types";

const MUTE_KEY = "learnscroll-mute-v1";
const GRADE_KEY = "learnscroll-grade-v1";

export function readSavedGrade(): GradeLevel | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(GRADE_KEY);
  if (v === "K-5" || v === "6-8" || v === "9-12" || v === "college") return v;
  return null;
}

export function writeSavedGrade(grade: GradeLevel): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GRADE_KEY, grade);
}

export function readFeedMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "true";
}

export function writeFeedMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, String(muted));
}

const SPEECH_UNLOCK_EVENT = "learnscroll-speech-unlock";

let speechPrimed = false;

/** Prime TTS inside a user-gesture handler (Safari / Chrome autoplay). */
export function primeSpeechSynthesis(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  const prime = new SpeechSynthesisUtterance("\u200B");
  prime.volume = 0.01;
  prime.rate = 2;
  window.speechSynthesis.speak(prime);
}

/** Call from a user-gesture handler to unlock browser speech. */
export function unlockFeedSpeech(): void {
  if (typeof window === "undefined") return;
  if (!speechPrimed) {
    primeSpeechSynthesis();
    speechPrimed = true;
  }
  window.dispatchEvent(new Event(SPEECH_UNLOCK_EVENT));
}

export function onFeedSpeechUnlock(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SPEECH_UNLOCK_EVENT, listener);
  return () => window.removeEventListener(SPEECH_UNLOCK_EVENT, listener);
}

export function isSpeechPrimed(): boolean {
  return speechPrimed;
}
