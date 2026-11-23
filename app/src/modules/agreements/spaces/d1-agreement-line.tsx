import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";

import type { AgreementRowView } from "../types";
import { StatusTag, type TagTone } from "./d1-status-tag";

interface AgreementLineProps {
  row: AgreementRowView;
  // Το ποσό μόνο όταν ο Χρήστης «Βλέπει ποσά» (αλλιώς η βάση στέλνει null).
  showAmount: boolean;
  canSeeCost: boolean;
}

// Προτάσεις περιμένουν τον πελάτη· ό,τι θέλει προσοχή γίνεται κόκκινη τελεία.
const toneOf = (row: AgreementRowView): TagTone | undefined => {
  if (row.isAttention) return "urgent";
  return row.bucket === "proposal" ? "waiting" : undefined;
};

function LineTags({ row, canSeeCost }: Omit<AgreementLineProps, "showAmount">) {
  return (
    <span className="d1l-tags">
      <StatusTag label={row.statusLabel} tone={toneOf(row)} />
      {row.hasChangeRequests && (
        <StatusTag label="Ζήτησε αλλαγές" tone="urgent" />
      )}
      {canSeeCost && row.isLowMargin && (
        <StatusTag label="χαμηλό περιθώριο" tone="urgent" />
      )}
      {row.expiryText && <StatusTag label={row.expiryText} tone="urgent" />}
    </span>
  );
}

// Μία Συμφωνία = μία γραμμή: αρχικά πελάτη, κατάσταση, τίτλος, και από κάτω πελάτης · είδος · χρόνος · Υπεύθυνος.
export function AgreementLine({
  row,
  showAmount,
  canSeeCost,
}: AgreementLineProps) {
  return (
    <tr
      className="ml-line"
      data-urgent={row.isAttention || undefined}
      data-faded={row.bucket === "closed" || undefined}
    >
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(row.clientName)}
      </td>
      <td className="ml-main">
        <LineTags row={row} canSeeCost={canSeeCost} />
        <strong>
          <Link className="d1l-title" href={row.href}>
            {row.title}
          </Link>
        </strong>
        <small>
          <Link href={row.clientHref}>{row.clientName}</Link> · {row.kindLabel}{" "}
          · {row.timeText} ·{" "}
          {row.managerName ? `Υπεύθυνος ${row.managerName}` : "χωρίς Υπεύθυνο"}
        </small>
      </td>
      {showAmount && (
        <td className="ml-amount">
          {row.amount ?? "—"}
          {row.discountNote && <small>{row.discountNote}</small>}
        </td>
      )}
    </tr>
  );
}
