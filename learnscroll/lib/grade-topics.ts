import type { GradeLevel, Topic } from "./types";

export const GRADE_LABELS: Record<GradeLevel, string> = {
  "K-5": "K–5",
  "6-8": "6–8",
  "9-12": "9–12",
  college: "College",
  graduate: "Grad",
};

export const GRADE_LEVELS: GradeLevel[] = ["K-5", "6-8", "9-12", "college"];

export const TOPICS_BY_GRADE: Record<GradeLevel, Topic[]> = {
  "K-5": ["biology", "math", "history"],
  "6-8": ["biology", "math", "physics", "history"],
  "9-12": [
    "physics",
    "math",
    "biology",
    "chemistry",
    "history",
    "literature",
    "philosophy",
    "engineering",
  ],
  college: [
    "physics",
    "math",
    "biology",
    "chemistry",
    "history",
    "literature",
    "philosophy",
    "engineering",
  ],
  graduate: [
    "physics",
    "math",
    "biology",
    "chemistry",
    "history",
    "literature",
    "philosophy",
    "engineering",
  ],
};

export function topicsForGrade(grade: GradeLevel): Topic[] {
  return TOPICS_BY_GRADE[grade];
}

export function topicAllowedForGrade(topic: Topic, grade: GradeLevel): boolean {
  return TOPICS_BY_GRADE[grade].includes(topic);
}

export const TOPIC_LABELS: Record<Topic, string> = {
  physics: "Physics",
  math: "Math",
  biology: "Nature",
  chemistry: "Chemistry",
  history: "History",
  literature: "Literature",
  philosophy: "Logic",
  engineering: "Engineering",
};
