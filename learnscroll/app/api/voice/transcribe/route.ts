import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

function transcribeLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:Transcribe] ${event}`, JSON.stringify(details, null, 2));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    transcribeLog("request.start", {
      bytes: audio.size,
      type: audio.type,
      model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
    });

    const openAIForm = new FormData();
    openAIForm.append("file", audio, audio.name || "question.webm");
    openAIForm.append(
      "model",
      process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe"
    );
    openAIForm.append("language", "en");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAIForm,
    });

    const data = (await res.json()) as { text?: string; error?: { message?: string } };
    if (!res.ok) {
      const message = data.error?.message ?? "OpenAI transcription failed";
      transcribeLog("request.error", {
        status: res.status,
        totalMs: Date.now() - startedAt,
        error: message,
      });
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const text = data.text?.trim() ?? "";
    transcribeLog("request.success", {
      textLength: text.length,
      totalMs: Date.now() - startedAt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    transcribeLog("request.exception", {
      totalMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
