"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SecondaryButton } from "@/components/ui/Button";
import { MOCK_BOOKS } from "@/lib/mock-data";
import { getSavedContents } from "@/lib/saved-store";
import { TOPIC_LABELS } from "@/lib/grade-topics";
import type { SavedContent } from "@/lib/saved-store";

function BookCover({
  title,
  color,
  count,
}: {
  title: string;
  color: string;
  count: number;
}) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-surface-border p-4"
      style={{ background: color, height: 140 }}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-white/50" />
      <div className="pl-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-pastel-muted">
          Study Guide
        </p>
        <h3 className="mt-1 text-[15px] font-bold leading-snug text-pastel-ink">
          {title}
        </h3>
      </div>
      <p className="pl-1 text-[11px] text-pastel-muted">{count} saved</p>
    </div>
  );
}

export default function LibraryPage() {
  const [saved, setSaved] = useState<SavedContent[]>([]);
  const [compiling, setCompiling] = useState<string | null>(null);

  useEffect(() => {
    setSaved(getSavedContents());
  }, []);

  const savedByBook = MOCK_BOOKS.map((book) => ({
    ...book,
    items: saved.filter((s) =>
      s.item.topics.some((t) => book.title.toLowerCase().includes(t.slice(0, 4)))
    ),
  }));

  async function handleCompile(bookId: string) {
    setCompiling(bookId);
    await new Promise((r) => setTimeout(r, 2000));
    setCompiling(null);
    alert("Book PDF ready! (In production, this downloads from Cloudflare R2)");
  }

  return (
    <PageShell>
      <PageHeader
        title="Saved"
        subtitle={`${saved.length} lessons · ${MOCK_BOOKS.length} collections`}
      />

      <main className="space-y-8 px-4 pt-5">
        <section>
          <SectionLabel className="mb-3">Saved items</SectionLabel>
          {saved.length === 0 ? (
            <EmptyState
              title="Save teachers from the Feed"
              description="Saved lessons power your quizzes by topic."
              actionLabel="Go to Feed"
              actionHref="/"
              className="px-0"
            />
          ) : (
            <div className="space-y-2.5">
              {saved.map(({ item, savedAt }) => (
                <Card key={item.id} padding="sm" className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base font-bold text-pastel-ink"
                    style={{ background: item.thumbnailColor }}
                  >
                    {item.character.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-pastel-ink">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-pastel-muted">
                      {TOPIC_LABELS[item.topics[0]] ?? item.topics[0]} ·{" "}
                      {item.character.name}
                    </p>
                  </div>
                  <Link
                    href={`/quiz?topic=${item.topics[0]}`}
                    className="flex-shrink-0 text-[11px] font-semibold text-brand-500"
                  >
                    Quiz
                  </Link>
                  <span className="flex-shrink-0 text-[11px] text-pastel-muted">
                    {new Date(savedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel className="mb-3">Collections</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {savedByBook.map((book) => (
              <div key={book.id} className="space-y-2">
                <BookCover
                  title={book.title}
                  color={book.coverColor}
                  count={book.items.length}
                />
                <SecondaryButton
                  className="w-full py-2 text-[12px]"
                  onClick={() => handleCompile(book.id)}
                  disabled={compiling === book.id || book.items.length === 0}
                >
                  {compiling === book.id ? "Compiling…" : "Generate PDF"}
                </SecondaryButton>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
