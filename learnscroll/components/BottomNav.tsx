"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/cn";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Feed",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Saved",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round">
        <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
  {
    href: "/quiz",
    label: "Quiz",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-surface-border bg-white/90 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 transition-colors",
                isActive ? "text-brand-500" : "text-pastel-muted hover:text-pastel-ink"
              )}
            >
              {item.icon(isActive)}
              <span className={cn("text-[10px] font-medium", isActive ? "text-brand-500" : "text-pastel-muted")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
