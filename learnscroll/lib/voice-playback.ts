import type { AICharacter } from "./types";
import { spokenLessonText, speakAsCharacter, stopCharacterSpeech } from "./character-voice";
import { playGeminiVoice, stopGeminiVoice } from "./gemini-voice-client";
import { stopOpenAIConversationVoice } from "./openai-voice-client";
import type { GradeLevel } from "./types";

export function stopAllCharacterSpeech(speechOwner?: string): void {
  stopCharacterSpeech(speechOwner);
  stopGeminiVoice();
  stopOpenAIConversationVoice();
}

/** Browser speech by default; set NEXT_PUBLIC_USE_GEMINI_TTS=true to opt into Gemini TTS. */
function geminiTtsEnabled(preferGemini?: boolean): boolean {
  if (preferGemini === false) return false;
  if (preferGemini === true) return true;
  return process.env.NEXT_PUBLIC_USE_GEMINI_TTS === "true";
}

/** Browser speech synthesis by default; optional Gemini TTS when opted in. */
export async function playCharacterVoice(
  text: string,
  character: AICharacter,
  hooks?: {
    onStart?: () => void;
    onEnd?: () => void;
    force?: boolean;
    muted?: boolean;
    speechOwner?: string;
    preferGemini?: boolean;
    gradeLevel?: GradeLevel;
  }
): Promise<void> {
  if (hooks?.muted) return;

  const owner = hooks?.speechOwner;
  stopAllCharacterSpeech(owner);

  const spoken = spokenLessonText(text, hooks?.gradeLevel);
  if (!spoken.trim()) return;

  let started = false;
  const markStart = () => {
    if (!started) {
      started = true;
      hooks?.onStart?.();
    }
  };

  const startBrowserSpeech = () => {
    speakAsCharacter(spoken, character, {
      force: hooks?.force ?? true,
      muted: hooks?.muted,
      speechOwner: owner,
      onStart: markStart,
      onEnd: hooks?.onEnd,
    });
  };

  if (!geminiTtsEnabled(hooks?.preferGemini)) {
    startBrowserSpeech();
    return;
  }

  const played = await playGeminiVoice(spoken, character, {
    onStart: markStart,
    onEnd: hooks?.onEnd,
    fallback: startBrowserSpeech,
    gradeLevel: hooks?.gradeLevel,
  });

  if (!played) {
    startBrowserSpeech();
  }
}
