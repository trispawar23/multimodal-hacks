import { NextRequest, NextResponse } from "next/server";
import { compileBookOutline } from "@/lib/gemini";
import { MOCK_SAVED, FEED_ITEMS, MOCK_BOOKS } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    const { userId, bookId, format = "pdf" } = await req.json() as {
      userId: string;
      bookId: string;
      format: "pdf" | "epub";
    };

    const book = MOCK_BOOKS.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const savedItems = MOCK_SAVED.filter((s) => s.bookId === bookId);
    if (savedItems.length === 0) {
      return NextResponse.json({ error: "No saved items in this book" }, { status: 400 });
    }

    const transcripts = savedItems.map((s) => {
      const content = FEED_ITEMS.find((f) => f.id === s.contentId);
      return {
        contentTitle: s.title,
        transcript: content?.transcript ?? "",
        notes: s.notes,
      };
    });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        downloadUrl: null,
        pageCount: 0,
        generatedAt: new Date().toISOString(),
        fallback: true,
        message: "Set GEMINI_API_KEY to enable book compilation",
      });
    }

    const markdown = await compileBookOutline(book.title, transcripts);

    // In production: convert markdown → PDF, upload to Cloudflare R2, return signed URL
    // Here we return the markdown content directly
    return NextResponse.json({
      bookId,
      title: book.title,
      format,
      markdownContent: markdown,
      downloadUrl: null,  // Would be R2 signed URL in production
      pageCount: Math.ceil(markdown.length / 2000),
      generatedAt: new Date().toISOString(),
      fallback: false,
    });
  } catch (error) {
    console.error("Book compilation error:", error);
    return NextResponse.json({ error: "Compilation failed", fallback: true }, { status: 500 });
  }
}
