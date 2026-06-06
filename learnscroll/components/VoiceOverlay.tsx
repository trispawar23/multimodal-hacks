"use client";

import { useState, useEffect, useRef } from "react";
import type { ContentItem } from "@/lib/types";
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

  if (!content) return null;

  // content is guaranteed non-null from here on
  const char = content.character;

  async function handleMicToggle() {
    if (isListening) {
      setIsListening(false);
      // Capture stable references for the async closure
      const currentContent = content!;
      const currentChar = char;
      // Simulate user asking a question
      const question = "Can you explain this concept more simply?";
      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setIsThinking(true);

      // Call voice API endpoint
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
    <div className="fixed top-0 bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden bg-[#0d0d10]/95 backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-5 pt-12 pb-3">
        <div>
          <p className="text-xs text-zinc-500">Talking with</p>
          <h2 className="text-lg font-bold text-white">{char.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: char.color }}>
            {char.subjects.join(", ")} · {char.era}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[#1e1e26] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Avatar + waveform */}
      <div className="flex flex-shrink-0 flex-col items-center gap-3 py-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2"
          style={{ background: `${char.color}22`, borderColor: char.color }}
        >
          {char.initial}
        </div>

        {/* Waveform — animated when listening */}
        <div className="flex items-center gap-[3px] h-10">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full wave-bar",
                isListening ? "animate-waveform" : "opacity-30"
              )}
              style={{
                height: isListening ? h : h * 0.4,
                background: char.color,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>

        {isThinking && (
          <p className="text-xs text-zinc-500 animate-pulse">
            {char.name.split(" ")[0]} is pondering...
          </p>
        )}
      </div>

      {/* Context card */}
      <div className="mx-5 mb-3 flex-shrink-0 bg-[#16161c] border border-[#2a2a38] rounded-xl px-4 py-3">
        <p className="text-[11px] text-zinc-500 mb-1">Currently discussing:</p>
        <p className="text-[13px] text-zinc-200 font-medium leading-snug line-clamp-2">
          {content.title}
        </p>
      </div>

      {/* Chat transcript */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600 pt-4">
            Tap the mic to ask {char.name.split(" ")[0]} anything about this topic.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl px-4 py-3 max-w-[90%]",
              msg.role === "user"
                ? "ml-auto bg-brand-500/20 border border-brand-500/30"
                : "mr-auto bg-[#16161c] border border-[#2a2a38]"
            )}
          >
            {msg.role === "character" && (
              <p className="text-[10px] font-semibold mb-1" style={{ color: char.color }}>
                {char.name}
              </p>
            )}
            <p className="text-[13px] text-zinc-200 leading-relaxed">{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Mic button + disclaimer */}
      <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t border-[#2a2a38] bg-[#0d0d10]/95 px-5 pb-8 pt-3">
        <p className="text-[10px] text-zinc-600 text-center">AI character — always verify with your instructor</p>
        <button
          onClick={handleMicToggle}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            isListening
              ? "scale-110 border-2"
              : "bg-brand-500 hover:bg-brand-600"
          )}
          style={isListening ? { borderColor: char.color, background: `${char.color}22` } : undefined}
        >
          {isListening ? (
            <div className="w-5 h-5 rounded-sm bg-white" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </button>
        <p className="text-xs text-zinc-500">{isListening ? "Tap to stop" : "Tap to speak"}</p>
      </div>
    </div>
  );
}
