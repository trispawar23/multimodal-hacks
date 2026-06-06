import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/gemini";
import { FEED_ITEMS } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    const { contentId, gradeLevel = "9-12", questionCount = 5 } = await req.json();

    const content = FEED_ITEMS.find((f) => f.id === contentId);
    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        quizId: `quiz-${contentId}-demo`,
        contentId,
        fallback: true,
        message: "Set GEMINI_API_KEY to enable live quiz generation",
      });
    }

    const questions = await generateQuiz(content, gradeLevel, questionCount);

    return NextResponse.json({
      quizId: `quiz-${contentId}-${Date.now()}`,
      contentId,
      title: `${content.topics[0]} Quiz — ${content.character.name}`,
      gradeLevel: content.gradeLevel,
      questions,
      fallback: false,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: "Quiz generation failed", fallback: true }, { status: 500 });
  }
}
