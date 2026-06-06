"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReelSlide } from "@/components/ReelSlide";
import { TopicFilterBar } from "@/components/TopicFilterBar";
import { GradeSelector } from "@/components/GradeSelector";
import { PageShell } from "@/components/layout/PageShell";
import {
  generateInstantFeed,
  generateInstantSlop,
  preloadPortraits,
} from "@/lib/instant-slop";
import { topicAllowedForGrade, topicsForGrade } from "@/lib/grade-topics";
import { preloadVoices, stopCharacterSpeech } from "@/lib/character-voice";
import { readFeedMuted, writeFeedMuted, readSavedGrade, writeSavedGrade, unlockFeedSpeech, onFeedSpeechUnlock } from "@/lib/feed-audio";
import {
  fetchPortraitForItem,
  getCachedPortrait,
} from "@/lib/portrait-client";
import { getSavedIds, saveContent, toggleSaveContent } from "@/lib/saved-store";
import type { ContentItem, GradeLevel, Topic } from "@/lib/types";

/** Start Gemini portrait as soon as a reel is in view */
const AI_PORTRAIT_DELAY_MS = 0;

export default function FeedPage() {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() => {
    if (typeof window !== "undefined") return readSavedGrade() ?? "9-12";
    return "9-12";
  });
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");
  const [feedItems, setFeedItems] = useState<ContentItem[]>(() => {
    const grade =
      typeof window !== "undefined" ? readSavedGrade() ?? "9-12" : "9-12";
    return generateInstantFeed("all", grade, 4);
  });
  const mainRef = useRef<HTMLElement>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => getSavedIds());
  const [muted, setMuted] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const feedItemsRef = useRef(feedItems);
  const portraitTimerRef = useRef<number | null>(null);
  const portraitInflightRef = useRef<string | null>(null);
  const pendingPortraitIdRef = useRef<string | null>(null);
  const attemptedPortraitRef = useRef<Set<string>>(new Set());
  const visibleReelIdRef = useRef<string | null>(null);
  const skippedInitialRebuildRef = useRef(false);
  feedItemsRef.current = feedItems;

  useEffect(() => {
    preloadPortraits();
    preloadVoices();
    setSavedIds(getSavedIds());
    setMuted(readFeedMuted());

    const unlock = () => unlockFeedSpeech();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, { capture: true });
      document.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  function handleGradeChange(grade: GradeLevel) {
    setGradeLevel(grade);
    writeSavedGrade(grade);
    stopCharacterSpeech();
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleToggleMute() {
    setMuted((prev) => {
      const next = !prev;
      writeFeedMuted(next);
      if (next) stopCharacterSpeech();
      return next;
    });
  }

  const lazyUpgradePortrait = useCallback((item: ContentItem) => {
    if (!item.wantAiPortrait || item.aiPosterUrl) return;
    if (attemptedPortraitRef.current.has(item.id)) return;

    if (portraitInflightRef.current) {
      pendingPortraitIdRef.current = item.id;
      return;
    }

    const cached = getCachedPortrait(item);
    if (cached) {
      attemptedPortraitRef.current.add(item.id);
      setFeedItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                aiPosterUrl: cached,
                wantAiPortrait: false,
                imagePending: false,
              }
            : i
        )
      );
      return;
    }

    portraitInflightRef.current = item.id;

    fetchPortraitForItem(item)
      .then(({ posterUrl, fallback }) => {
        if (fallback || !posterUrl.startsWith("data:")) return;
        attemptedPortraitRef.current.add(item.id);
        setFeedItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  aiPosterUrl: posterUrl,
                  wantAiPortrait: false,
                  imagePending: false,
                }
              : i
          )
        );
      })
      .catch((err) => {
        console.warn("Portrait generation failed for", item.id, err);
      })
      .finally(() => {
        if (portraitInflightRef.current === item.id) {
          portraitInflightRef.current = null;
        }
        const pending = pendingPortraitIdRef.current;
        pendingPortraitIdRef.current = null;
        if (pending && pending !== item.id) {
          const next = feedItemsRef.current.find((i) => i.id === pending);
          if (next) lazyUpgradePortrait(next);
        } else if (
          visibleReelIdRef.current &&
          visibleReelIdRef.current !== item.id
        ) {
          const visible = feedItemsRef.current.find(
            (i) => i.id === visibleReelIdRef.current
          );
          if (visible && !attemptedPortraitRef.current.has(visible.id)) {
            lazyUpgradePortrait(visible);
          }
        }
      });
  }, []);

  const scheduleLazyPortrait = useCallback(
    (id: string) => {
      if (portraitTimerRef.current) {
        window.clearTimeout(portraitTimerRef.current);
      }
      portraitTimerRef.current = window.setTimeout(() => {
        const item = feedItemsRef.current.find((i) => i.id === id);
        if (item) lazyUpgradePortrait(item);
        portraitTimerRef.current = null;
      }, AI_PORTRAIT_DELAY_MS);
    },
    [lazyUpgradePortrait]
  );

  const cancelLazyPortrait = useCallback(() => {
    if (portraitTimerRef.current) {
      window.clearTimeout(portraitTimerRef.current);
      portraitTimerRef.current = null;
    }
  }, []);

  const handleReelVisibility = useCallback(
    (id: string, visible: boolean) => {
      if (visible) {
        visibleReelIdRef.current = id;
        scheduleLazyPortrait(id);
      } else if (visibleReelIdRef.current === id) {
        visibleReelIdRef.current = null;
      }
    },
    [scheduleLazyPortrait]
  );

  const rebuildFeed = useCallback((topic: Topic | "all", grade: GradeLevel) => {
    cancelLazyPortrait();
    portraitInflightRef.current = null;
    pendingPortraitIdRef.current = null;
    attemptedPortraitRef.current.clear();
    setFeedItems(generateInstantFeed(topic, grade, 4));
  }, [cancelLazyPortrait]);

  useEffect(() => {
    if (
      topicFilter !== "all" &&
      !topicAllowedForGrade(topicFilter, gradeLevel)
    ) {
      setTopicFilter("all");
      rebuildFeed("all", gradeLevel);
      return;
    }

    // Initial feed is already generated in useState — avoid remount on first paint
    if (!skippedInitialRebuildRef.current) {
      skippedInitialRebuildRef.current = true;
      return;
    }

    rebuildFeed(topicFilter, gradeLevel);
  }, [topicFilter, gradeLevel, rebuildFeed]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingMoreRef.current) return;
        loadingMoreRef.current = true;

        const topics =
          topicFilter === "all" ? topicsForGrade(gradeLevel) : [topicFilter];
        const topic = topics[Math.floor(Math.random() * topics.length)];

        setFeedItems((prev) => [...prev, generateInstantSlop(topic, gradeLevel)]);
        loadingMoreRef.current = false;
      },
      { rootMargin: "60px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [topicFilter, gradeLevel]);

  useEffect(() => () => cancelLazyPortrait(), [cancelLazyPortrait]);

  function handleSave(item: ContentItem) {
    toggleSaveContent(item);
    setSavedIds(getSavedIds());
  }

  function handleQuiz(item: ContentItem) {
    saveContent(item);
    setSavedIds(getSavedIds());
    const topic = item.topics[0] ?? "all";
    router.push(`/quiz?topic=${topic}`);
  }

  return (
    <PageShell fullHeight className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="pointer-events-auto flex items-start justify-between gap-2 px-4 pt-4">
          <p className="text-[15px] font-semibold tracking-tight text-white drop-shadow-md">
            LearnScroll
          </p>
          <GradeSelector
            value={gradeLevel}
            onChange={handleGradeChange}
            className="max-w-[210px] shrink-0"
          />
        </div>
        <div className="pointer-events-auto">
          <TopicFilterBar
            selected={topicFilter}
            onChange={setTopicFilter}
            gradeLevel={gradeLevel}
          />
        </div>
      </div>

      <main
        ref={mainRef}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll no-scrollbar"
      >
        {feedItems.map((item, index) => (
          <ReelSlide
            key={item.id}
            item={item}
            priority={index === 0}
            muted={muted}
            saved={savedIds.has(item.id)}
            onSave={() => handleSave(item)}
            onQuiz={() => handleQuiz(item)}
            onToggleMute={handleToggleMute}
            onVisibilityChange={handleReelVisibility}
          />
        ))}
        <div ref={loadMoreRef} className="h-px w-full" aria-hidden />
      </main>
    </PageShell>
  );
}
