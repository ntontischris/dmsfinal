import Link from "next/link";
import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import "../../finance/spaces/money-lines.css";
import "./n-lines.css";

// Τα κομμάτια της Ομάδας στο ύφος των «Χρημάτων» (money-lines.css, όπως η I8): κλειστό κουτί, γραμμή λίστας,
// κεφαλίδα εγγραφής (hero) με τον τίτλο της σελίδας και βήμα φόρμας (όπως η I3).

export function Box(props: {
  title: string;
  hint: string;
  isOpen?: boolean;
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
        <div className="n-box-body">{props.children}</div>
      </details>
    </section>
  );
}

// Λίστα με τίτλο-κεφαλίδα (h2): τα τεστ και οι αναγνώστες οθόνης βρίσκουν το τμήμα από τον τίτλο του.
export function ListSection(props: {
  title: string;
  hint?: ReactNode;
  quick?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="n-list-section">
      <header className="n-list-head">
        <div>
          <h2 className="ml-box-title">{props.title}</h2>
          {props.hint && <small>{props.hint}</small>}
        </div>
        {props.quick && <div className="ml-quick">{props.quick}</div>}
      </header>
      {props.children}
    </section>
  );
}

export interface LineProps {
  name: string;
  title: ReactNode;
  href?: string;
  tag?: ReactNode;
  sub?: ReactNode;
  amount?: ReactNode;
  quick?: ReactNode;
  isFaded?: boolean;
  isUrgent?: boolean;
}

export function Line(props: LineProps) {
  return (
    <li
      className="ml-line"
      data-faded={props.isFaded ? "true" : undefined}
      data-urgent={props.isUrgent ? "true" : undefined}
    >
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
      {props.amount !== undefined && (
        <span className="ml-amount">{props.amount}</span>
      )}
      {props.quick !== undefined && (
        <span className="ml-quick">{props.quick}</span>
      )}
    </li>
  );
}

// Κεφαλίδα εγγραφής: ο τίτλος είναι το h1 της σελίδας (data-page-title κρύβει τον τίτλο του θέματος).
export function Hero(props: {
  mono: string;
  tag?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  quick?: ReactNode;
  // Σελίδα λεπτομέρειας εκτός λίστας (π.χ. N6): το κέλυφος δεν γράφει h1, άρα χωρίς data-page-title.
  isDetail?: boolean;
}) {
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {props.mono}
      </span>
      <div>
        {props.tag !== undefined && <span className="ml-tag">{props.tag}</span>}
        {props.isDetail ? (
          <h1>{props.title}</h1>
        ) : (
          <h1 data-page-title>{props.title}</h1>
        )}
        {props.lead !== undefined && <p>{props.lead}</p>}
      </div>
      {props.quick !== undefined && (
        <div className="ml-quick">{props.quick}</div>
      )}
    </header>
  );
}

export function Step(props: {
  no: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="n-step">
      <header className="n-step-head">
        <span className="n-step-no" aria-hidden="true">
          {props.no}
        </span>
        <div>
          <h2 className="ml-box-title">{props.title}</h2>
          {props.hint && <small>{props.hint}</small>}
        </div>
      </header>
      <div className="n-step-body">{props.children}</div>
    </section>
  );
}
