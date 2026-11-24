import Link from "next/link";
import type { ReactNode } from "react";

// Τα κομμάτια της Σελίδας Πελάτη στο ύφος των «Χρημάτων» (money-lines.css): κλειστό κουτί με τίτλο και υπόδειξη,
// και γραμμή με πλακίδιο, ετικέτα, όνομα, ποσό και γρήγορα κουμπιά.

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export function Box(props: {
  title: string;
  hint: string;
  id?: string;
  isOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={props.id} className="b2-box-wrap">
      <details className="ml-box" open={props.isOpen}>
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div className="b2-box-body">{props.children}</div>
      </details>
    </section>
  );
}

// Ενότητα μέσα σε κουτί (π.χ. «Ευκαιρίες» μέσα στις «Δουλειές»), με δικό της τίτλο και άγκυρα.
export function Sub(props: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={props.id} className="b2-sub">
      <h3 className="b2-sub-title">{props.title}</h3>
      {props.children}
    </section>
  );
}

export interface LineProps {
  mark: string;
  tag?: ReactNode;
  title: ReactNode;
  href?: string;
  sub?: ReactNode;
  amount?: ReactNode;
  quick?: ReactNode;
  // Πλήρες πλάτος κάτω από τη γραμμή (π.χ. η φόρμα διόρθωσης).
  below?: ReactNode;
  isUrgent?: boolean;
  isFaded?: boolean;
}

export function Line(props: LineProps) {
  return (
    <li
      className="ml-line b2-line-row"
      data-urgent={props.isUrgent ? "true" : undefined}
      data-faded={props.isFaded ? "true" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {props.mark}
      </span>
      <span className="ml-main">
        {props.tag !== undefined && <span className="ml-tag">{props.tag}</span>}
        <strong>
          {props.href ? (
            <Link href={props.href}>{props.title}</Link>
          ) : (
            props.title
          )}
        </strong>
        {props.sub !== undefined && <small>{props.sub}</small>}
      </span>
      {props.amount !== undefined && (
        <span className="ml-amount">{props.amount}</span>
      )}
      {props.quick !== undefined && (
        <span className="ml-quick">{props.quick}</span>
      )}
      {props.below !== undefined && (
        <div className="b2-line-below">{props.below}</div>
      )}
    </li>
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
    <ul className="ml-list b2-lines" aria-label={label}>
      {children}
    </ul>
  );
}

// Σύνδεσμοι στο κάτω μέρος ενός κουτιού (π.χ. «Άνοιγμα της Καρτέλας Πελάτη»).
export const BoxLinks = ({ children }: { children: ReactNode }) => (
  <div className="ml-quick b2-box-links">{children}</div>
);
