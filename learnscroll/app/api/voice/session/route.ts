import { NextRequest, NextResponse } from "next/server";
import { generateCharacterReply } from "@/lib/gemini";
import { getPersonality } from "@/lib/personalities";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      characterId: string;
      question: string;
      title?: string;
      transcript?: string;
      gradeLevel?: GradeLevel;
      topics?: Topic[];
      history?: { role: "user" | "character"; text: string }[];
    };

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        answer: `${personality.name} here. "${question}" — a fine question! From what we covered in "${title}", the heart of it is: ${transcript.split(".")[0] || "keep exploring and stay curious"}. Ask me about my life or this subject anytime.`,
        characterId,
        grounded: false,
        fallback: true,
      });
    }

    const answer = await generateCharacterReply(
      characterId,
      question.trim(),
      { title, transcript, gradeLevel, topics },
      history
    );

    return NextResponse.json({
      answer,
      characterId,
      grounded: true,
      fallback: false,
    });
  } catch (error) {
    console.error("Voice session error:", error);
    const message = error instanceof Error ? error.message : "Voice session failed";
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
