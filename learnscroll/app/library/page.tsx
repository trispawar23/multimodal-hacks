"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { MOCK_BOOKS, MOCK_SAVED } from "@/lib/mock-data";
import { cn } from "@/components/ui/cn";

const GRADE_LABELS: Record<string, string> = {
  "K-5": "K–5",
  "6-8": "6–8",
  "9-12": "9–12",
  college: "College",
  graduate: "Grad",
};

function BookCover({
  title,
  color,
  count,
  grade,
}: {
  title: string;
  color: string;
  count: number;
  grade: string;
}) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-surface-border p-4"
      style={{ background: color, height: 140 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-white/50" />
      <div className="pl-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-pastel-muted">
          Study Guide
        </p>
        <h3 className="mt-1 text-[15px] font-bold leading-snug text-pastel-ink">{title}</h3>
      </div>
      <div className="flex items-center justify-between pl-1">
        <span className="text-[11px] text-pastel-muted">{count} saved</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-pastel-ink">
          {GRADE_LABELS[grade]}
        </span>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [compiling, setCompiling] = useState<string | null>(null);

  const savedByBook = MOCK_BOOKS.map((book) => ({
    ...book,
    items: MOCK_SAVED.filter((s) => s.bookId === book.id),
  }));

  async function handleCompile(bookId: string) {
    setCompiling(bookId);
    // Simulate compilation
    await new Promise((r) => setTimeout(r, 2000));
    setCompiling(null);
    alert("Book PDF ready! (In production, this downloads from Cloudflare R2)");
  }

  return (
    <div className="min-h-screen bg-pastel-cream pb-24">
      <header className="border-b border-surface-border px-5 pb-5 pt-14">
        <h1 className="text-xl font-semibold text-pastel-ink">Saved</h1>
        <p className="mt-1 text-sm text-pastel-muted">
          {MOCK_SAVED.length} saved · {MOCK_BOOKS.length} collections
        </p>
      </header>

      <main className="space-y-8 px-4 pt-5">
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-pastel-muted">
            Collections
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {savedByBook.map((book) => (
              <div key={book.id} className="space-y-2">
                <BookCover
                  title={book.title}
                  color={book.coverColor}
                  count={book.items.length}
                  grade={book.gradeLevel}
                />
                <button
                  onClick={() => handleCompile(book.id)}
                  disabled={compiling === book.id || book.items.length === 0}
                  className={cn(
                    "w-full py-2 rounded-lg text-[12px] font-medium border transition-all",
                    compiling === book.id
                      ? "animate-pulse border-brand-400 text-brand-500"
                      : book.items.length === 0
                      ? "cursor-not-allowed border-surface-border text-pastel-muted"
                      : "border-surface-border text-pastel-muted hover:border-brand-400 hover:text-brand-500"
                  )}
                >
                  {compiling === book.id ? "Compiling..." : "Generate PDF"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Saved items */}
        <section>
          <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-pastel-muted">
            Saved Items
          </h2>
          <div className="space-y-2.5">
            {MOCK_SAVED.map((item) => {
              const book = MOCK_BOOKS.find((b) => b.id === item.bookId);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white p-3.5"
                >
                  <div
                    className="flex h-11 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base font-bold text-pastel-ink"
                    style={{ background: book?.coverColor ?? "#E4EEFF" }}
                  >
                    B
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-pastel-ink">{item.title}</p>
                    <p className="mt-0.5 capitalize text-[11px] text-pastel-muted">{item.topic}</p>
                    {item.notes && (
                      <p className="mt-0.5 truncate text-[11px] italic text-pastel-muted">&ldquo;{item.notes}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-[11px] text-pastel-muted">
                    {item.savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Empty state CTA */}
        <div className="rounded-2xl border border-dashed border-surface-border bg-white p-6 text-center">
          <p className="text-sm font-medium text-pastel-ink">Save teachers from the Feed</p>
          <p className="mb-4 mt-1 text-xs text-pastel-muted">Saved lessons auto-organize into study books</p>
          <Link
            href="/"
            className="inline-flex rounded-full bg-pastel-lilac px-4 py-2 text-sm font-semibold text-pastel-ink transition-colors hover:bg-brand-200"
          >
            Go to Feed
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
