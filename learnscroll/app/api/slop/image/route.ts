import { NextRequest, NextResponse } from "next/server";
import { fetchGuestPortraitUrl } from "@/lib/guest-portraits";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import {
  isGuestCharacterId,
  registerGuestFigure,
} from "@/lib/wiki-figures";
import { fetchWebPortraitUrl } from "@/lib/web-portraits";
import type { GradeLevel, Topic } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      characterId: string;
      characterName?: string;
      topic: Topic;
      title: string;
      gradeLevel: GradeLevel;
      portraitVariant?: number;
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

    if (isGuestCharacterId(body.characterId)) {
      const name = body.characterName?.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Guest teacher requires characterName" },
          { status: 400 }
        );
      }

      registerGuestFigure(body.characterId, name);
      const posterUrl = await fetchGuestPortraitUrl(
        name,
        body.portraitVariant ?? 0
      );

      if (!posterUrl) {
        return NextResponse.json(
          { error: "No portrait found for this guest teacher" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        posterUrl,
        characterId: body.characterId,
        source: "wikimedia",
        fallback: false,
      });
    }

    const { posterUrl, source } = await fetchWebPortraitUrl(
      body.characterId,
      body.gradeLevel,
      body.portraitVariant ?? 0,
      { topic: body.topic }
    );

    if (!posterUrl) {
      return NextResponse.json(
        { error: "No portrait found for this character" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      posterUrl,
      characterId: body.characterId,
      source,
      fallback: false,
    });
  } catch (error) {
    console.error("Portrait lookup error:", error);
    return NextResponse.json(
      { error: "Portrait lookup failed" },
      { status: 500 }
    );
  }
}
