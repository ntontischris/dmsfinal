import type { ReactNode } from "react";

interface KBoxProps {
  title: string;
  // Τι έχει μέσα (πλήθος, κατάσταση), για να μη χρειάζεται να ανοίξει.
  hint: string;
  isOpen?: boolean;
  children: ReactNode;
}

// Κουτί της Γνώσης στη μορφή των «Χρημάτων» (money-lines.css): κλειστό όπως στο I8. Ο τίτλος μένει heading, άρα το
// `section` βρίσκεται από τον τίτλο του.
export function KBox({ title, hint, isOpen = false, children }: KBoxProps) {
  return (
    <section>
      <details className="ml-box" open={isOpen}>
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          <small>{hint}</small>
        </summary>
        <div className="k-box-body">{children}</div>
      </details>
    </section>
  );
}
