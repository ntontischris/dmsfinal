import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { VoidedItem } from "../invoice-detail-schema";

// Υπάρχει ισχύον Τιμολόγιο με τον ίδιο αριθμό; (π.χ. το ίδιο ανέβηκε δύο φορές)
const hasLiveTwin = (number: string, liveNumbers: ReadonlySet<string>): boolean =>
  liveNumbers.has(number);

// Η κάρτα «Ακυρωμένες καταχωρίσεις» του prototype (`screens/i2-voided.tsx`) από το invoices_voided_view.
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
    <details className="kit-panel i2-voided-panel">
      <summary className="kit-panel-head kit-label">
        Ακυρωμένες καταχωρίσεις ({items.length})
      </summary>
      <p className="note">
        Λάθος στο DMS (π.χ. ανέβηκε δύο φορές). Δεν μετρούν σε Καρτέλα και
        σύνολα· ο πελάτης δεν τις βλέπει.
      </p>
      <ul className="list">
        {items.map((i) => (
          <li key={i.id} className="i245-cell">
            <Badge tone="attention">ακυρώθηκε</Badge> <s className="i2-voided">{i.number}</s> ·{" "}
            {i.clientName} · <s>{fmtMoney(i.total)}</s> · έκδοση{" "}
            {fmtDate(i.issueDate)}
            {hasLiveTwin(i.number, liveNumbers) && (
              <span className="i245-sub">
                Ισχύει το άλλο {i.number} της λίστας· αυτό εδώ είναι το διπλό.
              </span>
            )}
            <span className="i245-sub">
              Λόγος: {i.reason} ({i.voidedBy ?? "—"}, {fmtDate(i.voidedAt)})
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
