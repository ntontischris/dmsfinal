import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import type { LedgerView } from "../ledger-view-schema";
import { CopyButton } from "./i5-pay";

// Οι κάρτες της Καρτέλας του prototype (`screens/i5-cards.tsx`). Η νέα εμφάνιση είναι μόνο για την ομάδα· ο Χρήστης πελάτη
// μένει στην παλιά, οπότε το «Πώς πληρώνω» με τα ανοιχτά Τιμολόγια του πελάτη δεν μεταφέρθηκε εδώ.

const balanceLabel = (inFavour: boolean): string =>
  inFavour
    ? "Υπόλοιπο υπέρ του πελάτη (με ΦΠΑ)"
    : "Χρωστά από Τιμολόγια (με ΦΠΑ)";

export function BalanceCards(props: { balance: number; overdue: number }) {
  const inFavour = props.balance < 0;
  return (
    <div className="i245-totals">
      <Panel label={balanceLabel(inFavour)}>
        <div className="i245-big i245-bignum">
          {fmtMoney(Math.abs(props.balance))}
        </div>
      </Panel>
      <Panel
        label="Ληξιπρόθεσμο"
        aside={
          props.overdue > 0 ? (
            <Badge tone="attention">ληξιπρόθεσμο</Badge>
          ) : undefined
        }
      >
        <div className="i245-big i245-bignum" data-late={props.overdue > 0}>
          {fmtMoney(props.overdue)}
        </div>
      </Panel>
    </div>
  );
}

// Οι εσωτερικοί ρόλοι βλέπουν τι δείχνεται στον πελάτη: τα στοιχεία πληρωμής από τις Ρυθμίσεις.
export function PaymentCard({
  payment,
}: {
  payment: NonNullable<LedgerView["payment"]>;
}) {
  return (
    <div id="pay">
      <Panel label="Οδηγίες πληρωμής που βλέπει ο πελάτης">
        <dl className="dl">
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
      </Panel>
    </div>
  );
}

export function ToInvoiceCard(props: { amount: number; count: number }) {
  return (
    <Panel
      label="Δουλειά που δεν τιμολογήθηκε ακόμα"
      aside={<Link href={hrefOf("I1")}>Άνοιγμα Τιμολογητέων</Link>}
    >
      <div className="i245-big i245-bignum">{fmtMoney(props.amount)}</div>
      <p className="muted">
        {props.count === 1
          ? "1 ανοιχτό Τιμολογητέο"
          : `${props.count} ανοιχτά Τιμολογητέα`}{" "}
        (καθαρά ποσά, χωρίς ΦΠΑ).
      </p>
      <p className="note">
        Ο πελάτης δεν το βλέπει. Δεν είναι οφειλή· μόνο το Τιμολόγιο δημιουργεί
        οφειλή.
      </p>
    </Panel>
  );
}
