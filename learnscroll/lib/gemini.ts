/**
 * Gemini API utilities for LearnScroll.
 *
 * Uses gemini-2.5-flash for fast operations (feed scoring, quiz gen, slop)
 *
 * Gemini Live API (real-time voice) is handled on the client via
 * @google/generative-ai's LiveSession — see components/VoiceOverlay.tsx.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { CHARACTERS } from "./mock-data";
import type { QuizQuestion, ContentItem, GradeLevel, Topic } from "./types";
import { getCharacterAssets, pickCharacterForTopic, buildPortraitPrompt } from "./slop-config";
import { getPersonality, pickPersonality, type Personality } from "./personalities";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");
  return new GoogleGenerativeAI(apiKey);
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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

// ─── Personality slop generation ───────────────────────────────────────────

export interface SlopGenerationResult {
  title: string;
  transcript: string;
  qualityScore: number;
  characterId: string;
  topics: Topic[];
}

export async function generatePersonalitySlop(
  topic: Topic,
  gradeLevel: GradeLevel = "9-12",
  characterId?: string
): Promise<SlopGenerationResult> {
  const resolvedId =
    characterId &&
    ["newton", "einstein", "einstein-cartoon", "sunny"].includes(characterId)
      ? characterId
      : pickCharacterForTopic(topic, gradeLevel).id;

  const resolvedCharacter =
    CHARACTERS.find((c) => c.id === resolvedId) ?? CHARACTERS[0];

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });

  const prompt = `
You write short-form educational "reel" scripts for LearnScroll — TikTok-style teaching from AI personality characters.

TOPIC: ${topic}
GRADE LEVEL: ${gradeLevel}
CHARACTER: ${resolvedCharacter.name} (${resolvedCharacter.era})
CHARACTER EXPERTISE: ${resolvedCharacter.subjects.join(", ")}

Write ONE new reel where ${resolvedCharacter.name} teaches something specific and memorable about ${topic}.
Voice: first person as the character. Warm, punchy, mobile-friendly — like a 45–90 second talking-head reel.

Respond ONLY with valid JSON:
{
  "title": "<catchy title, max 70 chars>",
  "transcript": "<spoken script, 80–140 words, accurate facts only>",
  "qualityScore": <float 0.7–0.98 — educational value, not entertainment fluff>,
  "characterId": "${resolvedId}",
  "topics": ["${topic}"]
}

Rules:
- Teach ONE concrete concept with a hook (question, surprise, or everyday example)
- Facts must be textbook-accurate for grade ${gradeLevel}
- No vague motivational filler or pseudoscience
- Stay in character but remain understandable to modern students
- Do not mention being an AI unless asked about limitations
`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as SlopGenerationResult;

  return {
    ...parsed,
    characterId: resolvedId,
    topics: parsed.topics?.length ? parsed.topics : [topic],
    qualityScore: Math.min(0.98, Math.max(0.7, parsed.qualityScore ?? 0.85)),
  };
}

export async function generatePortraitImage(
  personality: Personality,
  topic: Topic,
  title: string,
  gradeLevel: GradeLevel
): Promise<string> {
  const assets = getCharacterAssets(personality.posterAsset);
  const prompt = buildPortraitPrompt(
    personality.name,
    personality.era,
    topic,
    title,
    assets.portraitStyle,
    gradeLevel
  );

  const models = ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"];
  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      const genAI = getClient();
      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(prompt);
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];

      for (const part of parts) {
        if ("inlineData" in part && part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }

      lastError = new Error(`Model ${modelName} returned no image data`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Portrait generation failed");
}

export async function generatePortraitByCharacterId(
  characterId: string,
  topic: Topic,
  title: string,
  gradeLevel: GradeLevel
): Promise<string> {
  const personality = getPersonality(characterId);
  return generatePortraitImage(personality, topic, title, gradeLevel);
}
