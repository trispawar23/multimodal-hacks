import { NextRequest, NextResponse } from "next/server";
import { scoreContentQuality } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { transcript, metadata } = await req.json() as {
      url: string;
      transcript: string;
      metadata: { title: string; platform: string };
    };

    if (!transcript || !metadata) {
      return NextResponse.json({ error: "transcript and metadata are required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Default score when API key not set
      return NextResponse.json({
        score: 0.5,
        isSlop: false,
        topics: [],
        confidence: 0,
        reason: "Default score — set GEMINI_API_KEY to enable real scoring",
        fallback: true,
      });
    }

    const result = await scoreContentQuality(transcript, metadata);
    return NextResponse.json({ ...result, fallback: false });
  } catch (error) {
    console.error("Content scoring error:", error);
    return NextResponse.json(
      { score: 0.5, isSlop: false, topics: [], confidence: 0, fallback: true },
      { status: 500 }
    );
  }
}
