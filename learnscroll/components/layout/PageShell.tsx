import { cn } from "@/components/ui/cn";
import { BottomNav } from "@/components/BottomNav";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Full viewport height without scroll (feed) */
  fullHeight?: boolean;
  showNav?: boolean;
}

export function PageShell({
  children,
  className,
  fullHeight,
  showNav = true,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "bg-pastel-cream text-pastel-ink",
        fullHeight ? "h-[100dvh] overflow-hidden" : "min-h-screen",
        showNav && !fullHeight && "pb-24",
        className
      )}
    >
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
