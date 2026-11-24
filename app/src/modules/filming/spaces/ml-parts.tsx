import Link from "next/link";
import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import "../../finance/spaces/money-lines.css";
import "./ml-parts.css";

// Τα κομμάτια της τελικής όψης (ml-*) για τις οθόνες των Γυρισμάτων: κλειστό κουτί, γραμμή λίστας, σειρά κουμπιών.
// Χωρίς hooks, ώστε να μπαίνουν και σε server και σε client components.

interface BoxProps {
  title: string;
  hint?: ReactNode;
  isOpen?: boolean;
  children: ReactNode;
}

// Κλειστό κουτί με τίτλο (h2) και μικρή υπόδειξη· ανοίγει με κλικ. Το <section> κρατά την περιοχή για τα τεστ.
export function Box({ title, hint, isOpen = false, children }: BoxProps) {
  return (
    <section>
      <details className="ml-box" open={isOpen}>
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </summary>
        <div className="fl-box-body">{children}</div>
      </details>
    </section>
  );
}

export function Lines({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <ul className="ml-list fl-lines" aria-label={label}>
      {children}
    </ul>
  );
}

interface LineProps {
  // Όνομα για το πλακίδιο με τα αρχικά, ή ελεύθερο περιεχόμενο (π.χ. ώρα).
  thumb?: string;
  lead?: ReactNode;
  title: ReactNode;
  href?: string;
  sub?: ReactNode;
  tag?: ReactNode;
  aside?: ReactNode;
  isFaded?: boolean;
  isCurrent?: boolean;
  // Ό,τι μπαίνει κάτω από τη γραμμή σε όλο το πλάτος (στοιχεία, ενέργειες).
  children?: ReactNode;
}

export function Line({
  thumb,
  lead,
  title,
  href,
  sub,
  tag,
  aside,
  isFaded,
  isCurrent,
  children,
}: LineProps) {
  return (
    <li
      className="ml-line fl-line"
      data-faded={isFaded || undefined}
      data-current={isCurrent || undefined}
    >
      {thumb !== undefined ? (
        <span className="ml-thumb" aria-hidden="true">
          {initialsOf(thumb)}
        </span>
      ) : (
        <span className="fl-lead">{lead}</span>
      )}
      <span className="ml-main">
        {tag}
        <strong>{href ? <Link href={href}>{title}</Link> : title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {aside && <span className="ml-quick">{aside}</span>}
      {children && <div className="fl-more">{children}</div>}
    </li>
  );
}

interface StepProps {
  no?: number;
  title: string;
  hint?: string;
  children: ReactNode;
}

// Ένα βήμα δουλειάς (όπως στην Καταχώρηση Τιμολογίου I3): ανοιχτό, με αριθμό, τίτλο και μικρή υπόδειξη.
export function Step({ no, title, hint, children }: StepProps) {
  return (
    <section className="fl-step">
      <header className="fl-step-head">
        {no !== undefined && (
          <span className="fl-step-no" aria-hidden="true">
            {no}
          </span>
        )}
        <div>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </div>
      </header>
      <div className="fl-box-body">{children}</div>
    </section>
  );
}
