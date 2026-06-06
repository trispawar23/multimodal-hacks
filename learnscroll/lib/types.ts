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
  /** Gemini TTS voice preset */
  voiceName?: "Kore" | "Zephyr" | "Puck" | "Charon" | "Fenrir";
}

export type PortraitStyle = "illustration" | "3d" | "realistic";

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
  posterUrl: string;
  videoUrl?: string;
  talkingPortrait?: boolean;
  /** Visual style of the personality portrait */
  portraitStyle?: PortraitStyle;
  durationSec: number;
  viewCount: number;
  /** True when created by Gemini (not mock catalog) */
  generated?: boolean;
  /** Waiting for Gemini portrait */
  imagePending?: boolean;
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
