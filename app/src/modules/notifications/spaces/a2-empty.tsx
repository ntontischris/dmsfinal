import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";
import "./a2.css";

// Κενή κατάσταση των Ειδοποιήσεων στο ύφος `.ml-empty`: τίτλος (h2) και μία πρόταση από κάτω.
export function A2Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ml-empty a2-empty" role="status">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
