import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { VoidedItem } from "../invoice-detail-schema";

import "./money-lines.css";

// Υπάρχει ισχύον Τιμολόγιο με τον ίδιο αριθμό; (π.χ. το ίδιο ανέβηκε δύο φορές)
const hasLiveTwin = (number: string, liveNumbers: ReadonlySet<string>): boolean =>
  liveNumbers.has(number);

const initialsOf = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function VoidedLine({ item, isTwin }: { item: VoidedItem; isTwin: boolean }) {
  return (
    <li className="ml-line" data-faded="">
      <span className="ml-thumb" aria-hidden="true">{initialsOf(item.clientName)}</span>
      <div className="ml-main">
        <span className="ml-tag">ακυρώθηκε</span>
        <strong>{item.clientName}</strong>
        <small>
          <s className="i2-voided">{item.number}</s> · έκδοση {fmtDate(item.issueDate)}
        </small>
        {isTwin && <small>Ισχύει το άλλο {item.number} της λίστας· αυτό εδώ είναι το διπλό.</small>}
        <small>
          Λόγος: {item.reason} ({item.voidedBy ?? "—"}, {fmtDate(item.voidedAt)})
        </small>
      </div>
      <span className="ml-amount"><s>{fmtMoney(item.total)}</s></span>
    </li>
  );
}

// Η κάρτα «Ακυρωμένες καταχωρίσεις» (invoices_voided_view) ως κλειστό κουτί με γραμμές.
// Κλειστή από προεπιλογή, ώστε το ακυρωμένο να μη μπερδεύεται με το ισχύον.
export function VoidedCard({
  items,
  liveNumbers,
}: {
  items: readonly VoidedItem[];
  liveNumbers: ReadonlySet<string>;
}) {
  if (items.length === 0) return null;
  return (
    <details className="ml-box">
      <summary>
        <h2 className="ml-box-title">Ακυρωμένες καταχωρίσεις ({items.length})</h2>
        <small>Λάθη στο DMS· δεν μετρούν σε Καρτέλα και σύνολα, ο πελάτης δεν τα βλέπει.</small>
      </summary>
      <ul className="ml-list">
        {items.map((i) => (
          <VoidedLine key={i.id} item={i} isTwin={hasLiveTwin(i.number, liveNumbers)} />
        ))}
      </ul>
    </details>
  );
}
