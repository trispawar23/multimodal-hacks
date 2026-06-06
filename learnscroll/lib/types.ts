export type GradeLevel =
  | "K-5"
  | "6-8"
  | "9-12"
  | "college"
  | "graduate";

export type Topic =
  | "physics"
  | "math"
  | "history"
  | "literature"
  | "chemistry"
  | "biology"
  | "engineering"
  | "philosophy";

export interface AICharacter {
  id: string;
  name: string;
  era: string;
  subjects: Topic[];
  initial: string;
  color: string;
}

export interface ContentItem {
  id: string;
  title: string;
  sourceUrl: string;
  platform: "tiktok" | "instagram" | "youtube";
  transcript: string;
  topics: Topic[];
  qualityScore: number;
  gradeLevel: GradeLevel;
  character: AICharacter;
  thumbnailColor: string;
  /** Full-bleed poster frame when video is loading or unavailable */
  posterUrl: string;
  /** Direct MP4/WebM URL for reel playback */
  videoUrl?: string;
  /** AI character portrait with simulated talking animation (no video file) */
  talkingPortrait?: boolean;
  durationSec: number;
  viewCount: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  contentId: string;
  title: string;
  gradeLevel: GradeLevel;
  questions: QuizQuestion[];
}

export interface SavedItem {
  id: string;
  contentId: string;
  title: string;
  topic: Topic;
  savedAt: Date;
  notes: string;
  bookId: string;
}

export interface Book {
  id: string;
  title: string;
  items: SavedItem[];
  coverColor: string;
  gradeLevel: GradeLevel;
}
