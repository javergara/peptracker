import { cn } from "@/lib/utils";

/**
 * Small mono-uppercase section label ("eyebrow") used above stats, cards, and
 * Ink panels. Wraps the `eyebrow` utility from globals.css.
 */
export function Eyebrow({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("eyebrow", className)} {...props}>
      {children}
    </div>
  );
}
