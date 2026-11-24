import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { reminderHref } from "../invoice-detail-helpers";
import { dueNoteOf } from "./i2-model";
import type { Debtor } from "./i2-debtors";

import "./money-lines.css";

interface DebtorsProps {
  debtors: readonly Debtor[];
  today: string;
  // Η λίστα των ληξιπρόθεσμων ενός Πελάτη (για όσους έχουν πάνω από ένα).
  clientHref: (clientId: string) => string;
  canCollect: boolean;
  canRemind: boolean;
}

const countText = (count: number): string =>
  count === 1 ? "1 ληξιπρόθεσμο" : `${count} ληξιπρόθεσμα`;

function DebtorActions({ debtor, clientHref, canCollect, canRemind }: Omit<DebtorsProps, "debtors" | "today"> & { debtor: Debtor }) {
  const isSingle = debtor.count === 1;
  return (
    <td className="ml-quick">
      {canCollect && (
        <Link
          data-primary
          href={hrefOf("I4", { client: debtor.clientId, invoice: isSingle ? debtor.invoiceId : undefined })}
        >
          Ήρθε πληρωμή
        </Link>
      )}
      {canRemind && (
        <Link
          href={isSingle ? reminderHref(debtor.invoiceId) : clientHref(debtor.clientId)}
          title={isSingle ? "Στείλε υπενθύμιση στον Πελάτη" : "Δες τα Τιμολόγια και στείλε υπενθύμιση"}
        >
          Υπενθύμιση
        </Link>
      )}
    </td>
  );
}

// Τ5 «Ποιος μας χρωστάει»: ένας Πελάτης ανά γραμμή, το ληξιπρόθεσμο ποσό και η παλαιότερη λήξη.
export function DebtorsTable(props: DebtorsProps) {
  const { debtors, today, clientHref } = props;
  return (
    <section aria-labelledby="i2-debtors-title">
      <h2 id="i2-debtors-title" className="ml-box-title">
        Ποιος μας χρωστάει
      </h2>
      <table className="ml-table ml-list">
        <thead>
          <tr>
            <th>Πελάτης</th>
            <th>Ληξιπρόθεσμα</th>
            <th>Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          {debtors.map((debtor) => (
            <tr key={debtor.clientId} className="ml-line" data-urgent="">
              <td className="ml-main">
                <span className="ml-tag">
                  {dueNoteOf({ dueDate: debtor.oldestDue, remaining: debtor.amount }, today)}
                </span>
                <strong>
                  <Link href={clientHref(debtor.clientId)}>{debtor.clientName}</Link>
                </strong>
                <small>
                  {countText(debtor.count)} · παλαιότερη λήξη {fmtDate(debtor.oldestDue)}
                </small>
              </td>
              <td className="ml-amount">
                {fmtMoney(debtor.amount)}
                <small>με ΦΠΑ</small>
              </td>
              <DebtorActions {...props} debtor={debtor} />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
