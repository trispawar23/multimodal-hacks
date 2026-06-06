"use client";

import { useState, useEffect, useRef } from "react";
import type { ContentItem } from "@/lib/types";
import { speakAsCharacter, stopCharacterSpeech } from "@/lib/character-voice";
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

export function VoiceOverlay({ content, onClose }: VoiceOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => stopCharacterSpeech();
  }, []);

  if (!content) return null;

  const char = content.character;

  async function handleMicToggle() {
    if (isListening) {
      setIsListening(false);
      const currentContent = content!;
      const currentChar = char;
      const question = "Can you explain this concept more simply?";
      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setIsThinking(true);

      try {
        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId: currentContent.id,
            characterId: currentChar.id,
            question,
            transcript: currentContent.transcript,
          }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "character", text: data.answer ?? "I'm pondering that question..." },
        ]);
        if (data.answer) {
          speakAsCharacter(data.answer, currentChar);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "character", text: "My apologies — it seems the connection was lost. Please try again." },
        ]);
      } finally {
        setIsThinking(false);
      }
    } else {
      setIsListening(true);
    }
  }

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
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-pastel-muted transition-colors hover:text-pastel-ink"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.posterUrl}
            alt={char.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex h-8 items-center gap-[3px]">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={cn("w-[3px] rounded-full wave-bar", isListening ? "animate-waveform" : "opacity-40")}
              style={{
                height: isListening ? h : h * 0.35,
                background: char.color,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>

        {isThinking && (
          <p className="animate-pulse text-xs text-pastel-muted">
            {char.name.split(" ")[0]} is thinking...
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
        {messages.length === 0 && (
          <p className="pt-4 text-center text-sm text-pastel-muted">
            Tap the mic to ask {char.name.split(" ")[0]} anything.
          </p>
        )}
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

      <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t border-surface-border bg-white/80 px-5 pb-8 pt-3">
        <p className="text-center text-[10px] text-pastel-muted">AI teacher — verify with your instructor</p>
        <button
          onClick={handleMicToggle}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-all",
            isListening ? "scale-105 bg-pastel-peach" : "bg-pastel-lilac"
          )}
        >
          {isListening ? (
            <div className="h-4 w-4 rounded-sm bg-pastel-ink" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A4458" strokeWidth={2} strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
            </svg>
          )}
        </button>
        <p className="text-xs text-pastel-muted">{isListening ? "Tap to stop" : "Tap to speak"}</p>
      </div>
    </div>
  );
}
