import { NextRequest, NextResponse } from "next/server";
import { buildLocalCharacterReply } from "@/lib/local-character-reply";
import { generateOpenAICharacterReply, openAIVoiceEnabled, type VoiceCharacter } from "@/lib/openai-voice";
import { getPersonality, type Personality } from "@/lib/personalities";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

type TurnHistory = { role: "user" | "character"; text: string }[];

function turnLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:Turn] ${event}`, JSON.stringify(details, null, 2));
}

function personalityFromVoiceCharacter(
  character: VoiceCharacter | undefined,
  fallback: Personality,
  topics: Topic[]
): Personality {
  if (!character) return fallback;
  return {
    ...fallback,
    id: character.id,
    name: character.name,
    era: character.era,
    subjects: character.subjects.length ? character.subjects : topics,
    initial: character.initial,
    color: character.color,
    voiceGender: character.voiceGender ?? fallback.voiceGender,
    voicePitch: character.voicePitch ?? fallback.voicePitch,
    voiceRate: character.voiceRate ?? fallback.voiceRate,
  };
}

async function transcribeWithOpenAI(
  audio: File,
  apiKey: string
): Promise<{ text: string; ms: number }> {
  const startedAt = Date.now();
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
    throw new Error(data.error?.message ?? "OpenAI transcription failed");
  }

  return { text: data.text?.trim() ?? "", ms: Date.now() - startedAt };
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
    const rawPayload = form.get("payload");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }
    if (typeof rawPayload !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const payload = JSON.parse(rawPayload) as {
      characterId: string;
      title?: string;
      transcript?: string;
      gradeLevel?: GradeLevel;
      topics?: Topic[];
      character?: VoiceCharacter;
      history?: TurnHistory;
    };
    const characterId = payload.characterId;
    if (!characterId?.trim()) {
      return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
    }

    const personality = getPersonality(characterId);
    const title = payload.title ?? "this lesson";
    const transcript = payload.transcript ?? "";
    const gradeLevel: GradeLevel = payload.gradeLevel ?? "9-12";
    const topics = payload.topics ?? personality.subjects;
    const history = payload.history ?? [];
    const voicePersonality = personalityFromVoiceCharacter(
      payload.character,
      personality,
      topics
    );

    turnLog("request.start", {
      characterId,
      bytes: audio.size,
      type: audio.type,
      title,
      transcriptLength: transcript.length,
      historyTurns: history.length,
    });

    const transcription = await transcribeWithOpenAI(audio, apiKey);
    const question = transcription.text;
    if (!question.trim()) {
      return NextResponse.json({ error: "I didn't catch that", question: "" }, { status: 422 });
    }

    const replyStartedAt = Date.now();
    const answer = openAIVoiceEnabled()
      ? await generateOpenAICharacterReply(
          characterId,
          question,
          { title, transcript, gradeLevel, topics, character: voicePersonality },
          history
        )
      : buildLocalCharacterReply(
          voicePersonality,
          question,
          { title, transcript, gradeLevel, topics },
          history
        );
    const replyMs = Date.now() - replyStartedAt;

    turnLog("request.success", {
      characterId,
      questionLength: question.length,
      answerLength: answer.length,
      transcriptionMs: transcription.ms,
      replyMs,
      totalMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      question,
      answer,
      characterId,
      provider: openAIVoiceEnabled() ? "openai" : "local",
      timings: {
        transcriptionMs: transcription.ms,
        replyMs,
        totalMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice turn failed";
    turnLog("request.error", {
      totalMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
