"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ContentItem } from "@/lib/types";
import { topicPastels } from "@/lib/tokens";
import { speakAsCharacter, stopCharacterSpeech } from "@/lib/character-voice";
import { CharacterSvgAvatar } from "./CharacterSvgAvatar";
import { cn } from "./ui/cn";

interface ReelSlideProps {
  item: ContentItem;
  priority?: boolean;
  saved: boolean;
  onSave: () => void;
  onVoice: () => void;
}

const GRADE_LABELS: Record<string, string> = {
  "K-5": "K–5",
  "6-8": "6–8",
  "9-12": "9–12",
  college: "College",
  graduate: "Grad",
};

function ActionButton({
  label,
  onClick,
  active,
  variant = "default",
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  variant?: "default" | "primary" | "saved";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      aria-label={label}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-all",
          variant === "primary" && "bg-pastel-lilac text-pastel-ink",
          variant === "saved" && "bg-pastel-mint text-pastel-ink",
          variant === "default" && "bg-white/85 text-pastel-ink backdrop-blur-sm",
          active && variant === "default" && "ring-2 ring-pastel-mint"
        )}
      >
        {children}
      </div>
      <span className="text-[9px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">{label}</span>
    </button>
  );
}

function PersonalityMedia({
  item,
  containerRef,
}: {
  item: ContentItem;
  containerRef: React.RefObject<HTMLElement | null>;
  priority?: boolean;
}) {
  const [isInView, setIsInView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const spokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    const section = containerRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.6);
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [containerRef]);

  // Auto-narrate when the slide scrolls into view; lip-sync via callbacks
  useEffect(() => {
    if (!isInView) {
      if (spokenIdRef.current === item.id) {
        stopCharacterSpeech();
        spokenIdRef.current = null;
        setIsSpeaking(false);
      }
      return;
    }
    if (spokenIdRef.current === item.id) return;

    const timer = window.setTimeout(() => {
      spokenIdRef.current = item.id;
      speakAsCharacter(item.transcript, item.character, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isInView, item.id, item.transcript, item.character]);

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: item.thumbnailColor }}
      >
        {/* Lip-syncing SVG avatar — moves its mouth while narrating */}
        <CharacterSvgAvatar
          personalityId={item.character.id}
          personalityName={item.character.name}
          isSpeaking={isSpeaking}
        />
      </div>

      {/* Subtle dark scrim at bottom — no white wash */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/45 to-transparent" />

      {isSpeaking && (
        <div className="absolute bottom-[12rem] left-1/2 z-10 flex -translate-x-1/2 items-end gap-[3px]">
          {[5, 10, 14, 11, 16, 8, 13, 9, 6, 15, 10, 5].map((h, i) => (
            <div
              key={i}
              className="w-[2px] rounded-full bg-white/80 wave-bar animate-waveform"
              style={{ height: h, animationDelay: `${i * 0.07}s` }}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ReelSlide({ item, priority, saved, onSave, onVoice }: ReelSlideProps) {
  const topic = item.topics[0];
  const topicColor = topicPastels[topic] ?? { bg: "#EDE4FF", text: "#9B7FD4" };
  const sectionRef = useRef<HTMLElement>(null);
  const [captionOpen, setCaptionOpen] = useState(false);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-pastel-cream"
    >
      <PersonalityMedia item={item} containerRef={sectionRef} priority={priority} />

      {/* Minimal top pills */}
      <div className="absolute left-4 top-[7rem] z-10">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
          style={{ background: `${item.character.color}CC`, color: "#4A4458" }}
        >
          {item.character.name}
        </span>
      </div>
      <div className="absolute right-4 top-[7rem] z-10 flex flex-col items-end gap-1.5">
        {item.generated && (
          <span className="rounded-full bg-pastel-mint/90 px-2.5 py-1 text-[10px] font-semibold text-pastel-ink backdrop-blur-sm">
            AI fresh
          </span>
        )}
        <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {Math.round(item.qualityScore * 100)}% verified
        </span>
      </div>

      {/* Caption — floats directly on the portrait, no card background */}
      <div className="absolute bottom-[5.5rem] left-3 right-[3.75rem] z-10">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm"
            style={{ background: topicColor.bg, color: topicColor.text }}
          >
            {topic}
          </span>
          <span className="text-[11px] font-medium text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">
            {GRADE_LABELS[item.gradeLevel]}
          </span>
        </div>
        <h2 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]">
          {item.title}
        </h2>

        <button
          type="button"
          onClick={() => setCaptionOpen((open) => !open)}
          className="mt-2 w-full text-left"
          aria-expanded={captionOpen}
        >
          <p
            className={cn(
              "text-[13px] leading-[1.55] text-white/92 [text-shadow:0_1px_5px_rgba(0,0,0,0.6)]",
              !captionOpen && "line-clamp-1"
            )}
          >
            {item.transcript}
          </p>
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-white/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
            {captionOpen ? "Show less" : "Read more"}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className={cn("transition-transform", captionOpen && "rotate-180")}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>
      </div>

      {/* Pastel action rail */}
      <div className="absolute bottom-[6.5rem] right-3 z-20 flex flex-col items-center gap-4">
        <ActionButton
          label={saved ? "Saved" : "Save"}
          onClick={onSave}
          variant={saved ? "saved" : "default"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
          </svg>
        </ActionButton>

        <Link href={`/quiz?contentId=${item.id}`} className="flex flex-col items-center gap-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-pastel-ink backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            </svg>
          </div>
          <span className="text-[9px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">Quiz</span>
        </Link>

        <ActionButton label="Talk" onClick={onVoice} variant="primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
          </svg>
        </ActionButton>
      </div>
    </section>
  );
}
