"use client";

/**
 * VoiceOverlay — upgraded with features from Luminary interactive-avatar-system:
 *
 *  • Real Web Speech API recognition (SpeechRecognition / webkitSpeechRecognition)
 *  • Gemini TTS via /api/speak (prebuilt voices: Kore, Zephyr, Puck, Charon, Fenrir)
 *  • Browser speechSynthesis fallback when Gemini TTS is unavailable or offline
 *  • CharacterSvgAvatar with biological eye-blinking + lip-sync mouth animation
 *  • Keyboard fallback input panel
 *  • Suggested questions based on content topic
 *  • Audio mute toggle
 */

import { useState, useEffect, useRef } from "react";
import type { ContentItem } from "@/lib/types";
import { CharacterSvgAvatar } from "./CharacterSvgAvatar";
import { cn } from "./ui/cn";
import { getPersonality } from "@/lib/personalities";
import { stopCharacterSpeech } from "@/lib/character-voice";

interface VoiceOverlayProps {
  content: ContentItem | null;
  onClose: () => void;
}

interface Message {
  role: "user" | "character";
  text: string;
}

// Suggested questions keyed by topic
const TOPIC_QUESTIONS: Record<string, string[]> = {
  physics:      ["Can you explain this more simply?", "What's a real-world example?", "What does this mean for everyday life?"],
  math:         ["Walk me through the steps again?", "Why does this formula work?", "When would I use this?"],
  chemistry:    ["What makes this reaction special?", "Is this dangerous in real life?", "How did scientists discover this?"],
  biology:      ["How does this work in humans?", "What happens if this process fails?", "Can you give an example in nature?"],
  history:      ["Why did this event matter so much?", "Could things have gone differently?", "How does this affect us today?"],
  literature:   ["What was the author really trying to say?", "Can you explain the symbolism?", "Why is this story still relevant?"],
  engineering:  ["How is this built in practice?", "What problems does this solve?", "What are the limitations?"],
  philosophy:   ["How would you argue the opposite?", "Can you give a concrete example?", "Why does this question matter?"],
};

const DEFAULT_QUESTIONS = [
  "Can you explain this concept more simply?",
  "Give me a real-world example.",
  "What's the most important thing to remember?",
];

// Status phrase based on current state
function getStatusPhrase(
  isRecording: boolean,
  isThinking: boolean,
  isSpeaking: boolean,
  characterFirstName: string
): string {
  if (isRecording) return "Listening…";
  if (isThinking) return `${characterFirstName} is thinking…`;
  if (isSpeaking) return `${characterFirstName} is speaking…`;
  return "Tap the mic to ask anything";
}

