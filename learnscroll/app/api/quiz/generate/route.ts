import { NextRequest, NextResponse } from "next/server";
import { generateQuizFromSaved } from "@/lib/gemini";
import {
  dominantGradeLevel,
  fallbackQuizForSaved,
  quizTitleForTopic,
} from "@/lib/quiz-fallback";
import type { ContentItem, GradeLevel, Topic } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      topic?: Topic | "all";
      contents?: ContentItem[];
      gradeLevel?: GradeLevel;
      questionCount?: number;
    };

    const contents = body.contents ?? [];
    if (!contents.length) {
      return NextResponse.json({ error: "No saved content provided" }, { status: 400 });
    }

    const topic = body.topic ?? "all";
    const gradeLevel = body.gradeLevel ?? dominantGradeLevel(contents);
    const questionCount = body.questionCount ?? 5;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        title: quizTitleForTopic(topic, contents.length),
        gradeLevel,
        questions: fallbackQuizForSaved(contents, topic, questionCount),
        fallback: true,
      });
    }

    try {
      const questions = await generateQuizFromSaved(
        contents,
        gradeLevel,
        questionCount
      );

      return NextResponse.json({
        title: quizTitleForTopic(topic, contents.length),
        gradeLevel,
        questions,
        fallback: false,
      });
    } catch (geminiError) {
      console.error("Quiz Gemini error, using local bank:", geminiError);
      return NextResponse.json({
        title: quizTitleForTopic(topic, contents.length),
        gradeLevel,
        questions: fallbackQuizForSaved(contents, topic, questionCount),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: "Quiz generation failed" }, { status: 400 });
  }
}
