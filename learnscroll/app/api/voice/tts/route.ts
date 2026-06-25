import { NextRequest, NextResponse } from "next/server";
import { resolveCharacter } from "@/lib/content-catalog";
import { spokenLessonText } from "@/lib/character-voice";
import { voiceNameForCharacter, buildGeminiTtsPrompt } from "@/lib/voice-personas";
import type { AICharacter } from "@/lib/types";

export const maxDuration = 30;

function ttsLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:TTS] ${event}`, JSON.stringify(details, null, 2));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const { text, characterId, characterName, voiceGender, gradeLevel } =
      (await req.json()) as {
      text?: string;
      characterId?: string;
      characterName?: string;
      voiceGender?: "male" | "female" | "neutral";
      gradeLevel?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured", fallback: true },
        { status: 503 }
      );
    }

    const base = resolveCharacter(characterId);
    const character: AICharacter = {
      ...base,
      name: characterName?.trim() || base.name,
    };
    const voiceCharacter =
      voiceGender && "voiceGender" in base
        ? ({ ...character, voiceGender } as typeof base)
        : character;

    const spoken = spokenLessonText(text, gradeLevel);
    const voiceName = voiceNameForCharacter(voiceCharacter);
    const prompt = buildGeminiTtsPrompt(voiceCharacter, spoken);

    ttsLog("request.start", {
      characterId: character.id,
      voiceName,
      textLength: spoken.length,
      model: "gemini-2.5-flash-preview-tts",
    });
    const geminiRequestAt = Date.now();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
          model: "gemini-2.5-flash-preview-tts",
        }),
      }
    );
    const geminiResponseAt = Date.now();

    const data = await res.json();
    const parsedAt = Date.now();
    if (!res.ok) {
      ttsLog("request.error", {
        characterId: character.id,
        voiceName,
        status: res.status,
        geminiHttpMs: geminiResponseAt - geminiRequestAt,
        parseMs: parsedAt - geminiResponseAt,
        totalMs: parsedAt - startedAt,
        error: data.error?.message ?? "TTS generation failed",
      });
      return NextResponse.json(
        { error: data.error?.message ?? "TTS generation failed", fallback: true },
        { status: res.status }
      );
    }

    const audio =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!audio) {
      ttsLog("request.no_audio", {
        characterId: character.id,
        voiceName,
        status: res.status,
        geminiHttpMs: geminiResponseAt - geminiRequestAt,
        parseMs: parsedAt - geminiResponseAt,
        totalMs: parsedAt - startedAt,
      });
      return NextResponse.json(
        { error: "No audio returned by Gemini TTS", fallback: true },
        { status: 502 }
      );
    }

    ttsLog("request.success", {
      characterId: character.id,
      voiceName,
      audioBytesBase64: audio.length,
      geminiHttpMs: geminiResponseAt - geminiRequestAt,
      parseMs: parsedAt - geminiResponseAt,
      totalMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      audio,
      mimeType: "audio/pcm",
      sampleRate: 24000,
      voiceName,
      fallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    console.error("Voice TTS error:", error);
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
