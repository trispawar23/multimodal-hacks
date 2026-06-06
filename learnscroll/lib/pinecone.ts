/**
 * Pinecone vector database utilities for Luminary.
 *
 * Uses Pinecone to store and retrieve content embeddings,
 * enabling semantic search and RAG for character responses.
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const INDEX_NAME = "learnscroll-content";
const NAMESPACE = "educational-content";

let pineconeClient: Pinecone | null = null;

function pineconeLog(event: string, details: Record<string, unknown> = {}) {
  console.log(
    `[Luminary:Pinecone] ${event}`,
    JSON.stringify(
      {
        index: INDEX_NAME,
        namespace: NAMESPACE,
        ...details,
      },
      null,
      2
    )
  );
}

function pineconeError(event: string, error: unknown, details: Record<string, unknown> = {}) {
  console.error(
    `[Luminary:Pinecone] ${event}`,
    JSON.stringify(
      {
        index: INDEX_NAME,
        namespace: NAMESPACE,
        error: error instanceof Error ? error.message : String(error),
        ...details,
      },
      null,
      2
    )
  );
}

function getPineconeClient() {
  if (!PINECONE_API_KEY) throw new Error("PINECONE_API_KEY not set in environment");
  if (!pineconeClient) {
    pineconeLog("client.init", { hasApiKey: true });
    pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY });
  } else {
    pineconeLog("client.reuse");
  }
  return pineconeClient;
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  pineconeLog("embedding.request", {
    model: "models/gemini-embedding-2",
    textLength: text.length,
    preview: text.slice(0, 120),
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-embedding-2:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    pineconeError("embedding.error", JSON.stringify(error), {
      status: response.status,
      textLength: text.length,
    });
    throw new Error(`Embedding API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  pineconeLog("embedding.success", {
    dimensions: data.embedding.values.length,
    textLength: text.length,
  });
  return data.embedding.values;
}

// ─── Content indexing ─────────────────────────────────────────────────────

export interface ContentVector {
  contentId: string;
  title: string;
  transcript: string;
  topics: string[];
  gradeLevel: string;
}

export async function indexContent(content: ContentVector[]): Promise<void> {
  try {
    pineconeLog("index.start", {
      itemCount: content.length,
      contentIds: content.map((item) => item.contentId),
    });
    const pc = getPineconeClient();
    const index = pc.Index(INDEX_NAME);

    const vectors = await Promise.all(
      content.map(async (item, idx) => {
        pineconeLog("index.item.embedding.start", {
          position: idx + 1,
          contentId: item.contentId,
          title: item.title,
          topics: item.topics,
          gradeLevel: item.gradeLevel,
          transcriptLength: item.transcript.length,
        });
        const embedding = await getEmbedding(`${item.title} ${item.transcript}`);
        pineconeLog("index.item.embedding.done", {
          position: idx + 1,
          contentId: item.contentId,
          dimensions: embedding.length,
        });
        return {
          id: item.contentId,
          values: embedding,
          metadata: {
            title: item.title,
            transcript: item.transcript,
            topics: item.topics.join(","),
            gradeLevel: item.gradeLevel,
          },
        };
      })
    );

    pineconeLog("index.upsert.start", {
      vectorCount: vectors.length,
      vectorIds: vectors.map((vector) => vector.id),
      dimensions: vectors[0]?.values.length ?? 0,
    });
    await index.namespace(NAMESPACE).upsert({ records: vectors });
    pineconeLog("index.upsert.success", {
      vectorCount: vectors.length,
      vectorIds: vectors.map((vector) => vector.id),
    });
  } catch (error) {
    pineconeError("index.error", error, { itemCount: content.length });
    throw error;
  }
}

// ─── Semantic search ──────────────────────────────────────────────────────

export interface SearchResult {
  contentId: string;
  title: string;
  transcript: string;
  topics: string[];
  gradeLevel: string;
  score: number;
}

export async function searchContent(
  query: string,
  topK: number = 3
): Promise<SearchResult[]> {
  try {
    pineconeLog("search.start", {
      query,
      queryLength: query.length,
      topK,
    });
    const pc = getPineconeClient();
    const index = pc.Index(INDEX_NAME);

    const queryEmbedding = await getEmbedding(query);
    pineconeLog("search.embedding.ready", {
      dimensions: queryEmbedding.length,
      topK,
    });

    pineconeLog("search.query.start", {
      topK,
      includeMetadata: true,
    });
    const results = await index.namespace(NAMESPACE).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    pineconeLog("search.query.raw", {
      rawMatchCount: results.matches.length,
      matches: results.matches.map((match, idx) => ({
        position: idx + 1,
        id: match.id,
        score: match.score ?? 0,
        hasMetadata: Boolean(match.metadata),
        metadataKeys: match.metadata ? Object.keys(match.metadata) : [],
      })),
    });

    const matches = results.matches
      .filter((match) => match.metadata)
      .map((match) => ({
        contentId: match.id,
        title: (match.metadata as any).title,
        transcript: (match.metadata as any).transcript,
        topics: ((match.metadata as any).topics ?? "").split(",").filter((t: string) => t),
        gradeLevel: (match.metadata as any).gradeLevel,
        score: match.score ?? 0,
      }));

    pineconeLog("search.success", {
      matchCount: matches.length,
      matches: matches.map((m, idx) => ({
        position: idx + 1,
        contentId: m.contentId,
        title: m.title,
        gradeLevel: m.gradeLevel,
        topics: m.topics,
        score: m.score,
        transcriptLength: m.transcript.length,
      })),
    });

    return matches;
  } catch (error) {
    pineconeError("search.error", error, { query, topK });
    return [];
  }
}

// ─── RAG for character responses ──────────────────────────────────────────

export async function retrieveContextForCharacter(
  question: string,
  currentTranscript: string,
  topK: number = 2
): Promise<string> {
  try {
    pineconeLog("rag.start", {
      question,
      questionLength: question.length,
      currentTranscriptLength: currentTranscript.length,
      topK,
    });
    const results = await searchContent(question, topK);

    if (results.length === 0) {
      pineconeLog("rag.no_matches", {
        fallback: "current_transcript_only",
        currentTranscriptLength: currentTranscript.length,
      });
      return currentTranscript;
    }

    pineconeLog("rag.matches.selected", {
      matchCount: results.length,
      selected: results.map((result, idx) => ({
        position: idx + 1,
        contentId: result.contentId,
        title: result.title,
        score: result.score,
        excerptLength: Math.min(result.transcript.length, 500),
      })),
    });

    const context = results
      .map(
        (r) =>
          `From "${r.title}" (Grade ${r.gradeLevel}):\n${r.transcript.substring(0, 500)}...`
      )
      .join("\n\n---\n\n");

    const fullContext = `${currentTranscript}\n\n[ADDITIONAL CONTEXT FROM PINECONE]\n${context}`;
    pineconeLog("rag.context.built", {
      currentTranscriptLength: currentTranscript.length,
      additionalContextLength: context.length,
      fullContextLength: fullContext.length,
    });
    return fullContext;
  } catch (error) {
    pineconeError("rag.error", error, {
      question,
      fallback: "current_transcript_only",
    });
    return currentTranscript; // Fallback to original transcript
  }
}

// ─── Topic extraction (for initial indexing) ──────────────────────────────

export async function extractTopicsFromContent(transcript: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-latest" });

  const prompt = `Extract 3-5 main topics from this educational content transcript. Return only topic names separated by commas.

Transcript: "${transcript.substring(0, 1000)}"

Topics:`;

  const result = await model.generateContent(prompt);
  const topics = result.response
    .text()
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return topics;
}
