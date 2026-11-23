import type { ReactNode } from "react";

// Τα κομμάτια της C2 στη μορφή των «Χρημάτων» (money-lines.css + catalogue-lines.css): κλειστό κουτί και βήμα.

interface BoxProps {
  title: string;
  // Τι έχει μέσα (πλήθος, ποσό, κατάσταση), για να μη χρειάζεται να ανοίξει.
  hint: string;
  children: ReactNode;
}

// Κουτί της σελίδας, κλειστό όπως στο I8. Ο τίτλος μένει heading, άρα το `section` βρίσκεται από τον τίτλο του.
export function C2Box({ title, hint, children }: BoxProps) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          <small>{hint}</small>
        </summary>
        <div className="c2-box-body">{children}</div>
      </details>
    </section>
  );
}

// Υποενότητα μέσα σε κουτί (π.χ. «Τιμή» μέσα στα «Βασικά»): δικός της τίτλος, ίδια φόρμα.
export function C2Sub({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="c2-sub">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

interface StepProps {
  no: number;
  title: string;
  hint?: string;
  children: ReactNode;
}

// Ένα βήμα της νέας σελίδας: ανοιχτό, με αριθμό, τίτλο και μία μικρή υπόδειξη (όπως η Καταχώρηση Τιμολογίου).
export function C2Step({ no, title, hint, children }: StepProps) {
  return (
    <section className="c2-step">
      <header className="c2-step-head">
        <span className="c2-step-no" aria-hidden="true">
          {no}
        </span>
        <div>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </div>
      </header>
      <div className="c2-step-body">{children}</div>
    </section>
  );
}

export const initialsOf = (text: string): string =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
