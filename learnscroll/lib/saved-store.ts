import type { ContentItem, Topic } from "./types";

const STORAGE_KEY = "learnscroll-saved-v1";

export interface SavedContent {
  savedAt: string;
  item: ContentItem;
}

function readStore(): SavedContent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedContent[];
  } catch {
    return [];
  }
}

function writeStore(entries: SavedContent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getSavedContents(): SavedContent[] {
  return readStore().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function isContentSaved(id: string): boolean {
  return readStore().some((s) => s.item.id === id);
}

export function saveContent(item: ContentItem): void {
  const store = readStore();
  if (store.some((s) => s.item.id === item.id)) return;
  writeStore([
    { savedAt: new Date().toISOString(), item },
    ...store,
  ]);
}

export function unsaveContent(id: string): void {
  writeStore(readStore().filter((s) => s.item.id !== id));
}

export function toggleSaveContent(item: ContentItem): boolean {
  if (isContentSaved(item.id)) {
    unsaveContent(item.id);
    return false;
  }
  saveContent(item);
  return true;
}

export function getSavedTopics(): Topic[] {
  const topics = new Set<Topic>();
  for (const { item } of readStore()) {
    for (const t of item.topics) topics.add(t);
  }
  return Array.from(topics);
}

export function getSavedByTopic(topic: Topic | "all"): SavedContent[] {
  const all = getSavedContents();
  if (topic === "all") return all;
  return all.filter((s) => s.item.topics.includes(topic));
}

export function getSavedIds(): Set<string> {
  return new Set(readStore().map((s) => s.item.id));
}
