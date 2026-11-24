import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import { LEDGER_NOTE } from "../ledger-labels";
import type { LedgerView } from "../ledger-view-schema";
import { CopyButton } from "./i5-pay";

// Η κεφαλίδα και τα κλειστά κουτιά της Καρτέλας (Χρήματα restyle, όπως το I8): για την ομάδα και για τον Χρήστη πελάτη.

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

interface MoneyHeroProps {
  mono: string;
  title: string;
  // Σελίδα ενός Πελάτη (Καρτέλα): ο τίτλος είναι το h1 της σελίδας· αλλιώς h2 κάτω από το h1 της λίστας.
  isRecord?: boolean;
  // Η ετικέτα του μεγάλου αριθμού· μένει επικεφαλίδα (τη ζητούν τα e2e).
  label: string;
  amount: number;
  isOpen: boolean;
  facts: string;
  hasWarning: boolean;
  actions?: ReactNode;
}

export function MoneyHero(props: MoneyHeroProps) {
  return (
    <header className="ml-hero i5-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {props.mono}
      </span>
      <div>
        {props.hasWarning && <Badge tone="attention">ληξιπρόθεσμο</Badge>}
        {props.isRecord ? (
          <h1 data-page-title>{props.title}</h1>
        ) : (
          <h2 className="i5-hero-title">{props.title}</h2>
        )}
        <h2 className="i5-hero-label">{props.label}</h2>
        <p className="ml-hero-amount" data-open={props.isOpen}>
          <span>{fmtMoney(props.amount)}</span>
          <small>{props.facts}</small>
        </p>
      </div>
      {props.actions && <div className="ml-quick">{props.actions}</div>}
    </header>
  );
}

export function Box(props: {
  title: string;
  hint: string;
  id?: string;
  isOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box" id={props.id} open={props.isOpen}>
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div>{props.children}</div>
      </details>
    </section>
  );
}

// Η ομάδα βλέπει τι δείχνεται στον πελάτη (στοιχεία από τις Ρυθμίσεις)· ο πελάτης βλέπει το ClientPayBox.
export function PaymentBox(props: {
  payment: NonNullable<LedgerView["payment"]>;
}) {
  const { payment } = props;
  return (
    <Box
      id="pay"
      title="Οδηγίες πληρωμής που βλέπει ο πελάτης"
      hint={`${payment.bank} · IBAN με αντιγραφή`}
    >
      <dl className="ml-kv">
        <dt>Δικαιούχος</dt>
        <dd>{payment.holder}</dd>
        <dt>Τράπεζα</dt>
        <dd>{payment.bank}</dd>
        <dt>IBAN</dt>
        <dd className="i5-pay-line">
          <span className="i245-iban">{payment.iban}</span>
          <CopyButton value={payment.iban} what="το IBAN" />
        </dd>
        <dt>Αιτιολογία</dt>
        <dd>ο αριθμός του Τιμολογίου που πληρώνει ο πελάτης</dd>
      </dl>
    </Box>
  );
}

const billablesText = (count: number): string =>
  count === 1 ? "1 ανοιχτό Τιμολογητέο" : `${count} ανοιχτά Τιμολογητέα`;

export function ToInvoiceBox(props: { amount: number; count: number }) {
  return (
    <Box
      title="Δουλειά που δεν τιμολογήθηκε ακόμα"
      hint={`${fmtMoney(props.amount)} · ${billablesText(props.count)}`}
    >
      <p className="muted">
        {billablesText(props.count)} (καθαρά ποσά, χωρίς ΦΠΑ).
      </p>
      <p className="note">
        Ο πελάτης δεν το βλέπει. Δεν είναι οφειλή· μόνο το Τιμολόγιο δημιουργεί
        οφειλή.
      </p>
      <div className="ml-quick i5-box-actions" data-align="start">
        <Link href={hrefOf("I1")}>Άνοιγμα Τιμολογητέων</Link>
      </div>
    </Box>
  );
}

export function NoteBox() {
  return (
    <Box
      title="Πώς διαβάζεται το υπόλοιπο"
      hint="Μόνο το Τιμολόγιο δημιουργεί οφειλή"
    >
      <p className="note">{LEDGER_NOTE}</p>
    </Box>
  );
}
