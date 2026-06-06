import Link from "next/link";
import { cn } from "./cn";
import { PrimaryButton } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 text-center",
        className
      )}
    >
      <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-8">
        <h2 className="text-base font-semibold text-pastel-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-pastel-muted">
          {description}
        </p>
        {actionLabel && actionHref && (
          <Link href={actionHref} className="mt-5 inline-block">
            <PrimaryButton asSpan>{actionLabel}</PrimaryButton>
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <PrimaryButton className="mt-5" onClick={onAction}>
            {actionLabel}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
