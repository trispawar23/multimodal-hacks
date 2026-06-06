import { cn } from "@/components/ui/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  right,
  bordered = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "px-4 pb-4 pt-14",
        bordered && "border-b border-surface-border",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-pastel-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-pastel-muted">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
