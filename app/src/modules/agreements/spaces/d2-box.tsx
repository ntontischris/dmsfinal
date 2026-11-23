import type { ReactNode } from "react";

// Ένα κλειστό κουτί της D2 (λεξιλόγιο `money-lines.css`, όπως η I8): τίτλος + υπόδειξη του τι έχει μέσα.
// Ο τίτλος μένει `h2` μέσα σε `section`, ώστε τα e2e να βρίσκουν το κουτί από την επικεφαλίδα του.
export function D2Box({
  title,
  hint,
  isOpen = false,
  id,
  children,
}: {
  title: string;
  hint?: ReactNode;
  isOpen?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <details className="ml-box" open={isOpen || undefined}>
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </summary>
        <div className="d2-box-body">{children}</div>
      </details>
    </section>
  );
}
