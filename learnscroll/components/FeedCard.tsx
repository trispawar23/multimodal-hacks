"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentItem } from "@/lib/types";
import { cn } from "./ui/cn";

interface FeedCardProps {
  item: ContentItem;
  onSave: (id: string) => void;
  onVoice: (item: ContentItem) => void;
}

const GRADE_LABELS: Record<string, string> = {
  "K-5": "Gr K–5",
  "6-8": "Gr 6–8",
  "9-12": "Gr 9–12",
  college: "College",
  graduate: "Grad",
};

const TOPIC_COLORS: Record<string, string> = {
  physics: "text-blue-400",
  math: "text-purple-400",
  chemistry: "text-red-400",
  history: "text-green-400",
  literature: "text-amber-400",
  biology: "text-teal-400",
  engineering: "text-cyan-400",
  philosophy: "text-rose-400",
};

function QualityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.9
      ? "text-green-400 border-green-400/30 bg-green-400/10"
      : score >= 0.75
      ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
      : "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", color)}>
      {pct}% real
    </span>
  );
}

export function FeedCard({ item, onSave, onVoice }: FeedCardProps) {
  const [saved, setSaved] = useState(false);
  const topicColor = TOPIC_COLORS[item.topics[0]] ?? "text-zinc-400";

  function handleSave() {
    setSaved(true);
    onSave(item.id);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#2a2a38] bg-[#16161c] flex flex-col">
      {/* Thumbnail area */}
      <div
        className="relative h-52 flex flex-col justify-end p-4"
        style={{ background: `linear-gradient(180deg, ${item.thumbnailColor} 0%, ${item.thumbnailColor}cc 60%, #16161c 100%)` }}
      >
        {/* Character badge — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: item.character.color }}
          >
            {item.character.initial}
          </div>
          <span className="text-[12px] font-medium text-white">{item.character.name}</span>
        </div>

        {/* Grade + quality — top right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-bold bg-[#4f6ef7] text-white px-2 py-0.5 rounded-full">
            {GRADE_LABELS[item.gradeLevel]}
          </span>
          <QualityBadge score={item.qualityScore} />
        </div>

        {/* Platform watermark */}
        <div className="absolute bottom-4 right-4 opacity-50">
          <span className="text-[10px] text-white uppercase tracking-widest">
            {item.platform}
          </span>
        </div>
      </div>

      {/* Content info */}
      <div className="px-4 pt-3 pb-2">
        <span className={cn("text-[11px] font-bold uppercase tracking-wider", topicColor)}>
          {item.topics[0]}
        </span>
        <h2 className="mt-1 text-[15px] font-semibold text-white leading-snug line-clamp-2">
          {item.title}
        </h2>
        <p className="mt-1.5 text-[12px] text-zinc-400 leading-relaxed line-clamp-2">
          {item.transcript}
        </p>
      </div>

      {/* Action strip */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        <button
          onClick={handleSave}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all",
            saved
              ? "border-green-500/40 text-green-400 bg-green-500/10"
              : "border-[#2a2a38] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          )}
        >
          {saved ? "Saved" : "Save"}
        </button>

        <Link
          href={`/quiz?contentId=${item.id}`}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border border-[#2a2a38] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all text-center"
        >
          Quiz Me
        </Link>

        <button
          onClick={() => onVoice(item)}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          Ask Voice
        </button>
      </div>
    </div>
  );
}
