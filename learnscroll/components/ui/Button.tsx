import { cn } from "./cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asSpan?: boolean;
  variant?: "primary" | "secondary" | "block";
};

export function PrimaryButton({
  className,
  asSpan,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-semibold text-pastel-ink transition-all",
    "disabled:cursor-not-allowed disabled:opacity-40",
    variant === "primary" &&
      "rounded-full bg-pastel-lilac px-5 py-2.5 text-sm shadow-sm",
    variant === "secondary" &&
      "rounded-xl border border-surface-border bg-white px-5 py-2.5 text-sm text-pastel-ink",
    variant === "block" &&
      "w-full rounded-xl bg-pastel-lilac py-3.5 text-[15px]",
    className
  );

  if (asSpan) {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-surface-border bg-white py-3 text-sm font-medium text-pastel-ink transition-colors hover:border-brand-400",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
