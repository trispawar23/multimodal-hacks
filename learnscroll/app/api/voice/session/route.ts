import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { buildCharacterSystemPrompt } from "@/lib/gemini";
import { CHARACTERS, FEED_ITEMS } from "@/lib/mock-data";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contentId, characterId, question, transcript } = body as {
      contentId: string;
      characterId: string;
      question: string;
      transcript?: string;
    };

    const character = CHARACTERS.find((c) => c.id === characterId);
    const content = FEED_ITEMS.find((f) => f.id === contentId);

    if (!character || !content) {
      return NextResponse.json({ error: "Character or content not found" }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Demo fallback when no API key is set
      return NextResponse.json({
        answer: `${character.name} here. That's a fascinating question! Based on what we just explored — ${content.title} — the key insight is that ${content.transcript.split(".")[0].toLowerCase()}. Would you like me to elaborate further?`,
        characterId,
        grounded: false,
        fallback: true,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-latest",
      safetySettings: SAFETY_SETTINGS,
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      systemInstruction: buildCharacterSystemPrompt(
        character.name,
        character.era,
        character.subjects.join(", "),
        content.gradeLevel,
        transcript ?? content.transcript
      ),
    });

    const result = await model.generateContent(question);
    const answer = result.response.text();

    return NextResponse.json({
      answer,
      characterId,
      grounded: true,
      fallback: false,
    });
  } catch (error) {
    console.error("Voice session error:", error);
    return NextResponse.json(
      { error: "Voice session failed", fallback: true },
      { status: 500 }
    );
  }
}
