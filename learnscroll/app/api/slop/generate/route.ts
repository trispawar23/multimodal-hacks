import { NextRequest, NextResponse } from "next/server";
import { buildWebReel } from "@/lib/web-feed";
import { pickTopicForFeed } from "@/lib/instant-slop";
import { createFeedRecent } from "@/lib/feed-diversity";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      topic?: Topic | "all";
      gradeLevel?: GradeLevel;
      scrollIndex?: number;
    };

    const gradeLevel: GradeLevel = body.gradeLevel ?? "9-12";
    const scrollIndex = body.scrollIndex ?? 0;
    const recent = createFeedRecent();

    const topic =
      body.topic && body.topic !== "all"
        ? topicAllowedForGrade(body.topic, gradeLevel)
          ? body.topic
          : pickTopicForFeed("all", gradeLevel, scrollIndex, recent)
        : pickTopicForFeed("all", gradeLevel, scrollIndex, recent);

    const reel = await buildWebReel({
      topic,
      gradeLevel,
      scrollIndex,
      recentCharacterIds: recent.characters,
      recentConcepts: recent.concepts,
    });

    const item = {
      id: `api-${Date.now()}-${scrollIndex}`,
      title: reel.title,
      sourceUrl: reel.sourceUrl,
      platform: "tiktok" as const,
      transcript: reel.transcript,
      topics: [reel.topic],
      qualityScore: reel.qualityScore,
      gradeLevel: reel.gradeLevel,
      character: reel.character,
      thumbnailColor: reel.character.color,
      posterUrl: reel.posterUrl ?? "",
      talkingPortrait: true,
      portraitStyle: reel.characterId === "sunny" ? "illustration" : "realistic",
      portraitVariant: reel.portraitVariant,
      durationSec: 45,
      viewCount: 0,
      generated: true,
      scrollIndex,
      enrichPending: false,
      imagePending: !reel.posterUrl,
      wantAiPortrait: !reel.posterUrl,
    };

    return NextResponse.json({ item, fallback: false, enriched: true });
  } catch (error) {
    console.error("Slop generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message, fallback: true }, { status: 500 });
  }
}
