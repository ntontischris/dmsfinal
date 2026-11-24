import Link from "next/link";
import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";

// Τα κοινά κομμάτια της Σήμερα στην τελική όψη: κουτί (ml-box) με τίτλο, γραμμή (ml-line) με ρήμα, και κενή/λάθος κατάσταση.

export function BriefBox({
  part,
  label,
  aside,
  id,
  children,
}: {
  part?: string;
  label: string;
  aside?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="ml-box a1-box" data-part={part} id={id}>
      <header className="a1-box-head">
        <h2 className="ml-box-title">{label}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export interface BriefLineProps {
  thumb: string;
  title: ReactNode;
  sub?: ReactNode;
  tag?: string;
  tagTone?: string;
  amount?: ReactNode;
  // Το ρήμα του κουμπιού και πού πάει· χωρίς href η γραμμή δεν έχει κουμπί.
  href?: string;
  action?: string;
  label: string;
  isUrgent?: boolean;
}

export function BriefLine({
  thumb,
  title,
  sub,
  tag,
  tagTone,
  amount,
  href,
  action = "Άνοιξε",
  label,
  isUrgent = false,
}: BriefLineProps) {
  return (
    <li className="ml-line" data-urgent={isUrgent || undefined}>
      <span
        className="ml-thumb"
        {...(isUrgent
          ? { role: "img", "aria-label": "επείγον" }
          : { "aria-hidden": true })}
      >
        {thumb}
      </span>
      <span className="ml-main">
        {tag && (
          <span className="ml-tag" data-tone={tagTone}>
            {tag}
          </span>
        )}
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      <span className="ml-amount">{amount}</span>
      <span className="ml-quick">
        {href && (
          <Link href={href} aria-label={`${action}: ${label}`}>
            {action}
          </Link>
        )}
      </span>
    </li>
  );
}

// Η μικρή γραμμή στο τέλος ενός κουτιού: «Όλη η εβδομάδα →», «Ποιος μας χρωστάει →».
export function BriefFoot({ children }: { children: ReactNode }) {
  return <footer className="ml-quick a1-box-foot">{children}</footer>;
}

// Κενή, λάθος ή «χωρίς πρόσβαση» κατάσταση: μία πρόταση σε μαλακή κάρτα.
export function TodayNotice({
  kind,
  title,
  children,
}: {
  kind: "empty" | "error" | "denied";
  title: string;
  children?: ReactNode;
}) {
  return (
    <section
      className="ml-empty a1-notice"
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      <h2>{title}</h2>
      {children && <div>{children}</div>}
    </section>
  );
}
