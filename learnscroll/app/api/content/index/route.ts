import { NextResponse } from "next/server";
import { indexContent } from "@/lib/pinecone";
import { FEED_ITEMS } from "@/lib/mock-data";

export async function POST() {
  try {
    // Index all feed items to Pinecone
    const contentToIndex = FEED_ITEMS.map((item) => ({
      contentId: item.id,
      title: item.title,
      transcript: item.transcript,
      topics: item.topics,
      gradeLevel: item.gradeLevel,
    }));

    await indexContent(contentToIndex);

    return NextResponse.json({
      success: true,
      message: `Indexed ${contentToIndex.length} content items`,
      count: contentToIndex.length,
    });
  } catch (error) {
    console.error("Indexing error:", error);
    return NextResponse.json(
      { error: "Failed to index content", details: String(error) },
      { status: 500 }
    );
  }
}
