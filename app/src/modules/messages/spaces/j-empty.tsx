import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";
import "./j.css";

// Το πλήθος πάνω από μια λίστα, π.χ. «3 Συνομιλίες» (όπως έδειχνε η κεφαλίδα του παλιού Panel).
export function JCount({
  n,
  one,
  many,
}: {
  n: number;
  one: string;
  many: string;
}) {
  return (
    <p className="j-count">
      {n} {n === 1 ? one : many}
    </p>
  );
}

// Κενή κατάσταση των Μηνυμάτων στο ύφος `.ml-empty`: ένας τίτλος και, αν χρειάζεται, μία πρόταση από κάτω.
export function JEmpty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="ml-empty j-empty" role="status">
      <h2>{title}</h2>
      {children && <div>{children}</div>}
    </section>
  );
}
