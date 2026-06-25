"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ContentItem, PortraitStyle } from "@/lib/types";
import { topicPastels } from "@/lib/tokens";
import { onFeedSpeechUnlock, unlockFeedSpeech } from "@/lib/feed-audio";
import { playCharacterVoice, stopAllCharacterSpeech } from "@/lib/voice-playback";
import { isSpeechInputSupported, listenForSpeech, startHoldToSpeak, type HoldToSpeakSession } from "@/lib/speech-input";
import { PortraitLoadingOverlay } from "./PortraitLoadingOverlay";
import { isPortraitUrlForCharacter } from "@/lib/portrait-validation";
import { cn } from "./ui/cn";

interface ReelSlideProps {
  item: ContentItem;
  priority?: boolean;
  muted?: boolean;
  speechActive?: boolean;
  saved: boolean;
  onSave: () => void;
  onQuiz?: () => void;
  onToggleMute?: () => void;
  onVisibilityChange?: (id: string, visible: boolean) => void;
  onPortraitBroken?: (id: string) => void;
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

function TalkButton({
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
  const [micError, setMicError] = useState("");
  const sessionRef = useRef<HoldToSpeakSession | null>(null);
  const stopOpenMicRef = useRef<(() => void) | null>(null);
  const historyRef = useRef<{ role: "user" | "character"; text: string }[]>([]);
  const holdingRef = useRef(false);
  const phaseRef = useRef<TalkPhase>("idle");
  const supported = isSpeechInputSupported();
  const lessonReady =
    !item.enrichPending && item.character.id !== "loading" && item.title !== "Could not load lesson";

  const setTalkPhase = useCallback(
    (next: TalkPhase) => {
      phaseRef.current = next;
      setPhase(next);
      onPhaseChange(next);
    },
    [onPhaseChange]
  );

  const stopMic = useCallback(() => {
    stopOpenMicRef.current?.();
    stopOpenMicRef.current = null;
    sessionRef.current?.cancel();
    sessionRef.current = null;
    holdingRef.current = false;
    setInterim("");
  }, []);

  const sendQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) {
        setTalkPhase("idle");
        return;
      }

      setTalkPhase("thinking");
      stopAllCharacterSpeech(item.id);

      try {
        const prior = historyRef.current.filter(
          (t) => t.role === "user" || t.role === "character"
        );
        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: item.character.id,
            question: trimmed,
            title: item.title,
            transcript: item.transcript,
            gradeLevel: item.gradeLevel,
            topics: item.topics,
            history: prior,
          }),
        });
        const data = (await res.json()) as { answer?: string; error?: string };
        const answer =
          data.answer ??
          (res.ok
            ? "I lost my train of thought — try asking again."
            : "I couldn't answer that — try rephrasing your question.");

        historyRef.current = [
          ...prior,
          { role: "user" as const, text: trimmed },
          { role: "character" as const, text: answer },
        ].slice(-10);

        if (muted) {
          setTalkPhase("idle");
          return;
        }

        setTalkPhase("answering");
        await playCharacterVoice(answer, item.character, {
          force: true,
          muted,
          speechOwner: item.id,
          gradeLevel: item.gradeLevel,
          onEnd: () => setTalkPhase("idle"),
        });
      } catch {
        setMicError("Could not reach the teacher — try again.");
        setTalkPhase("idle");
      }
    },
    [item, muted, setTalkPhase]
  );

  const finishHold = useCallback(async () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;

    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setInterim("");
      setTalkPhase("idle");
      return;
    }

    const question = await session.stop();
    setInterim("");
    await sendQuestion(question);
  }, [sendQuestion, setTalkPhase]);

  const startHold = useCallback(() => {
    setMicError("");
    unlockFeedSpeech();
    stopAllCharacterSpeech(item.id);
    stopMic();

    holdingRef.current = true;
    setTalkPhase("listening");

    const session = startHoldToSpeak({
      onInterim: setInterim,
      onError: (message) => {
        if (!holdingRef.current) return;
        holdingRef.current = false;
        sessionRef.current = null;
        setInterim("");
        setTalkPhase("idle");
        if (message === "not-allowed") {
          setMicError("Allow microphone in browser settings");
        } else if (message !== "aborted" && message !== "no-speech") {
          setMicError("Mic error — try Chrome or Edge");
        }
      },
    });

    if (!session) {
      holdingRef.current = false;
      setTalkPhase("idle");
      setMicError("Voice input needs Chrome or Edge");
      return;
    }

    sessionRef.current = session;
  }, [item.id, setTalkPhase, stopMic]);

  const startTapMic = useCallback(() => {
    setMicError("");
    unlockFeedSpeech();
    stopAllCharacterSpeech(item.id);
    stopMic();

    setTalkPhase("listening");
    stopOpenMicRef.current = listenForSpeech({
      onInterim: setInterim,
      onFinal: (text) => {
        setInterim("");
        void sendQuestion(text);
      },
      onError: (message) => {
        setInterim("");
        setTalkPhase("idle");
        if (message === "not-allowed") {
          setMicError("Allow microphone in browser settings");
        } else if (message !== "aborted") {
          setMicError("Mic unavailable — tap and hold instead");
        }
      },
      onEnd: () => {
        stopOpenMicRef.current = null;
        if (phaseRef.current === "listening") setTalkPhase("idle");
      },
    });
  }, [item.id, sendQuestion, setTalkPhase, stopMic]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!lessonReady) {
        setMicError("Wait for the lesson to load");
        return;
      }
      if (!supported) {
        setMicError("Voice input needs Chrome or Edge");
        return;
      }
      if (phase === "thinking" || phase === "answering") return;

      if (phase === "listening" && stopOpenMicRef.current) {
        stopMic();
        setTalkPhase("idle");
        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      startHold();
    },
    [lessonReady, phase, setTalkPhase, startHold, stopMic, supported]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      void finishHold();
    },
    [finishHold]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      void finishHold();
    },
    [finishHold]
  );

  useEffect(() => () => stopMic(), [stopMic]);

  useEffect(() => {
    stopMic();
    setTalkPhase("idle");
    setMicError("");
  }, [item.id, setTalkPhase, stopMic]);

  const label =
    phase === "listening"
      ? "Release"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "answering"
          ? "Speaking…"
          : lessonReady
            ? supported
              ? "Hold"
              : "N/A"
            : "…";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-1 select-none"
        style={{ touchAction: "none" }}
        aria-label="Hold to speak with teacher"
        aria-pressed={phase === "listening"}
      >
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-all bg-pastel-lilac text-pastel-ink",
            phase === "listening" && "scale-110 bg-pastel-peach ring-2 ring-white/80",
            phase === "thinking" && "opacity-70",
            (!supported || !lessonReady) && phase === "idle" && "opacity-40"
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
        <p className="max-w-[96px] truncate text-center text-[8px] text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
          {interim}
        </p>
      )}
      {micError && (
        <p className="max-w-[104px] text-center text-[8px] font-medium text-pastel-peach [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
          {micError}
        </p>
      )}
      {supported && lessonReady && phase === "idle" && !micError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startTapMic();
          }}
          className="text-[8px] font-medium text-white/70 underline [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
        >
          or tap to talk
        </button>
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
  onError,
}: {
  src: string;
  alt: string;
  focus: string;
  eager?: boolean;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
}) {
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => onReady?.();
    img.onerror = () => onError?.();
    img.src = src;
  }, [src, onReady, onError]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={src}
      src={src}
      alt={alt}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      loading={eager ? "eager" : "lazy"}
      onLoad={onReady}
      onError={onError}
      className={cn(
        "absolute inset-0 z-[1] h-full w-full object-cover",
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
  muted,
  speechActive = false,
  externalSpeaking,
  onVisibilityChange,
  onPortraitBroken,
}: {
  item: ContentItem;
  containerRef: React.RefObject<HTMLElement | null>;
  priority?: boolean;
  muted?: boolean;
  speechActive?: boolean;
  externalSpeaking?: boolean;
  onVisibilityChange?: (id: string, visible: boolean) => void;
  onPortraitBroken?: (id: string) => void;
}) {
  const [isInView, setIsInView] = useState(!!priority);
  const [baseReady, setBaseReady] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);
  const autoPlayedRef = useRef<string | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const contentReady =
    !item.enrichPending && item.character.id !== "loading";
  const lessonFailed = item.title === "Could not load lesson";
  const speechKey = `${item.id}:${item.character.id}:${item.transcript.slice(0, 64)}`;
  const isSpeaking = autoSpeaking || !!externalSpeaking;
  const style = item.portraitStyle ?? "illustration";
  const focus = PORTRAIT_FOCUS[style];
  const eager = priority || isInView;
  const rawPoster = item.posterUrl || null;
  const staticPoster =
    rawPoster &&
    rawPoster !== failedPosterUrl &&
    isPortraitUrlForCharacter(item.character.id, rawPoster, item.character.name)
      ? rawPoster
      : null;
  const aiPortrait = item.aiPosterUrl || null;
  const portraitFailed =
    lessonFailed ||
    (!item.enrichPending && !staticPoster && !aiPortrait);
  const isTalking = isInView && isSpeaking;
  const showMouthGlow = isInView && (staticPoster || aiPortrait) && isSpeaking;

  useEffect(() => {
    setBaseReady(false);
    setAiReady(false);
    setFailedPosterUrl(null);
  }, [item.id, item.character.id, item.posterUrl]);

  useEffect(() => {
    setAiReady(false);
  }, [item.aiPosterUrl]);

  useEffect(() => {
    autoPlayedRef.current = null;
    setAutoSpeaking(false);
  }, [speechKey]);

  useEffect(() => {
    autoPlayedRef.current = null;
    setAutoSpeaking(false);
  }, [item.id]);

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
        const minRatio = priority ? 0.25 : 0.4;
        const visible = entry.isIntersecting && entry.intersectionRatio >= minRatio;
        setIsInView(visible);
        onVisibilityChange?.(item.id, visible);
      },
      { threshold: [0, 0.25, 0.4, 0.55, 0.75, 1] }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      onVisibilityChange?.(item.id, false);
    };
  }, [containerRef, item.id, onVisibilityChange, priority]);

  const playAutoSpeech = useCallback((reason: "visible" | "unlock") => {
    if (!contentReady || muted || !isInView || !speechActive || externalSpeaking) {
      return;
    }
    if (autoPlayedRef.current === speechKey) return;

    voiceTimingLog("auto_speech.start", {
      contentId: item.id,
      characterId: item.character.id,
      reason,
      transcriptLength: item.transcript.length,
    });

    void playCharacterVoice(item.transcript, item.character, {
      muted,
      speechOwner: item.id,
      gradeLevel: item.gradeLevel,
      onStart: () => {
        autoPlayedRef.current = speechKey;
        setAutoSpeaking(true);
      },
      onEnd: () => setAutoSpeaking(false),
    });
  }, [
    contentReady,
    speechKey,
    muted,
    isInView,
    speechActive,
    externalSpeaking,
    item.id,
    item.character,
    item.transcript,
  ]);

  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (muted || externalSpeaking || !speechActive) {
      setAutoSpeaking(false);
      return;
    }

    if (!isInView) {
      stopAllCharacterSpeech(item.id);
      autoPlayedRef.current = null;
      setAutoSpeaking(false);
      return () => {
        if (autoTimerRef.current) {
          window.clearTimeout(autoTimerRef.current);
          autoTimerRef.current = null;
        }
      };
    }

    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null;
      playAutoSpeech("visible");
    }, 280);

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [isInView, muted, externalSpeaking, speechActive, contentReady, item.id, playAutoSpeech]);

  useEffect(() => {
    return onFeedSpeechUnlock(() => {
      playAutoSpeech("unlock");
    });
  }, [isInView, muted, externalSpeaking, speechActive, contentReady, item.id, playAutoSpeech]);

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: item.thumbnailColor }}
      >
        {staticPoster && (
          <PortraitImg
            src={staticPoster}
            alt={`${item.character.name} teaching`}
            focus={focus}
            eager={eager}
            onReady={() => setBaseReady(true)}
            onError={() => {
              setFailedPosterUrl(staticPoster);
              onPortraitBroken?.(item.id);
            }}
            className={cn(isSpeaking && "talking-portrait-active")}
          />
        )}
        {aiPortrait && (
          <PortraitImg
            src={aiPortrait}
            alt={`${item.character.name} AI portrait`}
            focus={focus}
            eager
            onReady={() => setAiReady(true)}
            className={cn(
              aiReady && isSpeaking && "talking-portrait-active",
              "z-10 transition-opacity duration-500",
              staticPoster ? "opacity-100" : aiReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}
        {item.enrichPending && (
          <PortraitLoadingOverlay message="Finding a lesson…" />
        )}
        {portraitFailed && (
          <div
            className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3"
            style={{ background: item.thumbnailColor }}
            aria-hidden
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full text-5xl font-semibold text-[#4A4458] shadow-lg"
              style={{ background: `${item.character.color}EE` }}
            >
              {item.character.initial}
            </div>
            <p className="text-sm font-medium text-[#4A4458]/80">
              {item.character.name}
            </p>
          </div>
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
  speechActive = false,
  saved,
  onSave,
  onQuiz,
  onToggleMute,
  onVisibilityChange,
  onPortraitBroken,
}: ReelSlideProps) {
  const topic = item.topics[0];
  const topicColor = topicPastels[topic] ?? { bg: "#EDE4FF", text: "#9B7FD4" };
  const sectionRef = useRef<HTMLElement>(null);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [talkPhase, setTalkPhase] = useState<TalkPhase>("idle");

  useEffect(() => {
    stopAllCharacterSpeech(item.id);
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
        muted={muted}
        speechActive={speechActive}
        externalSpeaking={!muted && (talkPhase === "listening" || talkPhase === "answering")}
        onVisibilityChange={onVisibilityChange}
        onPortraitBroken={onPortraitBroken}
      />

      <div className="absolute left-4 top-[7rem] z-10">
        {!item.enrichPending && item.character.id !== "loading" && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
            style={{ background: `${item.character.color}CC`, color: "#4A4458" }}
          >
            {item.character.name}
          </span>
        )}
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

      <div className="absolute bottom-[5.5rem] left-4 right-[4.25rem] z-10">
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

      <div
        className="absolute bottom-[6.5rem] right-3 z-20 flex flex-col items-center gap-4"
        style={{ touchAction: "manipulation" }}
      >
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

        <TalkButton
          item={item}
          muted={muted}
          onPhaseChange={setTalkPhase}
        />
      </div>
    </section>
  );
}
