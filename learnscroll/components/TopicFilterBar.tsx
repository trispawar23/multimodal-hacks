"use client";

import { cn } from "./ui/cn";
import type { Topic } from "@/lib/types";

const ALL_TOPICS: { id: Topic | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "physics", label: "Physics" },
  { id: "math", label: "Math" },
  { id: "history", label: "History" },
  { id: "chemistry", label: "Chemistry" },
  { id: "literature", label: "Literature" },
  { id: "biology", label: "Biology" },
  { id: "engineering", label: "Engineering" },
];

interface TopicFilterBarProps {
  selected: Topic | "all";
  onChange: (topic: Topic | "all") => void;
}

export function TopicFilterBar({ selected, onChange }: TopicFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
      {ALL_TOPICS.map((t) => {
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border",
              active
                ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20"
                : "border-white/15 bg-black/35 text-white/75 backdrop-blur-sm hover:border-white/30 hover:text-white"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
