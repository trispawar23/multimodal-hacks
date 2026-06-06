import type { AICharacter, ContentItem, Book, SavedItem } from "./types";

export const CHARACTERS: AICharacter[] = [
  {
    id: "newton",
    name: "Isaac Newton",
    era: "1643–1727",
    subjects: ["physics", "math"],
    initial: "N",
    color: "#4f6ef7",
  },
  {
    id: "euler",
    name: "Leonhard Euler",
    era: "1707–1783",
    subjects: ["math"],
    initial: "E",
    color: "#9b59b6",
  },
  {
    id: "curie",
    name: "Marie Curie",
    era: "1867–1934",
    subjects: ["chemistry", "physics"],
    initial: "C",
    color: "#e74c3c",
  },
  {
    id: "shakespeare",
    name: "William Shakespeare",
    era: "1564–1616",
    subjects: ["literature"],
    initial: "S",
    color: "#e67e22",
  },
  {
    id: "lincoln",
    name: "Abraham Lincoln",
    era: "1809–1865",
    subjects: ["history"],
    initial: "L",
    color: "#27ae60",
  },
];

export const FEED_ITEMS: ContentItem[] = [
  {
    id: "c1",
    title: "Laws of Motion — why you fly forward in a car crash",
    sourceUrl: "https://tiktok.com/@physicsreal/video/1",
    platform: "tiktok",
    transcript:
      "Newton's first law: an object in motion stays in motion unless acted upon by an external force. In a car crash, the car stops suddenly but your body wants to keep moving — that's why seatbelts exist.",
    topics: ["physics"],
    qualityScore: 0.94,
    gradeLevel: "9-12",
    character: CHARACTERS[0],
    thumbnailColor: "#1a2040",
    posterUrl: "/media/newton-ai-talking.png",
    talkingPortrait: true,
    durationSec: 78,
    viewCount: 2_400_000,
  },
  {
    id: "c2",
    title: "e^iπ + 1 = 0 — the most beautiful equation explained",
    sourceUrl: "https://tiktok.com/@mathreal/video/2",
    platform: "tiktok",
    transcript:
      "Euler's identity connects the five most important numbers in mathematics: e, i, π, 1, and 0. It falls out of Euler's formula when θ = π, giving us e^(iπ) = -1, or e^(iπ) + 1 = 0.",
    topics: ["math"],
    qualityScore: 0.97,
    gradeLevel: "college",
    character: CHARACTERS[1],
    thumbnailColor: "#1a1030",
    posterUrl:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-person-writing-a-mathematical-formula-4814-large.mp4",
    durationSec: 95,
    viewCount: 5_100_000,
  },
  {
    id: "c3",
    title: "Radioactivity: how atoms break apart — and why Curie nearly died for it",
    sourceUrl: "https://instagram.com/p/chem-real-1",
    platform: "instagram",
    transcript:
      "Marie Curie discovered that some atoms spontaneously emit radiation — alpha, beta, or gamma particles. She didn't know radiation was dangerous, and her notes are still too radioactive to touch today.",
    topics: ["chemistry", "physics"],
    qualityScore: 0.91,
    gradeLevel: "9-12",
    character: CHARACTERS[2],
    thumbnailColor: "#201020",
    posterUrl:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-scientist-working-with-the-microscope-4770-large.mp4",
    durationSec: 62,
    viewCount: 3_700_000,
  },
  {
    id: "c4",
    title: "To be or not to be — what Hamlet really means",
    sourceUrl: "https://tiktok.com/@litreal/video/4",
    platform: "tiktok",
    transcript:
      "Hamlet's famous soliloquy is really a logical argument about existence vs. non-existence. He's weighing the pain of living against the unknown terror of death — using conditional logic centuries before formal logic existed.",
    topics: ["literature"],
    qualityScore: 0.88,
    gradeLevel: "9-12",
    character: CHARACTERS[3],
    thumbnailColor: "#201a00",
    posterUrl:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-person-reading-a-book-by-a-window-4827-large.mp4",
    durationSec: 84,
    viewCount: 1_900_000,
  },
  {
    id: "c5",
    title: "The Gettysburg Address: every sentence is a rhetorical move",
    sourceUrl: "https://instagram.com/p/hist-real-1",
    platform: "instagram",
    transcript:
      "Lincoln's 272-word speech uses a specific rhetorical structure: past → present → future. He starts with 'four score and seven years ago' to ground the new nation in its founding promise, then redefines the war as a test of that promise.",
    topics: ["history", "literature"],
    qualityScore: 0.93,
    gradeLevel: "9-12",
    character: CHARACTERS[4],
    thumbnailColor: "#102010",
    posterUrl:
      "https://images.unsplash.com/photo-1461360238753-050bbfe0b439?auto=format&fit=crop&w=900&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-old-books-in-a-library-4834-large.mp4",
    durationSec: 71,
    viewCount: 2_200_000,
  },
];

export const MOCK_BOOKS: Book[] = [
  {
    id: "b1",
    title: "Physics Essentials",
    items: [],
    coverColor: "#4f6ef7",
    gradeLevel: "9-12",
  },
  {
    id: "b2",
    title: "World History",
    items: [],
    coverColor: "#27ae60",
    gradeLevel: "college",
  },
  {
    id: "b3",
    title: "Calculus Concepts",
    items: [],
    coverColor: "#9b59b6",
    gradeLevel: "9-12",
  },
];

export const MOCK_SAVED: SavedItem[] = [
  {
    id: "s1",
    contentId: "c1",
    title: "Laws of Motion",
    topic: "physics",
    savedAt: new Date("2026-06-05"),
    notes: "F = ma is the short form",
    bookId: "b1",
  },
  {
    id: "s2",
    contentId: "c2",
    title: "Euler's Identity",
    topic: "math",
    savedAt: new Date("2026-06-04"),
    notes: "Review before midterm",
    bookId: "b3",
  },
  {
    id: "s3",
    contentId: "c5",
    title: "Gettysburg Address",
    topic: "history",
    savedAt: new Date("2026-06-03"),
    notes: "",
    bookId: "b2",
  },
];
