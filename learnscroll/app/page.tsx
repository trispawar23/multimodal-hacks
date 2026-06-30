"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReelSlide } from "@/components/ReelSlide";
import { TopicFilterBar } from "@/components/TopicFilterBar";
import { GradeSelector } from "@/components/GradeSelector";
import { PageShell } from "@/components/layout/PageShell";
import {
  createFeedRecent,
  createPlaceholderFeed,
  createPlaceholderReel,
  pickTopicForFeed,
  preloadPortraits,
  type FeedRecent,
} from "@/lib/instant-slop";
import {
  recordCharacter,
  recordConcept,
  recordPortraitVariant,
  recordPortraitUrl,
  recordTopicCharacter,
  recentCharactersForHydrate,
  recentConceptsForHydrate,
  recentFigureNamesForHydrate,
  conceptKey,
} from "@/lib/feed-diversity";
import { fetchWebReel } from "@/lib/feed-client";
import { buildInlineFallbackReel } from "@/lib/feed-fallback";
import { pickPersonality } from "@/lib/personalities";
import { topicAllowedForGrade } from "@/lib/grade-topics";
import { preloadVoices } from "@/lib/character-voice";
import { stopAllCharacterSpeech } from "@/lib/voice-playback";
import {
  readFeedMuted,
  writeFeedMuted,
  readSavedGrade,
  writeSavedGrade,
  unlockFeedSpeech,
} from "@/lib/feed-audio";
import {
  clearPortraitCache,
  clearWebPortraitCache,
  fetchPortraitForItem,
  forgetCachedPortrait,
  getCachedPortrait,
} from "@/lib/portrait-client";
import { getSavedIds, saveContent, toggleSaveContent } from "@/lib/saved-store";
import { isCharacterPortraitUrl, isPortraitUrlForCharacter } from "@/lib/portrait-validation";
import {
  loadSessionConcepts,
  mergeConceptExcludes,
  persistSessionConcept,
  sessionScrollOffset,
} from "@/lib/session-concepts";
import type { ContentItem, GradeLevel, Topic } from "@/lib/types";

const PORTRAIT_FETCH_DELAY_MS = 0;
const DEFAULT_GRADE: GradeLevel = "9-12";

