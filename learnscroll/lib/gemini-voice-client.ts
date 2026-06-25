import type { AICharacter } from "./types";

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function voiceLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice] ${event}`, JSON.stringify(details, null, 2));
}

function pcmBase64ToWavUrl(base64: string, sampleRate: number): string {
  const binary = window.atob(base64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    pcm[i] = binary.charCodeAt(i);
  }

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcm.byteLength, true);

  return URL.createObjectURL(new Blob([header, pcm], { type: "audio/wav" }));
}

export function stopGeminiVoice(): void {
  currentAudio?.pause();
  currentAudio = null;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
}

export async function playGeminiVoice(
  text: string,
  character: AICharacter,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    fallback?: () => void;
    gradeLevel?: string;
  } = {}
): Promise<boolean> {
  const startedAt = performance.now();
  try {
    voiceLog("tts.client.request", {
      characterId: character.id,
      textLength: text.length,
    });
    const res = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        characterId: character.id,
        characterName: character.name,
        voiceGender:
          "voiceGender" in character ? character.voiceGender : undefined,
        gradeLevel: options.gradeLevel,
      }),
    });
    const responseAt = performance.now();
    const data = (await res.json()) as {
      audio?: string;
      sampleRate?: number;
      error?: string;
    };
    const parsedAt = performance.now();

    if (!res.ok || !data.audio) {
      throw new Error(data.error ?? "Gemini voice failed");
    }

    stopGeminiVoice();
    const url = pcmBase64ToWavUrl(data.audio, data.sampleRate ?? 24000);
    const wavReadyAt = performance.now();
    const audio = new Audio(url);
    audio.playbackRate = 1;
    currentUrl = url;
    currentAudio = audio;
    audio.onended = () => {
      stopGeminiVoice();
      options.onEnd?.();
    };
    audio.onerror = () => {
      stopGeminiVoice();
      options.fallback?.();
      options.onEnd?.();
    };
    await audio.play();
    options.onStart?.();
    const playingAt = performance.now();
    voiceLog("tts.client.playing", {
      characterId: character.id,
      httpMs: Math.round(responseAt - startedAt),
      parseMs: Math.round(parsedAt - responseAt),
      wavWrapMs: Math.round(wavReadyAt - parsedAt),
      playStartMs: Math.round(playingAt - wavReadyAt),
      totalMs: Math.round(playingAt - startedAt),
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
