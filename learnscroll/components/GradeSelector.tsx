"use client";

import { cn } from "./ui/cn";
import { GRADE_LABELS, GRADE_LEVELS } from "@/lib/grade-topics";
import type { GradeLevel } from "@/lib/types";

interface GradeSelectorProps {
  value: GradeLevel;
  onChange: (grade: GradeLevel) => void;
  className?: string;
}

export function GradeSelector({ value, onChange, className }: GradeSelectorProps) {
  return (
    <div
      className={cn(
        "flex rounded-full bg-black/50 p-0.5 ring-1 ring-inset ring-white/20 backdrop-blur-md",
        className
      )}
    >
      {GRADE_LEVELS.map((grade) => (
        <button
          key={grade}
          type="button"
          onClick={() => onChange(grade)}
          className={cn(
            "rounded-full px-2 py-1 text-[10px] font-semibold transition-all",
            value === grade
              ? "bg-white text-pastel-ink shadow-sm"
              : "text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
          )}
        >
          {GRADE_LABELS[grade]}
        </button>
      ))}
    </div>
  );
}
