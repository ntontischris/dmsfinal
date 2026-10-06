import Link from "next/link";

import { COMPANY_PAYMENT } from "@/data/finance";
import { Badge, fmtMoney, screenHref } from "@/screens/shared";
import type { RoleId } from "@/data/roles";

import "./i245.css";

const balanceLabel = (inFavour: boolean, isClient: boolean): string => {
  if (isClient) return inFavour ? "Υπόλοιπο υπέρ σου" : "Υπόλοιπο (χρωστάς)";
  return inFavour ? "Υπόλοιπο υπέρ του πελάτη" : "Υπόλοιπο (χρωστά)";
};

export function BalanceCards(props: {
  balance: number;
  overdue: number;
  isClient: boolean;
}) {
  const inFavour = props.balance < 0;
  return (
    <div className="i245-totals">
      <section className="card">
        <div className="muted">
          {balanceLabel(inFavour, props.isClient)}
        </div>
        <div className="i245-big">{fmtMoney(Math.abs(props.balance))}</div>
      </section>
      <section className="card">
        <div className="muted">Ληξιπρόθεσμο</div>
        <div className="i245-big">
          {fmtMoney(props.overdue)}{" "}
          {props.overdue > 0 && <Badge tone="attention">ληξιπρόθεσμο</Badge>}
        </div>
      </section>
    </div>
  );
}

export function PaymentCard() {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Στοιχεία πληρωμής</h2>
      </div>
      <dl className="dl">
        <dt>Δικαιούχος</dt>
        <dd>{COMPANY_PAYMENT.beneficiary}</dd>
        <dt>Τράπεζα</dt>
        <dd>{COMPANY_PAYMENT.bank}</dd>
        <dt>IBAN</dt>
        <dd className="i245-iban">{COMPANY_PAYMENT.iban}</dd>
      </dl>
    </section>
  );
}

export function ToInvoiceCard(props: {
  role: RoleId;
  amount: number;
  count: number;
}) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Προς τιμολόγηση</h2>
        <Link href={screenHref(props.role, "I1", {})}>Άνοιγμα I1</Link>
      </div>
      <div className="i245-big">{fmtMoney(props.amount)}</div>
      <p className="muted">{props.count} ανοιχτά Τιμολογητέα (καθαρά ποσά).</p>
      <p className="note">
        Ο πελάτης δεν το βλέπει. Δεν είναι οφειλή· μόνο το Τιμολόγιο δημιουργεί
        οφειλή.
      </p>
    </section>
  );
}
