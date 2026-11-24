"use client";

import { initialsOf } from "@/spaces/shell/avatar";
import { Badge } from "@/spaces/screens/shared";

import { formatMoney } from "../helpers";
import { DEVIATION_STATUS_LABELS } from "../labels";
import type { AgreementDetail, AgreementLine, KindInfo } from "../types";
import { LineEdit } from "./d2-line-edit";
import { hoursText, lineDeviationsOf, lineProvisionsText } from "./d2-model";

// Μία γραμμή του κουτιού «Γραμμές» στη μορφή `ml-line` (πλακίδιο, ετικέτες, περιγραφή, μικρή γραμμή με ποσότητα, τιμή,
// Παροχές και ώρες, σύνολο). Όποιος γράφει την πρόταση βλέπει από κάτω τα πεδία της (`LineEdit`).

export const lineFormIds = (lineId: string) => ({
  update: `d2-line-${lineId}`,
  provisions: `d2-provisions-${lineId}`,
  remove: `d2-remove-${lineId}`,
});

export interface LineColumns {
  amount: boolean;
  cost: boolean;
}

interface LineRowProps {
  line: AgreementLine;
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  columns: LineColumns;
}

const DEVIATION_SHORT: Readonly<Record<string, string>> = {
  price: "τιμή",
  provisions: "Παροχές",
};

const moneyOrDash = (value: number | null): string =>
  value === null ? "—" : formatMoney(value);

function LineTags({
  line,
  agreement,
}: Omit<LineRowProps, "kinds" | "columns">) {
  const deviations = lineDeviationsOf(agreement.deviations, line.id);
  if (line.kind !== "free" && deviations.length === 0) return null;
  return (
    <span className="ml-quick">
      {line.kind === "free" && <span className="ml-tag">Ελεύθερη γραμμή</span>}
      {deviations.map((d) => (
        <Badge
          key={d.key}
          tone={d.status === "covered" ? undefined : "attention"}
        >
          {DEVIATION_SHORT[d.kind]
            ? `${DEVIATION_SHORT[d.kind]}: ${DEVIATION_STATUS_LABELS[d.status]}`
            : `Παρέκκλιση: ${DEVIATION_STATUS_LABELS[d.status]}`}
        </Badge>
      ))}
    </span>
  );
}

// Ό,τι ήταν στήλες του παλιού πίνακα (ποσότητα, τιμή μονάδας, Κατάλογος, Παροχές, ώρες, άμεσο κόστος) σε μία μικρή γραμμή.
const detailOf = ({
  line,
  kinds,
  columns,
}: Omit<LineRowProps, "agreement">) => {
  const isOffCatalogue =
    line.unitPrice !== null &&
    line.catalogPrice !== null &&
    line.unitPrice !== line.catalogPrice;
  return [
    columns.amount
      ? `${line.quantity}× ${moneyOrDash(line.unitPrice)}`
      : `${line.quantity}×`,
    isOffCatalogue && line.catalogPrice !== null
      ? `Κατάλογος: ${formatMoney(line.catalogPrice)}`
      : null,
    `Παροχές: ${lineProvisionsText(line, kinds)}`,
    columns.cost
      ? `ώρες γύρ. / μοντ. ${hoursText(line)} · άμεσο κόστος ${moneyOrDash(line.directCost)}`
      : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
};

export function LineRow(props: LineRowProps) {
  const { line, agreement, kinds, columns } = props;
  const { can } = agreement;
  return (
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(line.description || "—")}
      </td>
      <td className="ml-main">
        <LineTags line={line} agreement={agreement} />
        <strong>{line.description}</strong>
        <small>{detailOf(props)}</small>
      </td>
      {columns.amount && (
        <td className="ml-amount">{moneyOrDash(line.lineTotal)}</td>
      )}
      {can.edit && (
        <td className="ml-edit">
          <LineEdit
            line={line}
            kinds={kinds}
            columns={columns}
            canEditPrices={can.editPrices}
            canEditCost={can.editCost}
            ids={lineFormIds(line.id)}
          />
        </td>
      )}
    </tr>
  );
}
