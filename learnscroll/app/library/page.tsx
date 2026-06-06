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
      className="relative rounded-xl overflow-hidden border border-[#2a2a38] flex flex-col justify-between p-4"
      style={{ background: `${color}18`, height: 140, borderColor: `${color}30` }}
    >
      {/* Spine accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ background: color }} />
      <div className="pl-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
          Study Guide
        </p>
        <h3 className="text-[15px] font-bold text-white mt-1 leading-snug">{title}</h3>
      </div>
      <div className="flex items-center justify-between pl-1">
        <span className="text-[11px] text-zinc-500">{count} videos</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color, borderColor: `${color}40`, background: `${color}15` }}>
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
    <div className="min-h-screen bg-[#0d0d10] pb-24">
      <header className="px-5 pt-14 pb-5 border-b border-[#1e1e26]">
        <h1 className="text-xl font-bold text-white">My Library</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {MOCK_SAVED.length} saved · {MOCK_BOOKS.length} collections
        </p>
      </header>

      <main className="px-4 pt-5 space-y-8">
        {/* Books section */}
        <section>
          <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
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
                      ? "border-brand-500/40 text-brand-400 animate-pulse"
                      : book.items.length === 0
                      ? "border-[#2a2a38] text-zinc-600 cursor-not-allowed"
                      : "border-[#2a2a38] text-zinc-400 hover:border-brand-500/50 hover:text-brand-400"
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
          <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
            Saved Items
          </h2>
          <div className="space-y-2.5">
            {MOCK_SAVED.map((item) => {
              const book = MOCK_BOOKS.find((b) => b.id === item.bookId);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-[#16161c] border border-[#2a2a38] rounded-xl p-3.5"
                >
                  <div
                    className="w-9 h-11 rounded-lg flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                    style={{ background: book?.coverColor ?? "#4f6ef7" }}
                  >
                    B
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">{item.topic}</p>
                    {item.notes && (
                      <p className="text-[11px] text-zinc-600 mt-0.5 truncate italic">"{item.notes}"</p>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-600 flex-shrink-0">
                    {item.savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Empty state CTA */}
        <div className="bg-[#16161c] border border-dashed border-[#2a2a38] rounded-2xl p-6 text-center">
          <p className="text-sm text-zinc-400 font-medium">Save more content from the Feed</p>
          <p className="text-xs text-zinc-600 mt-1 mb-4">Your saved videos auto-organize into study books</p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors"
          >
            Go to Feed
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
