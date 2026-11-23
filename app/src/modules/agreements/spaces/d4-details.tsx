import { describeDeviation, formatDate, formatMoney } from "../helpers";
import type { ApprovalItem } from "../types";
import { ItemRows } from "./lane-rows";

const DEVIATION_LABEL = {
  new: "νέα",
  deeper: "βαθύτερη",
  covered: "ήδη εγκρίθηκε",
} as const;

interface DetailsProps {
  item: ApprovalItem;
  canSeeAmounts: boolean;
}

function LinesTable({ item }: { item: ApprovalItem }) {
  const suffix = item.kind === "monthly" ? " / μήνα" : "";
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Γραμμή</th>
          <th className="num">Κατάλογος</th>
          <th className="num">Πρόταση</th>
        </tr>
      </thead>
      <tbody>
        {item.lines.map((line, index) => (
          <tr key={`${line.description}-${index}`}>
            <td data-label="Γραμμή">
              {line.quantity > 1
                ? `${line.quantity} × ${line.description}`
                : line.description}
            </td>
            <td data-label="Κατάλογος" className="num">
              {line.isFree || line.catalogPrice === null
                ? "ελεύθερη γραμμή"
                : `${formatMoney(line.catalogPrice)}${suffix}`}
            </td>
            <td data-label="Πρόταση" className="num">
              {line.unitPrice === null ? (
                "—"
              ) : line.isBelow ? (
                <strong>{`${formatMoney(line.unitPrice)}${suffix}`}</strong>
              ) : (
                `${formatMoney(line.unitPrice)}${suffix}`
              )}
              {line.isBelow && " ↓"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PreviousApproval({ item, canSeeAmounts }: DetailsProps) {
  const previous = item.previous;
  if (previous === null) return null;
  return (
    <div className="note">
      <p>
        Η αναθεώρηση {previous.revision} εγκρίθηκε
        {previous.decidedByName && ` από ${previous.decidedByName}`}
        {previous.decidedAt && ` στις ${formatDate(previous.decidedAt)}`}
        {previous.comment && `: «${previous.comment}»`}. Η Έγκριση δένεται με
        εκείνη την αναθεώρηση· η νέα βαθαίνει την Παρέκκλιση:
      </p>
      <ul className="d5-plain">
        {item.deviations.map((deviation) => (
          <li key={deviation.key}>
            <strong>{DEVIATION_LABEL[deviation.status]}:</strong>{" "}
            {describeDeviation(deviation, canSeeAmounts)}
          </li>
        ))}
      </ul>
    </div>
  );
}

const countText = (count: number, one: string, many: string): string =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

const hintOf = (item: ApprovalItem): string =>
  [
    countText(item.deviations.length, "σημείο", "σημεία"),
    item.lines.length > 0
      ? countText(item.lines.length, "γραμμή", "γραμμές")
      : null,
    item.previous
      ? `προηγούμενη Έγκριση: αναθεώρηση ${item.previous.revision}`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

// Τι ζητά η πρόταση κάτω από τον Κατάλογο: κλειστό κουτί, η υπόδειξη λέει πόσα σημεία και γραμμές έχει μέσα.
export function DeviationBox({ item, canSeeAmounts }: DetailsProps) {
  return (
    <details className="ml-box">
      <summary>
        <h3 className="ml-box-title">Παρέκκλιση</h3>
        <small>{hintOf(item)}</small>
      </summary>
      <ItemRows
        isInset
        items={item.deviations.map((deviation) => ({
          id: deviation.key,
          title: describeDeviation(deviation, canSeeAmounts),
          isHighlighted: deviation.status !== "covered",
        }))}
      />
      {item.lines.length > 0 && <LinesTable item={item} />}
      <PreviousApproval item={item} canSeeAmounts={canSeeAmounts} />
    </details>
  );
}