export function VoiceOverlay({ content, onClose }: VoiceOverlayProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const char = content?.character;
  // Resolve full personality for voice tuning (pitch/rate)
  const personality = char ? getPersonality(char.id) : undefined;

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init SpeechRecognition
  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) return;
    setSpeechSupported(true);

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsRecording(true);
      setErrorMsg("");
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn("Speech recognition error:", e.error);
      setErrorMsg(`Mic error: ${e.error}. Try typing instead.`);
      setIsRecording(false);
    };
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognitionRef.current = rec;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence any feed narration playing behind the overlay, and clean up on unmount
  useEffect(() => {
    stopCharacterSpeech();
    return () => {
      stopSpeaking();
    };
  }, []);

  if (!content || !char) return null;

  const charFirstName = char.name.split(" ")[0];
  const suggestedQuestions =
    TOPIC_QUESTIONS[content.topics[0]] ?? DEFAULT_QUESTIONS;
  const voiceName = char?.voiceName ?? personality?.voiceName ?? "Zephyr";

  // ─── Speech control ────────────────────────────────────────────────────────

  function stopSpeaking() {
    setIsSpeaking(false);
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
  }

  /**
   * Attempts Gemini TTS via /api/speak.
   * Falls back to browser Web Speech API on any failure.
   */
  async function speakText(text: string) {
    if (!audioEnabled || !text.trim()) return;
    stopSpeaking();
    setIsSpeaking(true);

    // Strip markdown so TTS doesn't read symbol noise
    const clean = text.replace(/[*#_~`[\]()>]/g, "");

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voiceName }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioData) {
          const bytes = Uint8Array.from(atob(data.audioData), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: "audio/mp3" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => setIsSpeaking(false);
          await audio.play();
          return; // success — exit early
        }
      }
      throw new Error("Gemini TTS unavailable");
    } catch {
      // ── Browser speechSynthesis fallback ──────────────────────────────────
      console.log("Gemini TTS unavailable — using browser speechSynthesis");
      if (!("speechSynthesis" in window)) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);

      // Tune pitch/rate from personality if available
      utterance.pitch = personality?.voicePitch ?? 1;
      utterance.rate = personality?.voiceRate ?? 1;

      // Pick a voice matching the character's gender
      const voices = window.speechSynthesis.getVoices();
      const gender = personality?.voiceGender ?? "neutral";
      const en = voices.filter((v) => v.lang.startsWith("en"));
      const female = en.find((v) => /female|samantha|karen|victoria|zira|fiona/i.test(v.name));
      const male = en.find((v) => /male|daniel|alex|fred|david|tom|james/i.test(v.name));
      const kid = en.find((v) => /junior|child|kathy/i.test(v.name));

      const picked =
        gender === "female" ? female ?? en[0] :
        gender === "neutral" ? kid ?? female ?? en[0] :
        male ?? en[0];

      if (picked) utterance.voice = picked;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ─── Mic toggle ───────────────────────────────────────────────────────────

  function toggleRecording() {
    if (!speechSupported) {
      setErrorMsg("Voice recognition not supported in this browser. Use the keyboard instead.");
      setShowKeyboard(true);
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      stopSpeaking();
      setErrorMsg("");
      recognitionRef.current?.start();
    }
  }

  // ─── Send message ─────────────────────────────────────────────────────────

  async function sendMessage(text?: string) {
    const raw = (text ?? inputText).trim();
    if (!raw || isThinking) return;
    setInputText("");
    setErrorMsg("");
    stopSpeaking();

    setMessages((prev) => [...prev, { role: "user", text: raw }]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: content.id,
          characterId: char.id,
          question: raw,
          transcript: content.transcript,
        }),
      });

      const data = await res.json();
      const answer: string =
        data.answer ??
        `${charFirstName} here — that's a great question! ${content.transcript.split(".")[0].toLowerCase()}.`;

      setMessages((prev) => [...prev, { role: "character", text: answer }]);
      speakText(answer);
    } catch {
      const fallback = `My apologies — I seem to have lost my train of thought. Please try again.`;
      setMessages((prev) => [...prev, { role: "character", text: fallback }]);
    } finally {
      setIsThinking(false);
    }
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const statusPhrase = getStatusPhrase(isRecording, isThinking, isSpeaking, charFirstName);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0B] text-white animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0F0F12] flex-shrink-0">
        <button
          onClick={() => { stopSpeaking(); onClose(); }}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-[12px] font-semibold text-white tracking-wide">Voice Q&A</p>
          <p className={cn(
            "text-[9px] font-mono tracking-widest uppercase",
            isRecording ? "text-rose-400 animate-pulse" :
            isSpeaking ? "text-emerald-400 animate-pulse" :
            "text-pastel-lilac/70"
          )}>
            {isRecording ? "● LIVE" : isSpeaking ? "● SPEAKING" : "● READY"}
          </p>
        </div>

        {/* Mute toggle */}
        <button
          onClick={() => { if (audioEnabled) stopSpeaking(); setAudioEnabled((v) => !v); }}
          className={cn(
            "p-2 rounded-lg transition",
            audioEnabled ? "text-pastel-lilac hover:bg-white/5" : "text-slate-600 hover:bg-white/5"
          )}
          aria-label={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Error bar ── */}
      {errorMsg && (
        <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-500/20 text-rose-400 text-[11px] flex-shrink-0">
          {errorMsg}
        </div>
      )}

      {/* ── Central avatar + status ── */}
      <div className="flex flex-col items-center gap-4 py-6 flex-shrink-0 px-4">
        {/* Orbit rings */}
        <div className="relative flex items-center justify-center">
          <div className={cn(
            "absolute w-44 h-44 rounded-full border border-dashed",
            isRecording ? "border-rose-400/40 animate-[spin_4s_linear_infinite]" :
            isSpeaking ? "border-pastel-lilac/30 animate-[spin_8s_linear_infinite]" :
            "border-white/10 animate-[spin_20s_linear_infinite]"
          )} />

          {/* Avatar bubble */}
          <div className={cn(
            "w-36 h-36 rounded-full p-1 bg-black/60 relative overflow-hidden transition-all duration-500 shadow-2xl",
            isRecording && "ring-4 ring-rose-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]",
            isSpeaking && "ring-4 ring-pastel-lilac/40 shadow-[0_0_25px_rgba(196,181,253,0.3)]",
            isThinking && "ring-4 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
            !isRecording && !isSpeaking && !isThinking && "ring-2 ring-white/10"
          )}>
            <div className="w-full h-full rounded-full overflow-hidden">
              <CharacterSvgAvatar
                personalityId={char.id}
                personalityName={char.name}
                isSpeaking={isSpeaking}
              />
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
            {statusPhrase}
          </p>
          <p className="text-[13px] font-medium text-white mt-0.5">{char.name}</p>
          <p className="text-[10px] text-slate-500 capitalize">{char.subjects.join(", ")} · {char.era}</p>
        </div>

        {/* Content card */}
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-slate-500 mb-1">Discussing</p>
          <p className="text-[13px] font-medium text-white line-clamp-2 leading-snug">{content.title}</p>
        </div>
      </div>

      {/* ── Chat transcript ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <p className="text-center text-[12px] text-slate-500 pt-2">
            Ask {charFirstName} anything about this topic.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3",
              msg.role === "user"
                ? "ml-auto bg-pastel-lilac/20 border border-pastel-lilac/20"
                : "mr-auto bg-white/8 border border-white/10"
            )}
          >
            {msg.role === "character" && (
              <p className="text-[10px] font-semibold text-pastel-lilac mb-1">{char.name}</p>
            )}
            <p className="text-[13px] leading-relaxed text-white/90">{msg.text}</p>
          </div>
        ))}
        {isThinking && (
          <div className="mr-auto bg-white/8 border border-white/10 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold text-pastel-lilac mb-1">{char.name}</p>
            <div className="flex gap-1 items-center h-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-pastel-lilac animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Suggested question chips ── */}
      <div className="flex-shrink-0 px-4 py-2 flex flex-wrap gap-1.5 justify-center">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => sendMessage(q)}
            disabled={isThinking || isRecording}
            className="text-[10px] bg-white/5 hover:bg-pastel-lilac/10 border border-white/10 hover:border-pastel-lilac/30 rounded-full px-3 py-1.5 transition text-slate-400 hover:text-pastel-lilac disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Bottom controls ── */}
      <div className="flex-shrink-0 border-t border-white/10 bg-[#0F0F12] px-4 pb-8 pt-3 flex flex-col gap-2.5">
        {/* Keyboard input (collapsible) */}
        {showKeyboard && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask ${charFirstName} anything…`}
              disabled={isThinking || isRecording}
              className="flex-1 bg-black/40 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:border-pastel-lilac/50 focus:outline-none transition placeholder:text-slate-600"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputText.trim() || isThinking}
              className={cn(
                "p-2.5 rounded-xl transition",
                inputText.trim() && !isThinking
                  ? "bg-pastel-lilac text-pastel-ink hover:bg-pastel-lilac/90"
                  : "bg-white/5 text-slate-600 cursor-not-allowed"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Keyboard toggle */}
          <button
            onClick={() => setShowKeyboard((v) => !v)}
            className={cn(
              "p-2.5 rounded-full border transition flex-shrink-0",
              showKeyboard
                ? "bg-pastel-lilac/10 border-pastel-lilac/25 text-pastel-lilac"
                : "border-white/10 text-slate-500 hover:text-white hover:bg-white/5"
            )}
            aria-label="Toggle keyboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
          </button>

          {/* Primary mic button */}
          <button
            onClick={toggleRecording}
            disabled={isThinking}
            className={cn(
              "flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition font-mono text-xs font-bold tracking-widest relative",
              isRecording
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-pastel-lilac text-pastel-ink hover:bg-pastel-lilac/90 active:scale-95",
              isThinking && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                </svg>
                TAP TO STOP
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                SPEAK TO {charFirstName.toUpperCase()}
              </>
            )}
            {isRecording && (
              <div className="absolute -inset-1 border border-rose-400 rounded-2xl animate-ping opacity-50" />
            )}
          </button>

          {/* Stop speaking */}
          <button
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            className={cn(
              "p-2.5 rounded-full border transition flex-shrink-0",
              isSpeaking
                ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                : "border-white/5 text-slate-700 cursor-not-allowed"
            )}
            aria-label="Stop speaking"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </button>
        </div>

        <p className="text-center text-[9px] text-slate-600">
          AI tutor character — verify key facts with your instructor
        </p>
      </div>
    </div>
  );
}
