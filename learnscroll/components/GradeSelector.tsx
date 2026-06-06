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
        "flex rounded-full bg-white/85 p-0.5 backdrop-blur-sm",
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
              ? "bg-pastel-lilac text-pastel-ink shadow-sm"
              : "text-pastel-muted"
          )}
        >
          {GRADE_LABELS[grade]}
        </button>
      ))}
    </div>
  );
}
