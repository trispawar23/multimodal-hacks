import { NextRequest, NextResponse } from "next/server";
import { generateInstantSlop } from "@/lib/instant-slop";
import { topicAllowedForGrade, topicsForGrade } from "@/lib/grade-topics";
import type { GradeLevel, Topic } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      topic?: Topic | "all";
      gradeLevel?: GradeLevel;
    };

    const gradeLevel: GradeLevel = body.gradeLevel ?? "9-12";

    let topic: Topic;
    if (
      body.topic &&
      body.topic !== "all" &&
      topicAllowedForGrade(body.topic, gradeLevel)
    ) {
      topic = body.topic;
    } else {
      const pool = topicsForGrade(gradeLevel);
      topic = pool[Math.floor(Math.random() * pool.length)];
    }

    const item = generateInstantSlop(topic, gradeLevel);
    return NextResponse.json({ item, fallback: false });
  } catch (error) {
    console.error("Slop generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
