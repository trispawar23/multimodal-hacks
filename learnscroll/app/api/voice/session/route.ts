import { NextRequest, NextResponse } from "next/server";
import { generateCharacterReply } from "@/lib/gemini";
import { buildLocalCharacterReply } from "@/lib/local-character-reply";
import { getPersonality } from "@/lib/personalities";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

function voiceSessionLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice:Session] ${event}`, JSON.stringify(details, null, 2));
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
    const history = body.history ?? [];

    voiceSessionLog("request.start", {
      characterId,
      questionLength: question.length,
      title,
      transcriptLength: transcript.length,
      gradeLevel,
      topics,
      historyTurns: history.length,
    });

    if (!process.env.GEMINI_API_KEY) {
      const answer = buildLocalCharacterReply(
        personality,
        question.trim(),
        { title, transcript, gradeLevel, topics },
        history
      );
      voiceSessionLog("request.fallback.no_api_key", {
        characterId,
        answerLength: answer.length,
        totalMs: Date.now() - startedAt,
      });
      return NextResponse.json({
        answer,
        characterId,
        grounded: true,
        fallback: true,
      });
    }

    const geminiStartedAt = Date.now();
    const answer = await generateCharacterReply(
      characterId,
      question.trim(),
      { title, transcript, gradeLevel, topics },
      history
    );
    const geminiFinishedAt = Date.now();

    voiceSessionLog("request.success", {
      characterId,
      answerLength: answer.length,
      geminiMs: geminiFinishedAt - geminiStartedAt,
      totalMs: geminiFinishedAt - startedAt,
    });

    return NextResponse.json({
      answer,
      characterId,
      grounded: true,
      fallback: false,
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
      const answer = buildLocalCharacterReply(
        personality,
        body.question?.trim() ?? "",
        {
          title: body.title ?? "this lesson",
          transcript: body.transcript ?? "",
          gradeLevel: body.gradeLevel ?? "9-12",
          topics: body.topics ?? personality.subjects,
        },
        body.history ?? []
      );
      return NextResponse.json({ answer, characterId: body.characterId, fallback: true });
    } catch {
      return NextResponse.json({ error: message, fallback: true }, { status: 500 });
    }
  }
}
