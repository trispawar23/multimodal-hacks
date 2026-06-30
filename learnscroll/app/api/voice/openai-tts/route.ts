import { NextRequest, NextResponse } from "next/server";
import { spokenLessonText } from "@/lib/character-voice";
import {
  openAITtsInstructionsForCharacter,
  openAITtsVoiceForCharacter,
  type VoiceCharacter,
} from "@/lib/openai-voice";

export const maxDuration = 30;

function ttsLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:OpenAI:TTS] ${event}`, JSON.stringify(details, null, 2));
}

function defaultTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL ?? "tts-1";
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY", fallback: true },
        { status: 503 }
      );
    }

    const { text, character, characterId, characterName, voiceGender, gradeLevel } =
      (await req.json()) as {
      text?: string;
      character?: VoiceCharacter;
      characterId?: string;
      characterName?: string;
      voiceGender?: "male" | "female" | "neutral";
      gradeLevel?: string;
    };

    const spoken = spokenLessonText(text ?? "", gradeLevel);
    if (!spoken.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const voiceCharacter = character ?? {
      id: characterId ?? "default",
      name: characterName ?? "the teacher",
      era: "",
      subjects: [],
      initial: characterName?.charAt(0) ?? "T",
      color: "#D8D8D8",
      voiceGender,
    };
    const voice = openAITtsVoiceForCharacter(voiceCharacter);
    const instructions = openAITtsInstructionsForCharacter(voiceCharacter);
    const model = defaultTtsModel();

    ttsLog("request.start", {
      characterId: voiceCharacter.id,
      characterName: voiceCharacter.name,
      textLength: spoken.length,
      voice,
      model,
    });

    const payload: Record<string, unknown> = {
      model,
      voice,
      input: spoken,
      response_format: "mp3",
      speed: 1.05,
    };
    if (model.includes("gpt-4o")) {
      payload.instructions = instructions;
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = (await res.text()).slice(0, 500);
      ttsLog("request.error", {
        characterId,
        status: res.status,
        totalMs: Date.now() - startedAt,
        error,
      });
      return NextResponse.json(
        { error: "OpenAI speech failed", fallback: true },
        { status: res.status }
      );
    }

    const audio = Buffer.from(await res.arrayBuffer()).toString("base64");
    ttsLog("request.success", {
      characterId,
      voice,
      audioBytesBase64: audio.length,
      totalMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      audio,
      mimeType: "audio/mpeg",
      fallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI speech failed";
    ttsLog("request.exception", {
      totalMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
