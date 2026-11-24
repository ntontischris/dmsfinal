import Link from "next/link";
import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import "../../finance/spaces/money-lines.css";
import "./gdpr.css";

// Τα κομμάτια του GDPR στο ύφος της Ομάδας (money-lines.css): κλειστό κουτί, τμήμα με τίτλο, κάρτα επιβεβαίωσης.
// Κάθε τίτλος είναι h2 μέσα σε <section>, ώστε οι αναγνώστες οθόνης (και τα τεστ) βρίσκουν το τμήμα από τον τίτλο του.

export function GdprBox(props: {
  title: string;
  hint: string;
  isOpen?: boolean;
  // Κουτί με μη αναστρέψιμη ενέργεια (Ανωνυμοποίηση): κίτρινη τελεία αντί για τη συνηθισμένη.
  isDanger?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details
        className="ml-box"
        open={props.isOpen}
        data-danger={props.isDanger ? "true" : undefined}
      >
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div className="g-body">{props.children}</div>
      </details>
    </section>
  );
}

export function GdprSection(props: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="g-section">
      <header>
        <h2 className="ml-box-title">{props.title}</h2>
        {props.hint && <small>{props.hint}</small>}
      </header>
      {props.children}
    </section>
  );
}

export function GdprConfirmCard(props: {
  title: string;
  role?: "status" | "alert";
  children: ReactNode;
}) {
  return (
    <section className="g-confirm" role={props.role}>
      <h2 className="ml-box-title">{props.title}</h2>
      {props.children}
    </section>
  );
}

// Γραμμή λίστας (ml-line): αρχικά, ετικέτα, τίτλος (σύνδεσμος όταν το πρόσωπο έχει σελίδα), υπότιτλος, ενέργειες.
export function GdprLine(props: {
  name: string;
  title: string;
  href?: string;
  tag?: ReactNode;
  sub?: ReactNode;
  quick?: ReactNode;
  isFaded?: boolean;
}) {
  return (
    <li className="ml-line" data-faded={props.isFaded ? "true" : undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(props.name)}
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
      {props.quick !== undefined && (
        <span className="ml-quick">{props.quick}</span>
      )}
    </li>
  );
}
