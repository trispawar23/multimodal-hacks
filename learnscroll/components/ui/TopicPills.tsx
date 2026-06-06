"use client";

import { cn } from "./cn";
import { topicPastels } from "@/lib/tokens";
import type { Topic } from "@/lib/types";

export interface TopicPillOption {
  id: string;
  label: string;
  topic?: Topic;
}

interface TopicPillsProps {
  options: TopicPillOption[];
  selected: string;
  onChange: (id: string) => void;
  /** overlay = on video feed; page = library/quiz */
  variant?: "overlay" | "page";
  className?: string;
}

export function TopicPills({
  options,
  selected,
  onChange,
  variant = "page",
  className,
}: TopicPillsProps) {
  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto no-scrollbar",
        variant === "overlay" ? "px-4 py-2" : "py-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = selected === opt.id;
        const pastel = opt.topic ? topicPastels[opt.topic] : null;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
              variant === "overlay" &&
                (active
                  ? "bg-white/90 text-pastel-ink shadow-sm"
                  : "bg-white/50 text-pastel-muted backdrop-blur-sm"),
              variant === "page" &&
                (active
                  ? "bg-pastel-lilac text-pastel-ink shadow-sm"
                  : "border border-surface-border bg-white text-pastel-muted")
            )}
            style={
              active && pastel
                ? { background: pastel.bg, color: pastel.text }
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
