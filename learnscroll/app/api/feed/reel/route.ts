import { NextRequest, NextResponse } from "next/server";
import { buildWebReel } from "@/lib/web-feed";
import { buildLocalFallbackReel } from "@/lib/feed-fallback";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    topic: Topic;
    gradeLevel: GradeLevel;
    scrollIndex?: number;
    recentCharacterIds?: string[];
    recentFigureNames?: string[];
    recentConcepts?: string[];
    recentPortraitUrls?: string[];
    topicCharacterHistory?: string[];
    preferredCharacterId?: string;
  };

  if (!body.topic || !body.gradeLevel) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!topicAllowedForGrade(body.topic, body.gradeLevel)) {
    return NextResponse.json(
      { error: "Topic not valid for grade level" },
      { status: 400 }
    );
  }

  const input = {
    topic: body.topic,
    gradeLevel: body.gradeLevel,
    scrollIndex: body.scrollIndex ?? 0,
    recentCharacterIds: body.recentCharacterIds ?? [],
    recentFigureNames: body.recentFigureNames ?? [],
    recentConcepts: body.recentConcepts ?? [],
    recentPortraitUrls: body.recentPortraitUrls ?? [],
    topicCharacterHistory: body.topicCharacterHistory ?? [],
    preferredCharacterId: body.preferredCharacterId,
  };

  let reel;
  try {
    reel = await buildWebReel(input);
  } catch (error) {
    console.error("Web reel error, using local fallback:", error);
    reel = await buildLocalFallbackReel({
      topic: input.topic,
      gradeLevel: input.gradeLevel,
      scrollIndex: input.scrollIndex,
      recentCharacterIds: input.recentCharacterIds,
      topicCharacterHistory: input.topicCharacterHistory,
    });
  }

  return NextResponse.json(reel);
}
