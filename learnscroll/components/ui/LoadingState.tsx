import { cn } from "./cn";

interface LoadingStateProps {
  message?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingState({
  message = "Loading…",
  className,
  compact,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-8 text-center",
        className
      )}
    >
      <div
        className={cn(
          "animate-pulse rounded-full bg-pastel-lilac/60",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      />
      {!compact && (
        <div className="space-y-2">
          <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-pastel-lilac/40" />
          <div className="mx-auto h-3 w-56 animate-pulse rounded-full bg-pastel-mint/40" />
        </div>
      )}
      <p className="text-sm text-pastel-muted">{message}</p>
    </div>
  );
}
