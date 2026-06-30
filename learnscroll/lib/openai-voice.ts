import { buildCharacterSystemPrompt, type VoiceTurn } from "./gemini";
import { getPersonality } from "./personalities";
import type { AICharacter, GradeLevel, Topic } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type OpenAIOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

export function openAIVoiceEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export type VoiceCharacter = AICharacter & {
  voiceGender?: "male" | "female" | "neutral";
  voicePitch?: number;
  voiceRate?: number;
};

function textFromResponse(data: OpenAIResponse): string {
  if (data.output_text?.trim()) return data.output_text.trim();

  const text =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n")
      .trim() ?? "";

  return text;
}

function compactTranscript(transcript: string): string {
  const clean = transcript.replace(/\s+/g, " ").trim();
  if (clean.length <= 900) return clean;
  return `${clean.slice(0, 700)} ... ${clean.slice(-180)}`;
}

export async function generateOpenAICharacterReply(
  characterId: string,
  question: string,
  context: {
    title: string;
    transcript: string;
    gradeLevel: GradeLevel;
    topics: Topic[];
    character?: VoiceCharacter;
  },
  history: VoiceTurn[] = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const fallback = getPersonality(characterId);
  const character = context.character ?? fallback;
  const subjects = character.subjects.length
    ? character.subjects.join(", ")
    : context.topics.length
      ? context.topics.join(", ")
      : fallback.subjects.join(", ");
  const era =
    character.era && character.era !== "Historical era"
      ? character.era
      : fallback.era;
  const messages = [
    ...history.slice(-4).map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.text,
    })),
    {
      role: "user",
      content: [
        `The student spoke this question through a microphone: "${question}"`,
        "Reply for natural voice playback. Answer directly in 1-2 short sentences unless the student explicitly asks for more detail.",
      ].join("\n\n"),
    },
  ];
  const systemPrompt = buildCharacterSystemPrompt(
    character.name,
    era,
    subjects,
    context.gradeLevel,
    context.title,
    compactTranscript(context.transcript)
  );

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VOICE_MODEL ?? "gpt-4o-mini",
      instructions: `${systemPrompt}\n\nLatency rule: be quick. Prefer one natural explanation, not a lecture.`,
      input: messages,
      temperature: 0.65,
      max_output_tokens: 120,
    }),
  });

  const data = (await res.json()) as OpenAIResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI voice reply failed (${res.status})`);
  }

  const answer = textFromResponse(data);
  if (!answer) throw new Error("OpenAI returned an empty voice reply");
  return answer;
}

export function openAITtsVoiceForCharacter(
  character: Pick<AICharacter, "id"> & { voiceGender?: "male" | "female" | "neutral" }
): string {
  if (character.id === "shakespeare") return "fable";
  if (character.id === "sunny") return "shimmer";
  if (character.voiceGender === "female") return "nova";
  if (character.voiceGender === "male") return "onyx";
  return "alloy";
}

export function openAITtsInstructionsForCharacter(
  character: Pick<AICharacter, "id" | "name" | "era"> & {
    voiceGender?: "male" | "female" | "neutral";
  }
): string {
  const base = `Speak as ${character.name}${character.era ? ` from ${character.era}` : ""}, tutoring one student in a natural back-and-forth conversation. Stay warm, human, and concise.`;

  switch (character.id) {
    case "shakespeare":
      return `${base} Use vivid Elizabethan color lightly, but keep every sentence easy for a modern student to follow.`;
    case "sunny":
    case "einstein-cartoon":
      return `${base} Sound bright, playful, and kid-friendly without becoming silly or squeaky.`;
    case "curie":
    case "hypatia":
    case "cleopatra":
      return `${base} Use a confident, calm, encouraging delivery.`;
    case "newton":
    case "aristotle":
      return `${base} Use a reflective mentor tone with measured curiosity.`;
    default:
      return `${base} Let the personality come through in cadence and emphasis, not by overacting.`;
  }
}
