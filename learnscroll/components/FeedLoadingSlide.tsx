export function FeedLoadingSlide() {
  return (
    <section className="relative flex h-[100dvh] w-full snap-start snap-always items-center justify-center bg-pastel-cream">
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-pastel-lilac/60" />
        <div className="space-y-2">
          <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-pastel-lilac/40" />
          <div className="mx-auto h-3 w-56 animate-pulse rounded-full bg-pastel-mint/40" />
        </div>
        <p className="text-xs text-pastel-muted">Generating teacher & portrait…</p>
      </div>
    </section>
  );
}
