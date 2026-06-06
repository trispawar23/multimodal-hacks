"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ContentItem } from "@/lib/types";
import { cn } from "./ui/cn";

interface ReelSlideProps {
  item: ContentItem;
  saved: boolean;
  onSave: () => void;
  onVoice: () => void;
}

const GRADE_LABELS: Record<string, string> = {
  "K-5": "Gr K–5",
  "6-8": "Gr 6–8",
  "9-12": "Gr 9–12",
  college: "College",
  graduate: "Grad",
};

function ActionButton({
  label,
  onClick,
  active,
  primary,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
      aria-label={label}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-all",
          primary
            ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
            : active
            ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/40"
            : "bg-black/35 text-white backdrop-blur-sm ring-1 ring-white/15"
        )}
      >
        {children}
      </div>
      <span className="text-[10px] font-medium text-white/90 drop-shadow">{label}</span>
    </button>
  );
}

function ReelMedia({
  item,
  containerRef,
}: {
  item: ContentItem;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const section = containerRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        setIsInView(visible);

        const video = videoRef.current;
        if (!video || videoFailed || !item.videoUrl || item.talkingPortrait) return;

        if (visible) {
          video.play().then(() => setIsPlaying(true)).catch(() => setVideoFailed(true));
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [item.videoUrl, item.talkingPortrait, videoFailed, containerRef]);

  const showVideo = item.videoUrl && !videoFailed && !item.talkingPortrait;
  const isTalking = item.talkingPortrait && isInView;

  if (item.talkingPortrait) {
    return (
      <>
        <div className="absolute inset-0 overflow-hidden bg-[#0a1628]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.posterUrl}
            alt={`${item.character.name} AI character`}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-[center_18%]",
              isTalking && "talking-portrait-active"
            )}
            draggable={false}
          />
          {/* Mouth-region glow simulating speech */}
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-[42%] h-8 w-14 -translate-x-1/2 rounded-full bg-white/20 blur-md",
              isTalking && "talking-mouth-glow"
            )}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75" />

        {/* AI Character badge */}
        <div className="absolute left-4 top-[9.5rem] z-10 flex items-center gap-1.5 rounded-full bg-violet-500/25 px-2.5 py-1 ring-1 ring-violet-400/40 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-violet-200">
            AI Character
          </span>
        </div>

        {/* Mini waveform while talking */}
        {isTalking && (
          <div className="absolute bottom-[11.5rem] left-1/2 z-10 flex -translate-x-1/2 items-end gap-[3px]">
            {[6, 12, 18, 14, 22, 10, 16, 12, 8, 20, 14, 6].map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-white/70 wave-bar animate-waveform"
                style={{ height: h, animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Poster / image fallback — always present under video */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.posterUrl}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          showVideo && isPlaying ? "opacity-0" : "opacity-100"
        )}
        draggable={false}
      />

      {showVideo && (
        <video
          ref={videoRef}
          src={item.videoUrl}
          poster={item.posterUrl}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Subtle vignette so overlays stay readable */}
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Live indicator when video is playing */}
      {showVideo && isPlaying && (
        <div className="absolute right-4 top-[9.5rem] z-10 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-white/90">
            {item.platform}
          </span>
        </div>
      )}
    </>
  );
}

export function ReelSlide({ item, saved, onSave, onVoice }: ReelSlideProps) {
  const topic = item.topics[0];
  const sectionRef = useRef<HTMLElement>(null);
  const [captionOpen, setCaptionOpen] = useState(false);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-black"
    >
      <ReelMedia item={item} containerRef={sectionRef} />

      {/* Character badge — hidden for AI talking portrait (has its own overlay) */}
      {!item.talkingPortrait && (
        <div className="absolute left-4 top-[7.5rem] z-10 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/20"
            style={{ background: item.character.color }}
          >
            {item.character.initial}
          </div>
          <div>
            <p className="text-sm font-semibold text-white drop-shadow-md">{item.character.name}</p>
            <p className="text-[11px] text-white/75 drop-shadow">{GRADE_LABELS[item.gradeLevel]}</p>
          </div>
        </div>
      )}

      <div className={cn("absolute right-4 z-10", item.talkingPortrait ? "top-[7.5rem]" : "top-[7.5rem]")}>
        <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-green-400 ring-1 ring-green-400/30 backdrop-blur-sm">
          {Math.round(item.qualityScore * 100)}% real
        </span>
      </div>

      {/* Bottom caption — title always visible; description on demand */}
      <div className="absolute bottom-24 left-4 right-[4.5rem] z-10">
        {item.talkingPortrait && (
          <p className="mb-1 text-[11px] font-semibold text-violet-300">
            {item.character.name} · AI Teacher
          </p>
        )}
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-300">{topic}</p>
        <h2 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-white drop-shadow-md">
          {item.title}
        </h2>

        <button
          type="button"
          onClick={() => setCaptionOpen((open) => !open)}
          className="mt-1.5 w-full text-left"
          aria-expanded={captionOpen}
        >
          {captionOpen ? (
            <p className="text-[12px] leading-relaxed text-white/85 drop-shadow">
              {item.transcript}
            </p>
          ) : (
            <p className="line-clamp-1 text-[12px] leading-relaxed text-white/55 drop-shadow">
              {item.transcript}
            </p>
          )}
          <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-white/60">
            {captionOpen ? "Show less" : "More"}
            <svg
              width="12"
              height="12"
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

        <p className="mt-2 text-[10px] text-white/50">
          {Math.floor(item.durationSec / 60)}:{String(item.durationSec % 60).padStart(2, "0")} ·{" "}
          {(item.viewCount / 1_000_000).toFixed(1)}M views
        </p>
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5">
        <ActionButton label={saved ? "Saved" : "Save"} onClick={onSave} active={saved}>
          {saved ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
            </svg>
          )}
        </ActionButton>

        <Link href={`/quiz?contentId=${item.id}`} className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white ring-1 ring-white/15 backdrop-blur-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-white/90 drop-shadow">Quiz</span>
        </Link>

        <ActionButton label="Voice" onClick={onVoice} primary>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </ActionButton>
      </div>
    </section>
  );
}
