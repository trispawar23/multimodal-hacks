import { NextRequest, NextResponse } from "next/server";

const ALLOWED_VOICES = ["Kore", "Zephyr", "Puck", "Charon", "Fenrir"] as const;
type GeminiVoice = (typeof ALLOWED_VOICES)[number];

/**
 * POST /api/speak
 * Body: { text: string, voiceName?: string }
 *
 * Calls Gemini TTS (gemini-2.5-flash-preview-tts) and returns base64 audio.
 * Returns { fallback: true } with a 500 status when the API is unavailable,
 * so the client can seamlessly fall back to browser speechSynthesis.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, voiceName } = (await req.json()) as {
      text: string;
      voiceName?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured", fallback: true },
        { status: 500 }
      );
    }

    const voice: GeminiVoice = ALLOWED_VOICES.includes(voiceName as GeminiVoice)
      ? (voiceName as GeminiVoice)
      : "Zephyr";

    // Strip markdown so TTS doesn't read symbol noise
    const cleanText = text.replace(/[*#_~`[\]()>]/g, "");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text().catch(() => "unknown");
      console.error("Gemini TTS error:", err);
      return NextResponse.json(
        { error: "Gemini TTS failed", fallback: true },
        { status: 500 }
      );
    }

    const data = await geminiRes.json();
    const base64Audio =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return NextResponse.json(
        { error: "No audio data in Gemini response", fallback: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ audioData: base64Audio });
  } catch (err: unknown) {
    console.error("Speak route error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Speech generation failed",
        fallback: true,
      },
      { status: 500 }
    );
  }
}