export default function FeedPage() {
  const router = useRouter();

  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(DEFAULT_GRADE);
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");
  const [feedItems, setFeedItems] = useState<ContentItem[]>([]);
  const mainRef = useRef<HTMLElement>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => getSavedIds());
  const [muted, setMuted] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const visibleRatiosRef = useRef<Map<string, number>>(new Map());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const feedItemsRef = useRef(feedItems);
  const portraitTimerRef = useRef<number | null>(null);
  const portraitInflightRef = useRef<string | null>(null);
  const pendingPortraitIdRef = useRef<string | null>(null);
  const attemptedPortraitRef = useRef<Set<string>>(new Set());
  const portraitFailuresRef = useRef<Map<string, number>>(new Map());
  const hydrateInflightRef = useRef<Set<string>>(new Set());
  const hydrateQueueRef = useRef<string[]>([]);
  const MAX_PARALLEL_HYDRATE = 2;
  const attemptedHydrateRef = useRef<Set<string>>(new Set());
  const visibleReelIdRef = useRef<string | null>(null);
  const feedRecentRef = useRef<FeedRecent>(createFeedRecent());
  const feedSequenceRef = useRef(0);
  const topicFilterRef = useRef(topicFilter);
  const skipNextFilterRebuildRef = useRef(false);
  const skipInitialFilterEffectRef = useRef(true);
  const hydrateWebReelRef = useRef<(shell: ContentItem) => void>(() => {});
  const hydrateRetriesRef = useRef<Map<string, number>>(new Map());
  const pendingConceptsRef = useRef<string[]>([]);
  const pendingCharactersRef = useRef<string[]>([]);
  feedItemsRef.current = feedItems;
  topicFilterRef.current = topicFilter;

  useEffect(() => {
    preloadPortraits();
    preloadVoices();
    setSavedIds(getSavedIds());
    setMuted(readFeedMuted());

    const unlock = () => unlockFeedSpeech();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, { capture: true });
      document.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const primeOnGesture = () => unlockFeedSpeech();
    main.addEventListener("scroll", primeOnGesture, { passive: true });
    main.addEventListener("touchstart", primeOnGesture, { passive: true });
    return () => {
      main.removeEventListener("scroll", primeOnGesture);
      main.removeEventListener("touchstart", primeOnGesture);
    };
  }, []);

  function handleToggleMute() {
    setMuted((prev) => {
      const next = !prev;
      writeFeedMuted(next);
      if (next) {
        stopAllCharacterSpeech();
      }
      return next;
    });
  }

  const lazyUpgradePortrait = useCallback((item: ContentItem) => {
    if (item.enrichPending || item.character.id === "loading") return;
    const needsPortrait = item.wantAiPortrait || !item.posterUrl;
    if (!needsPortrait) return;
    if (attemptedPortraitRef.current.has(item.id)) return;

    if (portraitInflightRef.current) {
      pendingPortraitIdRef.current = item.id;
      return;
    }

    const cached = getCachedPortrait(item);
    if (cached && isCharacterPortraitUrl(item.character.id, cached, item.character.name)) {
      attemptedPortraitRef.current.add(item.id);
      setFeedItems((prev) =>
        prev.map((i) =>
          i.id === item.id && i.character.id === item.character.id
            ? {
                ...i,
                posterUrl: cached,
                wantAiPortrait: false,
                imagePending: false,
              }
            : i
        )
      );
      return;
    }

    portraitInflightRef.current = item.id;

    fetchPortraitForItem(item)
      .then(({ posterUrl }) => {
        if (!posterUrl || !isPortraitUrlForCharacter(item.character.id, posterUrl, item.character.name)) {
          attemptedPortraitRef.current.add(item.id);
          setFeedItems((prev) =>
            prev.map((i) =>
              i.id === item.id && i.character.id === item.character.id
                ? { ...i, wantAiPortrait: false, imagePending: false }
                : i
            )
          );
          return;
        }
        const isFinalPortrait = isCharacterPortraitUrl(item.character.id, posterUrl, item.character.name);
        const current = feedItemsRef.current.find((i) => i.id === item.id);
        if (!current || current.character.id !== item.character.id) return;
        if (isFinalPortrait) {
          attemptedPortraitRef.current.add(item.id);
        }
        setFeedItems((prev) =>
          prev.map((i) =>
            i.id === item.id && i.character.id === item.character.id
              ? {
                  ...i,
                  posterUrl,
                  wantAiPortrait: !isFinalPortrait,
                  imagePending: false,
                }
              : i
          )
        );
        if (isFinalPortrait) {
          recordPortraitUrl(feedRecentRef.current, posterUrl);
        }
      })
      .catch((err) => {
        console.warn("Portrait generation failed for", item.id, err);
        attemptedPortraitRef.current.add(item.id);
        setFeedItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, wantAiPortrait: false, imagePending: false }
              : i
          )
        );
      })
      .finally(() => {
        if (portraitInflightRef.current === item.id) {
          portraitInflightRef.current = null;
        }
        const pending = pendingPortraitIdRef.current;
        pendingPortraitIdRef.current = null;
        if (pending && pending !== item.id) {
          const next = feedItemsRef.current.find((i) => i.id === pending);
          if (next) lazyUpgradePortrait(next);
        }
        const visibleId = visibleReelIdRef.current;
        if (visibleId) {
          const visible = feedItemsRef.current.find((i) => i.id === visibleId);
          if (
            visible &&
            visible.wantAiPortrait &&
            !attemptedPortraitRef.current.has(visibleId)
          ) {
            lazyUpgradePortrait(visible);
          }
        }
      });
  }, []);

  const handlePortraitBroken = useCallback((itemId: string) => {
    const item = feedItemsRef.current.find((i) => i.id === itemId);
    if (!item || item.enrichPending || item.character.id === "loading") return;

    const failures = (portraitFailuresRef.current.get(itemId) ?? 0) + 1;
    portraitFailuresRef.current.set(itemId, failures);
    if (failures > 4) return;

    forgetCachedPortrait(item);
    attemptedPortraitRef.current.delete(itemId);
    const nextVariant = (item.portraitVariant ?? 0) + 1;

    setFeedItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              posterUrl: "",
              portraitVariant: nextVariant,
              wantAiPortrait: true,
              imagePending: true,
            }
          : i
      )
    );

    const retryItem: ContentItem = {
      ...item,
      portraitVariant: nextVariant,
      posterUrl: "",
      wantAiPortrait: true,
      imagePending: true,
    };

    fetchPortraitForItem(retryItem)
      .then(({ posterUrl }) => {
        if (!posterUrl || !isPortraitUrlForCharacter(item.character.id, posterUrl, item.character.name)) {
          return;
        }
        setFeedItems((prev) =>
          prev.map((i) =>
            i.id === itemId && i.character.id === item.character.id
              ? {
                  ...i,
                  posterUrl,
                  portraitVariant: nextVariant,
                  wantAiPortrait: false,
                  imagePending: false,
                }
              : i
          )
        );
        recordPortraitUrl(feedRecentRef.current, posterUrl);
      })
      .catch((err) => {
        console.warn("Portrait retry failed for", itemId, err);
      });
  }, []);

  const hydrateWebReel = useCallback(
    (shell: ContentItem) => {
      if (!shell.enrichPending) return;
      if (attemptedHydrateRef.current.has(shell.id)) return;

      if (hydrateInflightRef.current.has(shell.id)) return;

      if (hydrateInflightRef.current.size >= MAX_PARALLEL_HYDRATE) {
        if (!hydrateQueueRef.current.includes(shell.id)) {
          hydrateQueueRef.current.push(shell.id);
        }
        return;
      }

      const topic = shell.topics[0];
      if (!topic) return;

      hydrateInflightRef.current.add(shell.id);

      const runQueued = () => {
        while (
          hydrateInflightRef.current.size < MAX_PARALLEL_HYDRATE &&
          hydrateQueueRef.current.length > 0
        ) {
          const nextId = hydrateQueueRef.current.shift();
          if (!nextId) break;
          const next = feedItemsRef.current.find((i) => i.id === nextId);
          if (next?.enrichPending && !attemptedHydrateRef.current.has(nextId)) {
            hydrateWebReel(next);
            break;
          }
        }
      };

      const retryAttempt = hydrateRetriesRef.current.get(shell.id) ?? 0;
      const lightExclude = retryAttempt >= 1;

      const recentForPick = recentCharactersForHydrate(
        feedRecentRef.current,
        topic,
        feedItemsRef.current,
        pendingCharactersRef.current
      );

      const reserved = pickPersonality(
        topic,
        shell.gradeLevel,
        recentForPick,
        shell.scrollIndex ?? 0,
        feedRecentRef.current
      );

      pendingCharactersRef.current = [
        reserved.id,
        ...pendingCharactersRef.current.filter((id) => id !== reserved.id),
      ];

      fetchWebReel({
        topic,
        gradeLevel: shell.gradeLevel,
        scrollIndex: shell.scrollIndex ?? 0,
        preferredCharacterId: reserved.id,
        recentCharacterIds: recentForPick,
        recentFigureNames: lightExclude
          ? []
          : recentFigureNamesForHydrate(
              feedRecentRef.current,
              topic,
              feedItemsRef.current
            ),
        recentConcepts: lightExclude
          ? []
          : mergeConceptExcludes(
              topic,
              recentConceptsForHydrate(
                feedRecentRef.current,
                topic,
                feedItemsRef.current,
                pendingConceptsRef.current
              ),
              pendingConceptsRef.current
            ),
        recentPortraitUrls: lightExclude ? [] : feedRecentRef.current.portraitUrls,
        topicCharacterHistory: feedRecentRef.current.topicCharacterHistory,
      })
        .then((result) => {
          const conceptReservation = conceptKey(topic, result.wikiTitle);
          pendingConceptsRef.current = [
            conceptReservation,
            ...pendingConceptsRef.current.filter((k) => k !== conceptReservation),
          ];
          pendingCharactersRef.current = [
            result.characterId,
            ...pendingCharactersRef.current.filter((id) => id !== result.characterId),
          ];
          recordConcept(feedRecentRef.current, topic, result.wikiTitle);
          persistSessionConcept(topic, result.wikiTitle, result.characterId);

          attemptedPortraitRef.current.delete(shell.id);
          portraitFailuresRef.current.delete(shell.id);
          attemptedHydrateRef.current.add(shell.id);
          hydrateRetriesRef.current.delete(shell.id);
          recordCharacter(
            feedRecentRef.current,
            result.characterId,
            result.character.name
          );
          recordTopicCharacter(feedRecentRef.current, topic, result.characterId);
          recordPortraitVariant(
            feedRecentRef.current,
            topic,
            result.characterId,
            result.portraitVariant
          );

          const posterUrl =
            result.posterUrl &&
            isPortraitUrlForCharacter(
              result.characterId,
              result.posterUrl,
              result.character.name
            )
              ? result.posterUrl
              : "";

          const hasCharacterPortrait =
            Boolean(posterUrl) &&
            isCharacterPortraitUrl(
              result.characterId,
              posterUrl,
              result.character.name
            );

          if (posterUrl) {
            recordPortraitUrl(feedRecentRef.current, posterUrl);
          }

          const portraitStyle =
            result.characterId === "sunny" ||
            result.characterId === "einstein-cartoon"
              ? "illustration"
              : "realistic";

          setFeedItems((prev) =>
            prev.map((i) =>
              i.id === shell.id
                ? {
                    ...i,
                    title: result.title,
                    transcript: result.transcript,
                    sourceUrl: result.sourceUrl,
                    posterUrl,
                    wikiTitle: result.wikiTitle,
                    character: result.character,
                    thumbnailColor: result.character.color,
                    portraitStyle,
                    portraitVariant: result.portraitVariant,
                    qualityScore: result.qualityScore,
                    enrichPending: false,
                    imagePending: false,
                    wantAiPortrait: !posterUrl,
                  }
                : i
            )
          );

          lazyUpgradePortrait({
            ...shell,
            title: result.title,
            character: result.character,
            thumbnailColor: result.character.color,
            portraitStyle,
            portraitVariant: result.portraitVariant,
            posterUrl,
            enrichPending: false,
            imagePending: false,
            wantAiPortrait: !posterUrl,
          });
        })
        .catch((err) => {
          console.warn("Web reel failed for", shell.id, err);
          const retries = hydrateRetriesRef.current.get(shell.id) ?? 0;
          if (retries < 2) {
            hydrateRetriesRef.current.set(shell.id, retries + 1);
            attemptedHydrateRef.current.delete(shell.id);
            window.setTimeout(() => {
              const current = feedItemsRef.current.find((i) => i.id === shell.id);
              if (current?.enrichPending) hydrateWebReel(current);
            }, 400 * (retries + 1));
            return;
          }

          const fallback = buildInlineFallbackReel({
            topic,
            gradeLevel: shell.gradeLevel,
            scrollIndex: shell.scrollIndex ?? 0,
            recentCharacterIds: recentCharactersForHydrate(
              feedRecentRef.current,
              topic,
              feedItemsRef.current,
              pendingCharactersRef.current
            ),
            topicCharacterHistory: feedRecentRef.current.topicCharacterHistory,
          });

          attemptedHydrateRef.current.add(shell.id);
          hydrateRetriesRef.current.delete(shell.id);
          recordCharacter(
            feedRecentRef.current,
            fallback.characterId,
            fallback.character.name
          );
          recordTopicCharacter(feedRecentRef.current, topic, fallback.characterId);

          const portraitStyle =
            fallback.characterId === "sunny" ||
            fallback.characterId === "einstein-cartoon"
              ? "illustration"
              : "realistic";

          setFeedItems((prev) =>
            prev.map((i) =>
              i.id === shell.id
                ? {
                    ...i,
                    title: fallback.title,
                    transcript: fallback.transcript,
                    sourceUrl: fallback.sourceUrl,
                    posterUrl: fallback.posterUrl ?? "",
                    wikiTitle: fallback.wikiTitle,
                    character: fallback.character,
                    thumbnailColor: fallback.character.color,
                    portraitStyle,
                    portraitVariant: fallback.portraitVariant,
                    qualityScore: fallback.qualityScore,
                    enrichPending: false,
                    imagePending: false,
                    wantAiPortrait: !fallback.posterUrl,
                  }
                : i
            )
          );

          lazyUpgradePortrait({
            ...shell,
            title: fallback.title,
            character: fallback.character,
            thumbnailColor: fallback.character.color,
            portraitStyle,
            portraitVariant: fallback.portraitVariant,
            posterUrl: fallback.posterUrl ?? "",
            enrichPending: false,
            imagePending: false,
            wantAiPortrait: !fallback.posterUrl,
          });
        })
        .finally(() => {
          hydrateInflightRef.current.delete(shell.id);
          runQueued();
        });
    },
    [lazyUpgradePortrait]
  );
  hydrateWebReelRef.current = hydrateWebReel;

  const scheduleLazyPortrait = useCallback(
    (id: string) => {
      if (portraitTimerRef.current) {
        window.clearTimeout(portraitTimerRef.current);
      }
      portraitTimerRef.current = window.setTimeout(() => {
        const item = feedItemsRef.current.find((i) => i.id === id);
        if (item) lazyUpgradePortrait(item);
        portraitTimerRef.current = null;
      }, PORTRAIT_FETCH_DELAY_MS);
    },
    [lazyUpgradePortrait]
  );

  const cancelLazyPortrait = useCallback(() => {
    if (portraitTimerRef.current) {
      window.clearTimeout(portraitTimerRef.current);
      portraitTimerRef.current = null;
    }
  }, []);

  const handleReelVisibility = useCallback(
    (id: string, visible: boolean, ratio = 0) => {
      if (visible) {
        visibleRatiosRef.current.set(id, ratio);
        const [mostVisibleId] = [...visibleRatiosRef.current.entries()].sort(
          (a, b) => b[1] - a[1]
        )[0] ?? [id, ratio];
        visibleReelIdRef.current = mostVisibleId;
        setActiveReelId(mostVisibleId);
        const item = feedItemsRef.current.find((i) => i.id === id);
        if (item?.enrichPending) {
          hydrateWebReel(item);
        }
        scheduleLazyPortrait(id);
      } else {
        visibleRatiosRef.current.delete(id);
        if (visibleReelIdRef.current === id) {
          const [nextVisibleId] = [...visibleRatiosRef.current.entries()].sort(
            (a, b) => b[1] - a[1]
          )[0] ?? [null, 0];
          visibleReelIdRef.current = nextVisibleId;
          setActiveReelId(nextVisibleId);
        }
        stopAllCharacterSpeech(id);
        portraitFailuresRef.current.delete(id);
        attemptedPortraitRef.current.delete(id);
      }
    },
    [hydrateWebReel, scheduleLazyPortrait]
  );

  const rebuildFeed = useCallback(
    (topic: Topic | "all", grade: GradeLevel) => {
      cancelLazyPortrait();
      portraitInflightRef.current = null;
      pendingPortraitIdRef.current = null;
      attemptedPortraitRef.current.clear();
      portraitFailuresRef.current.clear();
      attemptedHydrateRef.current.clear();
      hydrateInflightRef.current.clear();
      hydrateQueueRef.current = [];
      hydrateRetriesRef.current.clear();
      pendingConceptsRef.current = [];
      pendingCharactersRef.current = [];
      visibleRatiosRef.current.clear();

      const preservedConcepts = loadSessionConcepts();
      const preservedHistory = feedRecentRef.current.topicCharacterHistory;
      const preservedCharacters = feedRecentRef.current.characters;
      const preservedCharacterNames = feedRecentRef.current.characterNames;

      feedRecentRef.current = createFeedRecent();
      feedRecentRef.current.concepts = preservedConcepts.slice(0, 64);
      feedRecentRef.current.topicCharacterHistory = preservedHistory;
      feedRecentRef.current.characters = preservedCharacters.slice(0, 32);
      feedRecentRef.current.characterNames = preservedCharacterNames.slice(0, 32);

      const scrollStart =
        topic === "all"
          ? preservedConcepts.length
          : sessionScrollOffset(topic);
      clearPortraitCache();
      clearWebPortraitCache();

      const shells = createPlaceholderFeed(
        topic,
        grade,
        4,
        feedRecentRef.current,
        scrollStart
      );
      feedSequenceRef.current = scrollStart + shells.length;
      visibleReelIdRef.current = shells[0]?.id ?? null;
      setActiveReelId(shells[0]?.id ?? null);
      setFeedItems(shells);
      for (const shell of shells) {
        hydrateWebReel(shell);
      }
    },
    [cancelLazyPortrait, hydrateWebReel]
  );

  const handleGradeChange = useCallback(
    (grade: GradeLevel) => {
      setGradeLevel(grade);
      writeSavedGrade(grade);
      stopAllCharacterSpeech();
      mainRef.current?.scrollTo({ top: 0, behavior: "instant" });

      let topic = topicFilterRef.current;
      if (topic !== "all" && !topicAllowedForGrade(topic, grade)) {
        setTopicFilter("all");
        topic = "all";
      }

      skipNextFilterRebuildRef.current = true;
      rebuildFeed(topic, grade);
    },
    [rebuildFeed]
  );

  useEffect(() => {
    if (feedItemsRef.current.length > 0) return;

    const grade = readSavedGrade() ?? DEFAULT_GRADE;
    if (grade !== gradeLevel) {
      skipNextFilterRebuildRef.current = true;
      setGradeLevel(grade);
    }

    const recent = createFeedRecent();
    recent.concepts = loadSessionConcepts().slice(0, 64);
    const scrollStart = sessionScrollOffset();
    const shells = createPlaceholderFeed(
      "all",
      grade,
      4,
      recent,
      scrollStart
    );

    feedRecentRef.current = recent;
    feedSequenceRef.current = scrollStart + shells.length;
    visibleReelIdRef.current = shells[0]?.id ?? null;
    feedItemsRef.current = shells;
    setActiveReelId(shells[0]?.id ?? null);
    setFeedItems(shells);

    for (const shell of shells) {
      hydrateWebReelRef.current(shell);
    }
  }, []);

  // Recover if client JS missed the first bootstrap (e.g. strict mode or stale HMR).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (feedItemsRef.current.length > 0) return;

      const grade = readSavedGrade() ?? DEFAULT_GRADE;
      const recent = createFeedRecent();
      recent.concepts = loadSessionConcepts().slice(0, 64);
      const scrollStart = sessionScrollOffset();
      const shells = createPlaceholderFeed("all", grade, 4, recent, scrollStart);

      feedRecentRef.current = recent;
      feedSequenceRef.current = scrollStart + shells.length;
      visibleReelIdRef.current = shells[0]?.id ?? null;
      feedItemsRef.current = shells;
      setActiveReelId(shells[0]?.id ?? null);
      setFeedItems(shells);

      for (const shell of shells) {
        hydrateWebReelRef.current(shell);
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skipInitialFilterEffectRef.current) {
      skipInitialFilterEffectRef.current = false;
      return;
    }

    if (skipNextFilterRebuildRef.current) {
      skipNextFilterRebuildRef.current = false;
      return;
    }

    if (
      topicFilter !== "all" &&
      !topicAllowedForGrade(topicFilter, gradeLevel)
    ) {
      setTopicFilter("all");
      return;
    }

    if (feedItemsRef.current.length === 0) return;

    rebuildFeed(topicFilter, gradeLevel);
  }, [topicFilter, gradeLevel, rebuildFeed]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingMoreRef.current) return;
        loadingMoreRef.current = true;

        const scrollIndex = feedSequenceRef.current++;
        const topic = pickTopicForFeed(
          topicFilter,
          gradeLevel,
          scrollIndex,
          feedRecentRef.current
        );

        const shell = createPlaceholderReel(
          topic,
          gradeLevel,
          scrollIndex,
          feedRecentRef.current
        );

        setFeedItems((prev) => {
          loadingMoreRef.current = false;
          return [...prev, shell];
        });
        hydrateWebReel(shell);
      },
      { rootMargin: "60px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [topicFilter, gradeLevel, hydrateWebReel]);

  useEffect(() => () => cancelLazyPortrait(), [cancelLazyPortrait]);

  function handleSave(item: ContentItem) {
    toggleSaveContent(item);
    setSavedIds(getSavedIds());
  }

  function handleQuiz(item: ContentItem) {
    saveContent(item);
    setSavedIds(getSavedIds());
    const topic = item.topics[0] ?? "all";
    router.push(`/quiz?topic=${topic}`);
  }

  return (
    <PageShell fullHeight className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[7.5rem] bg-gradient-to-b from-black/60 via-black/30 to-transparent"
          aria-hidden
        />
        <div className="pointer-events-auto flex items-start justify-between gap-2 px-4 pt-4">
          <p className="text-[15px] font-semibold tracking-tight text-white drop-shadow-md">
            Luminary
          </p>
          <GradeSelector
            value={gradeLevel}
            onChange={handleGradeChange}
            className="max-w-[210px] shrink-0"
          />
        </div>
        <div className="pointer-events-auto">
          <TopicFilterBar
            selected={topicFilter}
            onChange={setTopicFilter}
            gradeLevel={gradeLevel}
          />
        </div>
      </div>

      <main
        ref={mainRef}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll no-scrollbar"
      >
        {feedItems.length === 0 ? (
          <section className="relative flex h-[100dvh] w-full flex-shrink-0 items-center justify-center bg-pastel-cream">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <div
                className="h-9 w-9 animate-spin rounded-full border-2 border-pastel-lilac border-t-transparent"
                aria-hidden
              />
              <p className="text-sm font-medium text-pastel-ink/80">
                Loading lessons…
              </p>
            </div>
          </section>
        ) : (
          feedItems.map((item, index) => (
            <ReelSlide
              key={item.id}
              item={item}
              priority={index === 0}
              muted={muted}
              speechActive={activeReelId === item.id}
              saved={savedIds.has(item.id)}
              onSave={() => handleSave(item)}
              onQuiz={() => handleQuiz(item)}
              onToggleMute={handleToggleMute}
              onVisibilityChange={handleReelVisibility}
              onPortraitBroken={handlePortraitBroken}
            />
          ))
        )}
        <div ref={loadMoreRef} className="h-px w-full" aria-hidden />
      </main>
    </PageShell>
  );
}
