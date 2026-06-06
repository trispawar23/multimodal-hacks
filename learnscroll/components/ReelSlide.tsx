"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ContentItem, PortraitStyle } from "@/lib/types";
import { topicPastels } from "@/lib/tokens";
import { playGeminiVoice, stopGeminiVoice } from "@/lib/gemini-voice-client";
import { speakAsCharacter, stopCharacterSpeech } from "@/lib/character-voice";
import { isSpeechInputSupported, startHoldToSpeak, type HoldToSpeakSession } from "@/lib/speech-input";
import { PortraitLoadingOverlay } from "./PortraitLoadingOverlay";
import { cn } from "./ui/cn";

interface ReelSlideProps {
  item: ContentItem;
  priority?: boolean;
  muted?: boolean;
  saved: boolean;
  onSave: () => void;
  onQuiz?: () => void;
  onToggleMute?: () => void;
  onVisibilityChange?: (id: string, visible: boolean) => void;
}

type TalkPhase = "idle" | "listening" | "thinking" | "answering";

function voiceTimingLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[Luminary:Voice] ${event}`, JSON.stringify(details, null, 2));
}

const PORTRAIT_FOCUS: Record<PortraitStyle, string> = {
  illustration: "object-[center_28%]",
  "3d": "object-center",
  realistic: "object-[center_12%]",
};

const REEL_SHADOW = {
  body: "[text-shadow:0_1px_5px_rgba(0,0,0,0.6)]",
  title: "[text-shadow:0_1px_6px_rgba(0,0,0,0.65)]",
  meta: "[text-shadow:0_1px_4px_rgba(0,0,0,0.5)]",
  label: "[text-shadow:0_1px_3px_rgba(0,0,0,0.55)]",
} as const;

const MOUTH_POSITION: Record<PortraitStyle, string> = {
  illustration: "top-[38%]",
  "3d": "top-[45%]",
  realistic: "top-[40%]",
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

function HoldToTalkButton({
  item,
  muted,
  onPhaseChange,
}: {
  item: ContentItem;
  muted?: boolean;
  onPhaseChange: (phase: TalkPhase) => void;
}) {
  const [phase, setPhase] = useState<TalkPhase>("idle");
  const [interim, setInterim] = useState("");
  const sessionRef = useRef<HoldToSpeakSession | null>(null);
  const historyRef = useRef<{ role: "user" | "character"; text: string }[]>([]);
  const holdingRef = useRef(false);
  const supported = isSpeechInputSupported();

  const setTalkPhase = (next: TalkPhase) => {
    setPhase(next);
    onPhaseChange(next);
  };

  async function releaseHold() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    const releaseAt = performance.now();

    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setInterim("");
      setTalkPhase("idle");
      return;
    }

    const question = await session.stop();
    const transcriptAt = performance.now();
    setInterim("");

    if (!question.trim()) {
      voiceTimingLog("inline.no_transcript", {
        contentId: item.id,
        speechRecognitionMs: Math.round(transcriptAt - releaseAt),
      });
      setTalkPhase("idle");
      return;
    }

    setTalkPhase("thinking");
    stopGeminiVoice();
    stopCharacterSpeech();

    try {
      const prior = historyRef.current;
      voiceTimingLog("inline.question.ready", {
        contentId: item.id,
        characterId: item.character.id,
        questionLength: question.trim().length,
        historyTurns: prior.length,
        speechRecognitionMs: Math.round(transcriptAt - releaseAt),
      });
      const sessionRequestAt = performance.now();
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: item.character.id,
          question: question.trim(),
          title: item.title,
          transcript: item.transcript,
          gradeLevel: item.gradeLevel,
          topics: item.topics,
          history: prior,
        }),
      });
      const sessionResponseAt = performance.now();
      const data = (await res.json()) as { answer?: string };
      const sessionParsedAt = performance.now();
      const answer =
        data.answer ?? "I lost my train of thought — try asking again.";

      historyRef.current = [
        ...prior,
        { role: "user" as const, text: question.trim() },
        { role: "character" as const, text: answer },
      ].slice(-10);

      if (muted) {
        voiceTimingLog("inline.answer.muted", {
          contentId: item.id,
          answerLength: answer.length,
          totalAfterReleaseMs: Math.round(performance.now() - releaseAt),
        });
        setTalkPhase("idle");
        return;
      }

      setTalkPhase("answering");
      const ttsStartAt = performance.now();
      await playGeminiVoice(answer, item.character, {
        onEnd: () => setTalkPhase("idle"),
        fallback: () =>
          speakAsCharacter(answer, item.character, {
            force: true,
            onEnd: () => setTalkPhase("idle"),
          }),
      });
      const ttsReadyAt = performance.now();
      voiceTimingLog("inline.answer.playback_started", {
        contentId: item.id,
        answerLength: answer.length,
        voiceSessionMs: Math.round(sessionResponseAt - sessionRequestAt),
        responseParseMs: Math.round(sessionParsedAt - sessionResponseAt),
        ttsFetchAndStartMs: Math.round(ttsReadyAt - ttsStartAt),
        totalAfterReleaseMs: Math.round(ttsReadyAt - releaseAt),
      });
    } catch {
      voiceTimingLog("inline.error", {
        contentId: item.id,
        totalAfterReleaseMs: Math.round(performance.now() - releaseAt),
      });
      setTalkPhase("idle");
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!supported || phase === "thinking") return;
    e.preventDefault();
    holdingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    stopGeminiVoice();
    stopCharacterSpeech();
    sessionRef.current?.cancel();
    setInterim("");
    setTalkPhase("listening");

    const session = startHoldToSpeak({
      onInterim: setInterim,
      onError: () => {
        if (holdingRef.current) void releaseHold();
      },
    });
    if (!session) {
      holdingRef.current = false;
      setTalkPhase("idle");
      return;
    }
    sessionRef.current = session;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    void releaseHold();
  }

  const label =
    phase === "listening"
      ? "Listening…"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "answering"
          ? "Speaking…"
          : supported
            ? "Hold"
            : "N/A";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={!supported || phase === "thinking"}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex flex-col items-center gap-1 touch-none select-none"
        aria-label="Hold to speak with teacher"
      >
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-all bg-pastel-lilac text-pastel-ink",
            phase === "listening" && "scale-110 bg-pastel-peach ring-2 ring-white/80",
            phase === "thinking" && "opacity-70",
            !supported && "opacity-40"
          )}
        >
          {phase === "listening" ? (
            <div className="h-4 w-4 rounded-sm bg-pastel-ink" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
            </svg>
          )}
        </div>
        <span className="text-[9px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
          {label}
        </span>
      </button>
      {interim && phase === "listening" && (
        <p className="max-w-[72px] truncate text-center text-[8px] text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
          {interim}
        </p>
      )}
    </div>
  );
}

function PortraitImg({
  src,
  alt,
  focus,
  eager,
  className,
  onReady,
}: {
  src: string;
  alt: string;
  focus: string;
  eager?: boolean;
  className?: string;
  onReady?: () => void;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      loading={eager ? "eager" : "lazy"}
      onLoad={onReady}
      className={cn(
        "absolute inset-0 h-full w-full object-cover",
        focus,
        className
      )}
      draggable={false}
    />
  );
}

function PersonalityMedia({
  item,
  containerRef,
  priority,
  externalSpeaking,
  onVisibilityChange,
}: {
  item: ContentItem;
  containerRef: React.RefObject<HTMLElement | null>;
  priority?: boolean;
  externalSpeaking?: boolean;
  onVisibilityChange?: (id: string, visible: boolean) => void;
}) {
  const [isInView, setIsInView] = useState(!!priority);
  const [baseReady, setBaseReady] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const isSpeaking = !!externalSpeaking;
  const style = item.portraitStyle ?? "illustration";
  const focus = PORTRAIT_FOCUS[style];
  const eager = priority || isInView;
  const usesAiPortrait = item.wantAiPortrait || !!item.aiPosterUrl;
  const portraitReady = usesAiPortrait
    ? aiReady && !!item.aiPosterUrl
    : !!(item.posterUrl && baseReady);
  const isTalking = isInView && isSpeaking;
  const showMouthGlow = isInView && portraitReady && isSpeaking;

  useEffect(() => {
    setAiReady(false);
  }, [item.aiPosterUrl]);

  // If src is already cached (e.g. data URL), onLoad may not fire in some browsers
  useEffect(() => {
    if (!item.aiPosterUrl) return;
    const img = new window.Image();
    img.onload = () => setAiReady(true);
    img.src = item.aiPosterUrl;
  }, [item.aiPosterUrl]);

  useEffect(() => {
    const section = containerRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const minRatio = priority ? 0.35 : 0.55;
        const visible = entry.isIntersecting && entry.intersectionRatio >= minRatio;
        setIsInView(visible);
        onVisibilityChange?.(item.id, visible);
      },
      { threshold: [0, 0.35, 0.55, 0.75, 1] }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      onVisibilityChange?.(item.id, false);
    };
  }, [containerRef, item.id, onVisibilityChange, priority]);

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: item.thumbnailColor }}
      >
        {item.posterUrl && !usesAiPortrait && (
          <PortraitImg
            src={item.posterUrl}
            alt={`${item.character.name} teaching`}
            focus={focus}
            eager={eager}
            onReady={() => setBaseReady(true)}
            className={cn(
              isSpeaking && baseReady && "talking-portrait-active"
            )}
          />
        )}
        {item.aiPosterUrl && (
          <PortraitImg
            src={item.aiPosterUrl}
            alt={`${item.character.name} AI portrait`}
            focus={focus}
            eager
            onReady={() => setAiReady(true)}
            className={cn(
              aiReady && isSpeaking && "talking-portrait-active",
              "z-10 transition-opacity duration-500",
              aiReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}
        {usesAiPortrait && !portraitReady && (
          <PortraitLoadingOverlay characterName={item.character.name} />
        )}
        {showMouthGlow && (
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2",
              MOUTH_POSITION[style]
            )}
            aria-hidden
          >
            <div className="talking-mouth-glow absolute left-1/2 top-1/2 h-8 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-md" />
            <div className="talking-mouth-aperture">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/45 to-transparent" />

      {isTalking && (
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

export function ReelSlide({
  item,
  priority,
  muted,
  saved,
  onSave,
  onQuiz,
  onToggleMute,
  onVisibilityChange,
}: ReelSlideProps) {
  const topic = item.topics[0];
  const topicColor = topicPastels[topic] ?? { bg: "#EDE4FF", text: "#9B7FD4" };
  const sectionRef = useRef<HTMLElement>(null);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [talkPhase, setTalkPhase] = useState<TalkPhase>("idle");

  useEffect(() => {
    stopCharacterSpeech();
    stopGeminiVoice();
    setTalkPhase("idle");
  }, [item.id]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-pastel-cream"
    >
      <PersonalityMedia
        item={item}
        containerRef={sectionRef}
        priority={priority}
        externalSpeaking={!muted && (talkPhase === "listening" || talkPhase === "answering")}
        onVisibilityChange={onVisibilityChange}
      />

      <div className="absolute left-4 top-[7rem] z-10">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
          style={{ background: `${item.character.color}CC`, color: "#4A4458" }}
        >
          {item.character.name}
        </span>
      </div>

      {talkPhase !== "idle" && (
        <div className="absolute bottom-[9.75rem] left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-white">
            {talkPhase === "listening"
              ? "Listening..."
              : talkPhase === "thinking"
                ? `${item.character.name.split(" ")[0]} is thinking...`
                : `${item.character.name.split(" ")[0]} is speaking...`}
          </p>
        </div>
      )}

      <div className="absolute bottom-[5.5rem] left-3 right-[3.75rem] z-10">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm"
            style={{ background: topicColor.bg, color: topicColor.text }}
          >
            {topic}
          </span>
        </div>
        <h2
          className={cn(
            "mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-200",
            REEL_SHADOW.title
          )}
        >
          {item.title}
        </h2>

        <button
          type="button"
          onClick={() => setCaptionOpen((open) => !open)}
          className={cn("mt-2 w-full text-left text-zinc-300", REEL_SHADOW.body)}
          aria-expanded={captionOpen}
        >
          <p
            className={cn(
              "text-[13px] leading-[1.55] text-zinc-300",
              REEL_SHADOW.body,
              !captionOpen && "line-clamp-1"
            )}
          >
            {item.transcript}
          </p>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-zinc-300",
              REEL_SHADOW.meta
            )}
          >
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

      <div className="absolute bottom-[6.5rem] right-3 z-20 flex flex-col items-center gap-4">
        <ActionButton
          label={muted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          active={muted}
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </ActionButton>

        <ActionButton
          label={saved ? "Saved" : "Save"}
          onClick={onSave}
          variant={saved ? "saved" : "default"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
          </svg>
        </ActionButton>

        <button
          type="button"
          onClick={onQuiz}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-pastel-ink backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            </svg>
          </div>
          <span className="text-[9px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">Quiz</span>
        </button>

        <HoldToTalkButton
          item={item}
          muted={muted}
          onPhaseChange={setTalkPhase}
        />
      </div>
    </section>
  );
}
