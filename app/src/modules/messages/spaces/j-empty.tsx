import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";
import "./j.css";

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
