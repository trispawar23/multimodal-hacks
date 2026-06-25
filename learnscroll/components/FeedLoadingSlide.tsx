import { LoadingState } from "./ui/LoadingState";

export function FeedLoadingSlide() {
  return (
    <section className="relative flex h-[100dvh] w-full snap-start snap-always items-center justify-center bg-pastel-cream">
      <LoadingState message="Loading portrait…" />
    </section>
  );
}
