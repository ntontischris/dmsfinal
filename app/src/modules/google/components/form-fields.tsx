import type { ReactNode } from "react";

// Μικρή σημείωση κάτω από πεδίο. Αντίγραφο της σημείωσης των Γυρισμάτων, ώστε το module να μένει μόνο του.
export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}
