"use client";

import type { GradeLevel, Topic } from "@/lib/types";
import { TOPIC_LABELS, topicsForGrade } from "@/lib/grade-topics";
import { TopicPills } from "./ui/TopicPills";

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
  const options = [
    { id: "all", label: "All" },
    ...gradeTopics.map((t) => ({ id: t, label: TOPIC_LABELS[t], topic: t })),
  ];

  return (
    <TopicPills
      variant="overlay"
      options={options}
      selected={selected}
      onChange={(id) => onChange(id as Topic | "all")}
    />
  );
}
