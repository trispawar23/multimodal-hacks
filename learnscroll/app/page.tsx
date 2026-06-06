"use client";

import { useState } from "react";
import { ReelSlide } from "@/components/ReelSlide";
import { TopicFilterBar } from "@/components/TopicFilterBar";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { BottomNav } from "@/components/BottomNav";
import { FEED_ITEMS } from "@/lib/mock-data";
import type { ContentItem, Topic } from "@/lib/types";

export default function FeedPage() {
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");
  const [activeVoiceItem, setActiveVoiceItem] = useState<ContentItem | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const filteredItems =
    topicFilter === "all"
      ? FEED_ITEMS
      : FEED_ITEMS.filter((item) => item.topics.includes(topicFilter));

  function handleSave(id: string) {
    setSavedIds((prev) => new Set([...prev, id]));
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6">
        <p className="text-sm text-zinc-500">No content for this topic yet.</p>
        <button
          onClick={() => setTopicFilter("all")}
          className="text-sm font-medium text-brand-500"
        >
          Show all
        </button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-black">
      {/* Floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="pointer-events-auto flex items-center justify-between px-4 pt-4">
          <p className="text-sm font-bold text-white drop-shadow-lg">LearnScroll</p>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
            Gr 9–12
          </span>
        </div>
        <div className="pointer-events-auto mt-2">
          <TopicFilterBar selected={topicFilter} onChange={setTopicFilter} />
        </div>
      </div>

      {/* Full-screen snap reel feed */}
      <main className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        {filteredItems.map((item) => (
          <ReelSlide
            key={item.id}
            item={item}
            saved={savedIds.has(item.id)}
            onSave={() => handleSave(item.id)}
            onVoice={() => setActiveVoiceItem(item)}
          />
        ))}
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
