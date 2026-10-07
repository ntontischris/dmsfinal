import Link from "next/link";

import { cn } from "@/lib/cn";

// Φίλτρα σε ομάδα: ένα ενεργό κάθε φορά, η επιλογή ζει στη διεύθυνση.

export interface SegmentedOption {
  label: string;
  href: string;
  isCurrent: boolean;
  count?: number;
}

export function Segmented({
  options,
  label,
}: {
  options: readonly SegmentedOption[];
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-md border bg-background p-0.5"
    >
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          aria-current={option.isCurrent ? "true" : undefined}
          className={cn(
            "inline-flex items-baseline gap-2 whitespace-nowrap rounded-sm px-3 py-1 text-sm no-underline transition-colors duration-150",
            option.isCurrent
              ? "bg-muted font-semibold text-foreground ring-1 ring-border-strong ring-inset"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {option.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

// Καρτέλες ενότητας του ίδιου αντικειμένου, με υπογράμμιση στο χρώμα έμφασης.
export function Tabs({
  options,
  label,
}: {
  options: readonly SegmentedOption[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b">
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          aria-current={option.isCurrent ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm no-underline",
            option.isCurrent
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
