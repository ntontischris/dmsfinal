import type { ReactNode } from "react";

// Τα κομμάτια της Καταχώρησης (I3) στη μορφή των «Χρημάτων» (money-lines.css): hero, βήμα, κλειστό κουτί.

export const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const initialsOf = (text: string): string =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

interface HeroProps {
  tag: string;
  title: string;
  // Ποιος Πελάτης· δίνει και τα αρχικά στο φόντο.
  client?: string;
  facts: readonly (string | null)[];
  amount?: ReactNode;
  // Μία σύντομη γραμμή: «τι κάνω εδώ;».
  lead?: string;
  actions?: ReactNode;
  role?: "status";
}

export function I3Hero(props: HeroProps) {
  const facts = props.facts.filter(
    (fact): fact is string => fact !== null && fact !== "",
  );
  return (
    <header className="ml-hero i3-hero" role={props.role}>
      {props.client && (
        <span className="ml-hero-mono" aria-hidden="true">
          {initialsOf(props.client)}
        </span>
      )}
      <div>
        <span className="ml-tag">{props.tag}</span>
        <h1>{props.title}</h1>
        {facts.length > 0 && <p>{facts.join(" · ")}</p>}
        {props.amount}
        {props.lead && <p className="i3-lead">{props.lead}</p>}
      </div>
      {props.actions && <div className="ml-quick">{props.actions}</div>}
    </header>
  );
}

interface StepProps {
  no: number;
  title: string;
  hint?: string;
  children: ReactNode;
}

// Ένα βήμα της δουλειάς: ανοιχτό, με αριθμό, τίτλο και μία μικρή υπόδειξη.
export function Step({ no, title, hint, children }: StepProps) {
  return (
    <section className="i3-step">
      <header className="i3-step-head">
        <span className="i3-step-no" aria-hidden="true">
          {no}
        </span>
        <div>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </div>
      </header>
      <div className="i3-step-body">{children}</div>
    </section>
  );
}

interface BoxProps {
  title: string;
  hint: string;
  children: ReactNode;
}

// Κουτί της σελίδας (κλειστό), όπως στο I8: τίτλος-heading και υπόδειξη για το τι έχει μέσα.
export function Box({ title, hint, children }: BoxProps) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          <small>{hint}</small>
        </summary>
        <div>{children}</div>
      </details>
    </section>
  );
}

// Κλειστό κουτί μέσα σε βήμα, για τα σπάνια πεδία. Τα πεδία του στέλνονται με τη φόρμα και όταν είναι κλειστό.
export function Fold({ title, hint, children }: BoxProps) {
  return (
    <details className="ml-box i3-fold">
      <summary>
        <strong>{title}</strong>
        <small>{hint}</small>
      </summary>
      <div>{children}</div>
    </details>
  );
}
