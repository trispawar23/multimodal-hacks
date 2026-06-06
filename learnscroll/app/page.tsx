"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReelSlide } from "@/components/ReelSlide";
import { TopicFilterBar } from "@/components/TopicFilterBar";
import { GradeSelector } from "@/components/GradeSelector";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { BottomNav } from "@/components/BottomNav";
import { generateInstantFeed, generateInstantSlop } from "@/lib/instant-slop";
import { topicAllowedForGrade, topicsForGrade, GRADE_LABELS } from "@/lib/grade-topics";
import { preloadVoices } from "@/lib/character-voice";
import { fetchPortraitForItem } from "@/lib/portrait-client";
import type { ContentItem, GradeLevel, Topic } from "@/lib/types";

const PORTRAIT_CONCURRENCY = 2;

export default function FeedPage() {
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>("9-12");
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");
  const [feedItems, setFeedItems] = useState<ContentItem[]>(() =>
    generateInstantFeed("all", "9-12", 4)
  );
  const [activeVoiceItem, setActiveVoiceItem] = useState<ContentItem | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [portraitErrors, setPortraitErrors] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const portraitInflightRef = useRef<Set<string>>(new Set());
  const feedItemsRef = useRef(feedItems);
  feedItemsRef.current = feedItems;

  useEffect(() => {
    preloadVoices();
  }, []);

  const drainPortraitQueue = useCallback(() => {
    for (const item of feedItemsRef.current) {
      if (portraitInflightRef.current.size >= PORTRAIT_CONCURRENCY) break;
      if (!item.imagePending || item.posterUrl.startsWith("data:")) continue;
      if (portraitInflightRef.current.has(item.id)) continue;

      portraitInflightRef.current.add(item.id);

      fetchPortraitForItem(item)
        .then(({ posterUrl }) => {
          setFeedItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, posterUrl, imagePending: false }
                : i
            )
          );
        })
        .catch(() => {
          setPortraitErrors((n) => n + 1);
          setFeedItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, imagePending: false } : i
            )
          );
        })
        .finally(() => {
          portraitInflightRef.current.delete(item.id);
          drainPortraitQueue();
        });
    }
  }, []);

  useEffect(() => {
    drainPortraitQueue();
  }, [feedItems, drainPortraitQueue]);

  const rebuildFeed = useCallback((topic: Topic | "all", grade: GradeLevel) => {
    portraitInflightRef.current.clear();
    setPortraitErrors(0);
    setFeedItems(generateInstantFeed(topic, grade, 4));
  }, []);

  useEffect(() => {
    if (
      topicFilter !== "all" &&
      !topicAllowedForGrade(topicFilter, gradeLevel)
    ) {
      setTopicFilter("all");
      rebuildFeed("all", gradeLevel);
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

  function handleSave(id: string) {
    setSavedIds((prev) => new Set([...prev, id]));
  }

  const gradeLabel = useMemo(() => GRADE_LABELS[gradeLevel], [gradeLevel]);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-pastel-cream">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="pointer-events-auto flex items-start justify-between gap-2 px-4 pt-4">
          <p className="text-[15px] font-semibold tracking-tight text-white drop-shadow-md">
            Luminary
          </p>
          <GradeSelector
            value={gradeLevel}
            onChange={setGradeLevel}
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
        <p className="pointer-events-auto px-4 pb-1 text-center text-[10px] font-medium text-white/90 drop-shadow">
          {gradeLabel} · scroll — each tutor talks back
        </p>
      </div>

      <main className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        {feedItems.map((item, index) => (
          <ReelSlide
            key={item.id}
            item={item}
            priority={index === 0}
            saved={savedIds.has(item.id)}
            onSave={() => handleSave(item.id)}
            onVoice={() => setActiveVoiceItem(item)}
          />
        ))}
        <div ref={loadMoreRef} className="h-px w-full" aria-hidden />
      </main>

      {activeVoiceItem && (
        <VoiceOverlay
          content={activeVoiceItem}
          onClose={() => setActiveVoiceItem(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
