import { NextRequest, NextResponse } from "next/server";
import { enrichFeedItem } from "@/lib/feed-enrich";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      topic: Topic;
      gradeLevel: GradeLevel;
      characterId: string;
      templateTitle: string;
      templateTranscript: string;
      scrollIndex?: number;
      portraitVariant?: number;
    };

    if (
      !body.topic ||
      !body.gradeLevel ||
      !body.characterId ||
      !body.templateTitle ||
      !body.templateTranscript
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!topicAllowedForGrade(body.topic, body.gradeLevel)) {
      return NextResponse.json(
        { error: "Topic not valid for grade level" },
        { status: 400 }
      );
    }

    const enriched = await enrichFeedItem({
      topic: body.topic,
      gradeLevel: body.gradeLevel,
      characterId: body.characterId,
      templateTitle: body.templateTitle,
      templateTranscript: body.templateTranscript,
      scrollIndex: body.scrollIndex ?? 0,
      portraitVariant: body.portraitVariant ?? 0,
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Feed enrich error:", error);
    return NextResponse.json(
      { error: "Enrichment failed", enriched: false },
      { status: 500 }
    );
  }
}
