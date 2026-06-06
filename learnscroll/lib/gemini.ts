/**
 * Gemini API utilities for LearnScroll.
 *
 * Uses gemini-2.0-flash-latest for fast operations (feed scoring, quiz gen)
 * and gemini-2.0-pro for reasoning tasks (character persona, RAG synthesis).
 *
 * Gemini Live API (real-time voice) is handled on the client via
 * @google/generative-ai's LiveSession — see components/VoiceOverlay.tsx.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { QuizQuestion, ContentItem, GradeLevel } from "./types";

const API_KEY = process.env.GEMINI_API_KEY ?? "";

function getClient() {
  if (!API_KEY) throw new Error("GEMINI_API_KEY not set in environment");
  return new GoogleGenerativeAI(API_KEY);
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

// ─── Content quality scoring ───────────────────────────────────────────────

export interface QualityScoreResult {
  score: number;         // 0–1, higher = more educational
  isSlop: boolean;       // true if AI-generated fluff with no real content
  topics: string[];
  confidence: number;    // Gemini's self-reported confidence
  reason: string;
}

export async function scoreContentQuality(
  transcript: string,
  metadata: { title: string; platform: string }
): Promise<QualityScoreResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-latest",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const prompt = `
You are an educational content quality evaluator. Score this short-form video transcript.

Title: "${metadata.title}"
Platform: ${metadata.platform}
Transcript: "${transcript}"

Respond ONLY with valid JSON matching this schema:
{
  "score": <float 0-1 — 0 = pure entertainment/AI slop, 1 = rigorous educational content>,
  "isSlop": <boolean — true if AI-generated filler with no real learning value>,
  "topics": <array of topic strings from: physics, math, history, literature, chemistry, biology, engineering, philosophy>,
  "confidence": <float 0-1 — your confidence in this assessment>,
  "reason": <string — one sentence explaining the score>
}

Criteria for HIGH score (>0.8):
- Teaches a specific, verifiable concept
- Uses accurate terminology
- Could appear in a textbook or reputable course
- Cites or aligns with established knowledge

Criteria for LOW score (<0.3) / isSlop = true:
- Vague motivational platitudes passed off as science
- Misrepresents scientific concepts
- AI-generated talking head with no substance
- Engagement-bait pseudoscience
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as QualityScoreResult;
}

// ─── Quiz generation ───────────────────────────────────────────────────────

export async function generateQuiz(
  content: ContentItem,
  gradeLevel: GradeLevel,
  questionCount = 5
): Promise<QuizQuestion[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-latest",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const prompt = `
Generate ${questionCount} multiple-choice quiz questions based ONLY on the content below.
Do NOT invent facts not present in the transcript.
Calibrate difficulty for grade level: ${gradeLevel}.

Content title: "${content.title}"
Transcript: "${content.transcript}"
Topics: ${content.topics.join(", ")}

Respond ONLY with a JSON array of objects matching this schema:
[{
  "id": "<string uuid>",
  "question": "<question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correctIndex": <0-3>,
  "explanation": "<1-2 sentence explanation of why the answer is correct, grounded in the transcript>"
}]

Rules:
- All correct answers must be directly supported by the transcript
- Distractors should be plausible but clearly wrong given the content
- No trick questions
- Explanation must cite specific content, not general knowledge
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as QuizQuestion[];
}

// ─── Character persona system prompt ──────────────────────────────────────

export function buildCharacterSystemPrompt(
  characterName: string,
  era: string,
  subject: string,
  gradeLevel: GradeLevel,
  contentTranscript: string
): string {
  return `You are ${characterName} (${era}), speaking to a student at grade level ${gradeLevel}.

You are deeply knowledgeable about ${subject}. Speak in first person as ${characterName}.
Use period-appropriate vocabulary but remain understandable to a modern student.

GROUND YOUR ANSWERS in this content the student just watched:
---
${contentTranscript}
---

RULES:
1. If asked something outside the content or your historical expertise, say "I'm afraid that falls outside my knowledge."
2. Never claim to know things ${characterName} could not have known (events after ${era.split("–")[1] ?? "your death"}).
3. Always prioritize accuracy over persona — if staying in character would require saying something factually wrong, break character and say "As an AI character: [correct answer]."
4. Keep responses concise — 2-4 sentences. Students are watching on mobile.
5. You are an AI educational character. If asked directly, confirm this.`;
}

// ─── Book compilation prompt ───────────────────────────────────────────────

export async function compileBookOutline(
  title: string,
  transcripts: { contentTitle: string; transcript: string; notes: string }[]
): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-latest",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: { temperature: 0.3 },
  });

  const contentBlock = transcripts
    .map(
      (t, i) =>
        `## Chapter ${i + 1}: ${t.contentTitle}\n${t.transcript}${t.notes ? `\n\nStudent notes: ${t.notes}` : ""}`
    )
    .join("\n\n---\n\n");

  const prompt = `
You are compiling a student study guide titled "${title}".
Below are video transcripts the student saved, with their personal notes.

${contentBlock}

Create a structured study guide with:
1. A brief introduction tying the topics together
2. Key concepts section (bullet points per chapter)
3. Review questions (3 per chapter, different from any existing quiz)
4. Glossary of important terms

Format in clean Markdown. Start with # ${title}.
Add a footer: "AI-compiled study aid — verify with your instructor before exams."
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
