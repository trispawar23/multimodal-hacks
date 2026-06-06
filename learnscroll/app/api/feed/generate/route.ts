import { NextRequest, NextResponse } from "next/server";
import { FEED_ITEMS } from "@/lib/mock-data";
import type { Topic } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { topicFilter, gradeLevel, pageCursor } = await req.json() as {
      topicFilter?: Topic;
      gradeLevel?: string;
      pageCursor?: number;
    };

    // Filter by topic
    let items = topicFilter
      ? FEED_ITEMS.filter((item) => item.topics.includes(topicFilter))
      : FEED_ITEMS;

    // Filter by grade (simplified matching)
    if (gradeLevel) {
      items = items.filter((item) => item.gradeLevel === gradeLevel || item.gradeLevel === "college");
    }

    // Sort by quality score descending — this is where Pinecone RAG ranking would happen
    items = [...items].sort((a, b) => b.qualityScore - a.qualityScore);

    // Paginate
    const PAGE_SIZE = 10;
    const cursor = pageCursor ?? 0;
    const pageItems = items.slice(cursor, cursor + PAGE_SIZE);
    const nextCursor = cursor + PAGE_SIZE < items.length ? cursor + PAGE_SIZE : null;

    return NextResponse.json({
      items: pageItems,
      nextCursor,
      total: items.length,
      fallback: false,
    });
  } catch (error) {
    console.error("Feed generation error:", error);
    // Fallback: return all items
    return NextResponse.json({
      items: FEED_ITEMS,
      nextCursor: null,
      total: FEED_ITEMS.length,
      fallback: true,
    });
  }
}
