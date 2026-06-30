import type { AICharacter, GradeLevel } from "./types";

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function voiceLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:OpenAI] ${event}`, JSON.stringify(details, null, 2));
}

export function stopOpenAIConversationVoice(): void {
  currentAudio?.pause();
  currentAudio = null;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
}

function base64ToAudioUrl(base64: string, mimeType: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export async function playOpenAIConversationVoice(
  text: string,
  character: AICharacter,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    fallback?: () => void;
    gradeLevel?: GradeLevel;
  } = {}
): Promise<boolean> {
  const startedAt = performance.now();
  try {
    voiceLog("tts.client.request", {
      characterId: character.id,
      textLength: text.length,
    });

    const res = await fetch("/api/voice/openai-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        character,
        characterId: character.id,
        characterName: character.name,
        voiceGender:
          "voiceGender" in character ? character.voiceGender : undefined,
        gradeLevel: options.gradeLevel,
      }),
    });
    const data = (await res.json()) as {
      audio?: string;
      mimeType?: string;
      error?: string;
    };

    if (!res.ok || !data.audio) {
      throw new Error(data.error ?? "OpenAI speech failed");
    }

    stopOpenAIConversationVoice();
    const url = base64ToAudioUrl(data.audio, data.mimeType ?? "audio/mpeg");
    const audio = new Audio(url);
    currentUrl = url;
    currentAudio = audio;
    audio.onended = () => {
      stopOpenAIConversationVoice();
      options.onEnd?.();
    };
    audio.onerror = () => {
      stopOpenAIConversationVoice();
      options.fallback?.();
      options.onEnd?.();
    };

    await audio.play();
    options.onStart?.();
    voiceLog("tts.client.playing", {
      characterId: character.id,
      totalMs: Math.round(performance.now() - startedAt),
      audioBytesBase64: data.audio.length,
    });
    return true;
  } catch (error) {
    voiceLog("tts.client.fallback", {
      characterId: character.id,
      totalMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    });
    options.fallback?.();
    return false;
  }
}
