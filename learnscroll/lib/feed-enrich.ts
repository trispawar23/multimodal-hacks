import { voiceWrapTemplate } from "./character-script";
import { getPersonality } from "./personalities";
import { isPortraitUrlForCharacter } from "./portrait-validation";
import { fetchWebPortraitUrl } from "./web-portraits";
import {
  adaptWikiForGrade,
  discoverRandomWikiConcept,
  type WikiSummary,
} from "./wikipedia-content";
import type { GradeLevel, Topic } from "./types";

export interface EnrichInput {
  topic: Topic;
  gradeLevel: GradeLevel;
  characterId: string;
  templateTitle: string;
  templateTranscript: string;
  scrollIndex: number;
  portraitVariant?: number;
}

export interface EnrichResult {
  title: string;
  transcript: string;
  sourceUrl: string;
  posterUrl?: string;
  wikiTitle?: string;
  enriched: boolean;
}

function supplementTranscript(
  templateTranscript: string,
  wikiExtract: string,
  gradeLevel: GradeLevel
): string {
  const wikiSentence =
    wikiExtract.match(/[^.!?]+[.!?]+/g)?.[0]?.trim() ?? wikiExtract.slice(0, 180);
  if (!wikiSentence) return templateTranscript;
  if (templateTranscript.includes(wikiSentence.slice(0, 40))) return templateTranscript;

  if (gradeLevel === "K-5" || gradeLevel === "6-8") {
    return `${templateTranscript} Here is another way to think about it: ${wikiSentence}`;
  }
  return `${templateTranscript} From what scholars document: ${wikiSentence}`;
}

function enrichedLessonTitle(
  characterId: string,
  wikiTitle: string,
  templateTitle: string
): string {
  const personality = getPersonality(characterId);
  const wikiLower = wikiTitle.trim().toLowerCase();
  const nameLower = personality.name.trim().toLowerCase();
  const firstLower = personality.name.split(" ")[0].toLowerCase();

  if (wikiLower === nameLower || wikiLower === firstLower) {
    return templateTitle;
  }
  if (templateTitle.toLowerCase().includes(wikiLower)) {
    return templateTitle;
  }
  if (!scrollUsesCharacterFocus(characterId, templateTitle)) {
    return templateTitle;
  }
  return `${personality.name} — ${wikiTitle}`;
}

function webPrimaryLesson(
  wiki: WikiSummary,
  topic: Topic,
  gradeLevel: GradeLevel,
  characterId: string,
  templateTitle: string
): { title: string; transcript: string } {
  const personality = getPersonality(characterId);
  const wrapped = voiceWrapTemplate(
    {
      title: wiki.title,
      transcript: wiki.extract,
      qualityScore: 0.91,
    },
    personality,
    topic,
    gradeLevel
  );

  const title = enrichedLessonTitle(characterId, wiki.title, templateTitle);

  return { title, transcript: wrapped.transcript };
}

function scrollUsesCharacterFocus(characterId: string, templateTitle: string): boolean {
  const name = getPersonality(characterId).name.split(" ")[0];
  return !templateTitle.toLowerCase().includes(name.toLowerCase());
}

export async function enrichFeedItem(input: EnrichInput): Promise<EnrichResult> {
  const wikiRaw = await discoverRandomWikiConcept(
    input.topic,
    input.scrollIndex
  );

  if (!wikiRaw) {
    return {
      title: input.templateTitle,
      transcript: input.templateTranscript,
      sourceUrl: "https://learnscroll.app/instant",
      enriched: false,
    };
  }

  const wiki = adaptWikiForGrade(wikiRaw, input.gradeLevel, input.characterId);
  const mode = input.scrollIndex % 3;

  let title = input.templateTitle;
  let transcript = input.templateTranscript;

  if (mode === 0) {
    const lesson = webPrimaryLesson(
      wiki,
      input.topic,
      input.gradeLevel,
      input.characterId,
      input.templateTitle
    );
    title = lesson.title;
    transcript = lesson.transcript;
  } else if (mode === 1) {
    transcript = supplementTranscript(
      input.templateTranscript,
      wiki.extract,
      input.gradeLevel
    );
    title =
      input.scrollIndex % 2 === 0
        ? `${input.templateTitle} — plus ${wiki.title}`
        : input.templateTitle;
  } else {
    const lesson = webPrimaryLesson(
      wiki,
      input.topic,
      input.gradeLevel,
      input.characterId,
      input.templateTitle
    );
    title = lesson.title;
    transcript = `${input.templateTranscript} ${lesson.transcript}`;
    transcript = transcript.slice(0, gradeLevelCap(input.gradeLevel));
  }

  const posterUrl = await pickEnrichedImage(input, wiki);

  return {
    title,
    transcript,
    sourceUrl: wiki.url,
    posterUrl,
    wikiTitle: wiki.title,
    enriched: true,
  };
}

function gradeLevelCap(gradeLevel: GradeLevel): number {
  switch (gradeLevel) {
    case "K-5":
      return 420;
    case "6-8":
      return 560;
    case "9-12":
      return 720;
    default:
      return 900;
  }
}

async function pickEnrichedImage(
  input: EnrichInput,
  _wiki: WikiSummary
): Promise<string | undefined> {
  const portrait = await fetchWebPortraitUrl(
    input.characterId,
    input.gradeLevel,
    input.portraitVariant ?? 0
  );
  const url = portrait.posterUrl ?? undefined;
  if (url && !isPortraitUrlForCharacter(input.characterId, url)) {
    return undefined;
  }
  return url;
}
