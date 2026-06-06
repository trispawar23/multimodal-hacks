import { NextRequest, NextResponse } from "next/server";
import { generatePortraitByCharacterId } from "@/lib/gemini";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      characterId: string;
      topic: Topic;
      title: string;
      gradeLevel: GradeLevel;
    };

    if (!body.characterId || !body.topic || !body.title || !body.gradeLevel) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!topicAllowedForGrade(body.topic, body.gradeLevel)) {
      return NextResponse.json(
        { error: "Topic not valid for grade level" },
        { status: 400 }
      );
    }

    const posterUrl = await generatePortraitByCharacterId(
      body.characterId,
      body.topic,
      body.title,
      body.gradeLevel
    );

    return NextResponse.json({ posterUrl, fallback: false });
  } catch (error) {
    console.error("Portrait generation error:", error);
    const message = error instanceof Error ? error.message : "Portrait failed";
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
