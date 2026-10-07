import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Σήμα κατάστασης (tally του Ρεζί): λυχνία + λέξη.
// attention = πρόβλημα (κόκκινο), strong = «σειρά σου» (amber), ok = έτοιμο (πράσινο), χωρίς = πληροφορία.
export type Tone = "attention" | "strong" | "ok";

const TONES: Record<Tone, string> = {
  attention: "border-destructive/55 bg-destructive/10 text-destructive",
  strong: "border-primary/60 bg-primary/10 font-semibold text-primary",
  ok: "border-ok/55 bg-ok/10 text-ok",
};

export function Badge({
  tone,
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium leading-relaxed",
        tone ? TONES[tone] : "border-border bg-card text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current",
          tone === "attention" ? "shadow-[0_0_6px_currentColor]" : "opacity-70",
        )}
      />
      {children}
    </span>
  );
}
