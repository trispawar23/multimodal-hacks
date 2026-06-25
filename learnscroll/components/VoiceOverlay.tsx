"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentItem } from "@/lib/types";
import { speakAsCharacter, stopCharacterSpeech } from "@/lib/character-voice";
import { readFeedMuted } from "@/lib/feed-audio";
import { playCharacterVoice, stopAllCharacterSpeech } from "@/lib/voice-playback";
import { isSpeechInputSupported, listenForSpeech } from "@/lib/speech-input";
import { cn } from "./ui/cn";

interface VoiceOverlayProps {
  content: ContentItem | null;
  onClose: () => void;
}

interface Message {
  role: "user" | "character";
  text: string;
}

const WAVE_HEIGHTS = [10, 20, 28, 24, 32, 18, 26, 22, 14, 30, 20, 12, 24];

function suggestedQuestions(content: ContentItem): string[] {
  const topic = content.topics[0] ?? "this subject";
  return [
    "Explain this more simply",
    `Tell me about your life`,
    `What should I remember about ${topic}?`,
    `What surprised you in your work?`,
  ];
}

export function VoiceOverlay({ content, onClose }: VoiceOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const char = content?.character;
  const portraitSrc = content?.aiPosterUrl || content?.posterUrl;
  const speechSupported = isSpeechInputSupported();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!content) return;

    const character = content.character;
    const greeting = `Hello! I'm ${character.name}. Ask me anything about ${content.topics[0] ?? "this lesson"}, my life, or my discoveries.`;
    setMessages([{ role: "character", text: greeting }]);
    setInput("");
    setInterimText("");

    if (!readFeedMuted()) {
      void playCharacterVoice(greeting, character, { force: true });
    }

    return () => {
      stopListenRef.current?.();
      stopAllCharacterSpeech();
    };
  }, [content]);

  const sendQuestion = useCallback(
    async (question: string) => {
      if (!content || !char || !question.trim() || isThinking) return;

      const trimmed = question.trim();
      setInput("");
      setInterimText("");
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setIsThinking(true);
      stopAllCharacterSpeech();

      try {
        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: char.id,
            question: trimmed,
            title: content.title,
            transcript: content.transcript,
            gradeLevel: content.gradeLevel,
            topics: content.topics,
            history: prior,
          }),
        });

        const data = (await res.json()) as { answer?: string; error?: string };
        const answer =
          data.answer ??
          "My apologies — I lost my train of thought. Could you ask again?";

        setMessages((prev) => [...prev, { role: "character", text: answer }]);
        await playCharacterVoice(answer, char, {
          force: true,
          gradeLevel: content.gradeLevel,
        });
      } catch {
        const answer = "The connection faltered. Please try your question once more.";
        setMessages((prev) => [...prev, { role: "character", text: answer }]);
        speakAsCharacter(answer, char, { force: true });
      } finally {
        setIsThinking(false);
      }
    },
    [content, char, isThinking]
  );

  function handleMicToggle() {
    if (isListening) {
      stopListenRef.current?.();
      stopListenRef.current = null;
      setIsListening(false);
      setInterimText("");
      return;
    }

    setIsListening(true);
    setInterimText("");

    stopListenRef.current = listenForSpeech({
      onInterim: (text) => setInterimText(text),
      onFinal: (text) => {
        setInput(text);
        setInterimText("");
        void sendQuestion(text);
      },
      onError: () => setInterimText(""),
      onEnd: () => {
        setIsListening(false);
        stopListenRef.current = null;
      },
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendQuestion(input);
  }

  if (!content || !char) return null;

  const suggestions = suggestedQuestions(content);
  const displayInput = interimText || input;

  return (
    <div className="fixed top-0 bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden bg-pastel-cream/98 backdrop-blur-xl animate-fade-in">
      <div className="flex flex-shrink-0 items-center justify-between px-5 pt-12 pb-3">
        <div>
          <p className="text-xs text-pastel-muted">Talking with</p>
          <h2 className="text-lg font-semibold text-pastel-ink">{char.name}</h2>
          <p className="mt-0.5 text-xs capitalize text-pastel-muted">
            {char.subjects.join(", ")} · {char.era}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-pastel-muted transition-colors hover:text-pastel-ink"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-shrink-0 flex-col items-center gap-3 py-3">
        <div
          className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white"
          style={{ boxShadow: `0 0 0 3px ${char.color}` }}
        >
          {portraitSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={portraitSrc} alt={char.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xl font-semibold text-pastel-ink"
              style={{ background: char.color }}
            >
              {char.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex h-8 items-center gap-[3px]">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full wave-bar",
                isListening || isThinking ? "animate-waveform" : "opacity-40"
              )}
              style={{
                height: isListening || isThinking ? h : h * 0.35,
                background: char.color,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>

        {isListening && (
          <p className="text-xs text-pastel-muted">Listening…</p>
        )}
        {isThinking && (
          <p className="animate-pulse text-xs text-pastel-muted">
            {char.name.split(" ")[0]} is thinking…
          </p>
        )}
      </div>

      <div className="mx-5 mb-3 flex-shrink-0 rounded-2xl bg-white px-4 py-3">
        <p className="mb-1 text-[11px] text-pastel-muted">Currently discussing</p>
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-pastel-ink">
          {content.title}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 no-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[90%] rounded-2xl px-4 py-3",
              msg.role === "user"
                ? "ml-auto bg-pastel-lilac/60"
                : "mr-auto bg-white"
            )}
          >
            {msg.role === "character" && (
              <p className="mb-1 text-[10px] font-semibold text-pastel-ink">{char.name}</p>
            )}
            <p className="text-[13px] leading-relaxed text-pastel-ink">{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2 border-t border-surface-border bg-white/80 px-5 pb-8 pt-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isThinking}
              onClick={() => void sendQuestion(q)}
              className="flex-shrink-0 rounded-full bg-pastel-lilac/50 px-3 py-1 text-[10px] font-medium text-pastel-ink transition-opacity disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={displayInput}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${char.name.split(" ")[0]} anything…`}
            disabled={isThinking}
            className="min-h-[44px] flex-1 rounded-full border border-surface-border bg-white px-4 text-[13px] text-pastel-ink outline-none placeholder:text-pastel-muted focus:border-pastel-lilac disabled:opacity-50"
          />
          {speechSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isThinking}
              aria-label={isListening ? "Stop listening" : "Speak question"}
              className={cn(
                "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40",
                isListening ? "bg-pastel-peach scale-105" : "bg-pastel-lilac"
              )}
            >
              {isListening ? (
                <div className="h-4 w-4 rounded-sm bg-pastel-ink" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A4458" strokeWidth={2} strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                </svg>
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-pastel-mint text-pastel-ink transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>

        <p className="text-center text-[10px] text-pastel-muted">
          AI teacher — verify facts with your instructor
        </p>
      </div>
    </div>
  );
}
