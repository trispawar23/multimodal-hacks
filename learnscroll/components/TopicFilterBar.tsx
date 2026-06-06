"use client";

import { cn } from "./ui/cn";
import type { GradeLevel, Topic } from "@/lib/types";
import { TOPIC_LABELS, topicsForGrade } from "@/lib/grade-topics";
import { topicPastels } from "@/lib/tokens";

interface TopicFilterBarProps {
  selected: Topic | "all";
  onChange: (topic: Topic | "all") => void;
  gradeLevel: GradeLevel;
}

export function TopicFilterBar({
  selected,
  onChange,
  gradeLevel,
}: TopicFilterBarProps) {
  const gradeTopics = topicsForGrade(gradeLevel);
  const pills: { id: Topic | "all"; label: string }[] = [
    { id: "all", label: "All" },
    ...gradeTopics.map((t) => ({ id: t, label: TOPIC_LABELS[t] })),
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2">
      {pills.map((t) => {
        const active = selected === t.id;
        const pastel = t.id !== "all" ? topicPastels[t.id] : null;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
              active
                ? "bg-white/90 text-pastel-ink shadow-sm"
                : "bg-white/50 text-pastel-muted backdrop-blur-sm"
            )}
            style={
              active && pastel
                ? { background: pastel.bg, color: pastel.text }
                : undefined
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
