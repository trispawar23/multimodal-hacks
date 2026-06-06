import { cn } from "./cn";

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "px-1 text-[11px] font-semibold uppercase tracking-wider text-pastel-muted",
        className
      )}
    >
      {children}
    </h2>
  );
}
