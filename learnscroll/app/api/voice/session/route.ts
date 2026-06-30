import { NextRequest, NextResponse } from "next/server";
import { buildLocalCharacterReply } from "@/lib/local-character-reply";
import { generateOpenAICharacterReply, openAIVoiceEnabled, type VoiceCharacter } from "@/lib/openai-voice";
import { getPersonality, type Personality } from "@/lib/personalities";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

function voiceSessionLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:Session] ${event}`, JSON.stringify(details, null, 2));
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

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = (await req.json()) as {
    characterId: string;
    question: string;
    title?: string;
    transcript?: string;
    gradeLevel?: GradeLevel;
    topics?: Topic[];
    character?: VoiceCharacter;
    responseMode?: "instant" | "openai";
    history?: { role: "user" | "character"; text: string }[];
  };

  try {
    const { characterId, question } = body;
    if (!characterId?.trim() || !question?.trim()) {
      return NextResponse.json({ error: "Missing characterId or question" }, { status: 400 });
    }

    const personality = getPersonality(characterId);
    const title = body.title ?? "this lesson";
    const transcript = body.transcript ?? "";
    const gradeLevel: GradeLevel = body.gradeLevel ?? "9-12";
    const topics = body.topics ?? personality.subjects;
    const voicePersonality = personalityFromVoiceCharacter(
      body.character,
      personality,
      topics
    );
    const history = body.history ?? [];

    voiceSessionLog("request.start", {
      characterId,
      questionLength: question.length,
      title,
      transcriptLength: transcript.length,
      gradeLevel,
      topics,
      characterName: voicePersonality.name,
      characterEra: voicePersonality.era,
      historyTurns: history.length,
    });

    if (body.responseMode === "instant" || !openAIVoiceEnabled()) {
      const answer = buildLocalCharacterReply(
        voicePersonality,
        question.trim(),
        { title, transcript, gradeLevel, topics },
        history
      );
      voiceSessionLog(
        body.responseMode === "instant"
          ? "request.instant.local_reply"
          : "request.fallback.no_openai_api_key",
        {
        characterId,
        answerLength: answer.length,
        totalMs: Date.now() - startedAt,
        }
      );
      return NextResponse.json({
        answer,
        characterId,
        grounded: true,
        fallback: body.responseMode !== "instant",
        provider: "local",
      });
    }

    const openAIStartedAt = Date.now();
    const answer = await generateOpenAICharacterReply(
      characterId,
      question.trim(),
      { title, transcript, gradeLevel, topics, character: voicePersonality },
      history
    );
    const openAIFinishedAt = Date.now();

    voiceSessionLog("request.success", {
      characterId,
      answerLength: answer.length,
      provider: "openai",
      openAIMs: openAIFinishedAt - openAIStartedAt,
      totalMs: openAIFinishedAt - startedAt,
    });

    return NextResponse.json({
      answer,
      characterId,
      grounded: true,
      fallback: false,
      provider: "openai",
    });
  } catch (error) {
    console.error("Voice session error:", error);
    const message = error instanceof Error ? error.message : "Voice session failed";
    voiceSessionLog("request.error", {
      totalMs: Date.now() - startedAt,
      error: message,
    });

    try {
      const personality = getPersonality(body.characterId);
      const topics = body.topics ?? personality.subjects;
      const voicePersonality = personalityFromVoiceCharacter(
        body.character,
        personality,
        topics
      );
      const answer = buildLocalCharacterReply(
        voicePersonality,
        body.question?.trim() ?? "",
        {
          title: body.title ?? "this lesson",
          transcript: body.transcript ?? "",
          gradeLevel: body.gradeLevel ?? "9-12",
          topics,
        },
        body.history ?? []
      );
      return NextResponse.json({ answer, characterId: body.characterId, fallback: true });
    } catch {
      return NextResponse.json({ error: message, fallback: true }, { status: 500 });
    }
  }
}
