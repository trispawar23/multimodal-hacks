import { cn } from "./cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-3.5",
  md: "p-4",
  lg: "p-5",
};

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-border bg-white",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
