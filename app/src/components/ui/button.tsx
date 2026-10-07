import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

// Κύριο (amber) = η ενέργεια που περιμένει η περιοχή, ένα ανά περιοχή. Κίνδυνος = ό,τι δεν αναιρείται.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm border text-sm font-medium leading-snug no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted text-foreground hover:border-border-strong",
        primary:
          "border-primary bg-primary font-semibold text-primary-foreground hover:brightness-105",
        danger:
          "border-destructive bg-transparent text-destructive hover:bg-destructive/10",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:text-foreground",
      },
      size: {
        md: "px-3 py-1.5",
        sm: "px-2 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
