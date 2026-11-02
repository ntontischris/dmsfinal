import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Σήμα κατάστασης (tally του Ρεζί): λυχνία + λέξη.
// attention = πρόβλημα (κόκκινο), strong = «σειρά σου» (amber), ok = έτοιμο (πράσινο), χωρίς = πληροφορία.
export type Tone = "attention" | "strong" | "ok";
// Και του screens2: waiting = περιμένει άλλον (κίτρινο), faded = παλιό ή ακυρωμένο (αχνό).
export type BadgeTone = Tone | "waiting" | "faded";

// Στη νέα εμφάνιση (spaces:) το σήμα γίνεται χάπι με γέμισμα, χωρίς λυχνία· η παλιά μένει ίδια.
const TONES: Record<BadgeTone, string> = {
  attention: "border-destructive/55 bg-destructive/10 text-destructive spaces:border-transparent spaces:bg-rec/20",
  strong: "border-primary/60 bg-primary/10 font-semibold text-primary spaces:border-transparent spaces:bg-primary/18",
  ok: "border-ok/55 bg-ok/10 text-ok spaces:border-transparent spaces:bg-ok/16",
  waiting: "border-waiting/55 bg-waiting/10 text-waiting spaces:border-transparent spaces:bg-now/25",
  faded: "border-border bg-card text-muted-foreground opacity-60 spaces:border-border-strong spaces:bg-transparent",
};

export function Badge({
  tone,
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-xs font-medium leading-relaxed spaces:rounded-full spaces:px-3 spaces:font-semibold",
        tone ? TONES[tone] : "border-border bg-card text-muted-foreground spaces:border-border-strong spaces:bg-transparent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current spaces:hidden",
          tone === "attention" ? "shadow-[0_0_6px_currentColor]" : "opacity-70",
        )}
      />
      {children}
    </span>
  );
}
