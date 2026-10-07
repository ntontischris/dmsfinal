import type { ReactNode } from "react";

// Ενότητα της σελίδας Kit: τι είναι, πότε το χρησιμοποιείς, από ποια κατεύθυνση ήρθε, και ζωντανό δείγμα.
interface SpecimenProps {
  id: string;
  title: string;
  origin: string;
  when: string;
  children: ReactNode;
}

export function Specimen({ id, title, origin, when, children }: SpecimenProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 border-b py-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="m-0 text-xl font-medium">
          {title}
        </h2>
        <span className="kit-label">{origin}</span>
      </header>
      <p className="mt-2 mb-4 max-w-2xl text-sm text-muted-foreground">
        {when}
      </p>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
