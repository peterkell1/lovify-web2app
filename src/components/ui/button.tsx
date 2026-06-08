import { clsx } from "@/lib/cn";

type Variant = "primary" | "secondary";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 disabled:opacity-40",
  secondary:
    "border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
