import Link from "next/link";

import {
  accountantPackOf,
  isCurrentMonth,
  packMonths,
} from "@/data/reports-access";
import type { RoleId } from "@/data/roles";
import { fmtMonth } from "@/screens/i6-model";
import { m2Href } from "@/screens/m2-model";
import type { ScreenQuery } from "@/screens/shared";

// Προεπιλογή: ο πρώτος κλεισμένος μήνας (ο προηγούμενος του τρέχοντος).
const defaultMonth = (months: readonly string[]): string =>
  months.find((m) => !isCurrentMonth(m)) ?? months[0];

const pickMonth = (months: readonly string[], value?: string): string =>
  months.find((m) => m === value) ?? defaultMonth(months);

const monthLabel = (month: string): string =>
  isCurrentMonth(month) ? `${fmtMonth(month)} (ως σήμερα)` : fmtMonth(month);

export function PackSection(props: { role: RoleId; query: ScreenQuery }) {
  const months = packMonths();
  const month = pickMonth(months, props.query.month);
  const pack = accountantPackOf(month);
  const isEmpty =
    pack.invoiceCount + pack.creditCount + pack.receiptCount + pack.pdfCount ===
    0;
  return (
    <section className="card m2-section">
      <h2 className="card-title">Πακέτο λογιστή</h2>
      <nav className="m2-chips" aria-label="Μήνας">
        <span className="muted">Μήνας:</span>
        {months.map((m) => (
          <Link
            key={m}
            className="badge"
            data-tone={m === month ? "strong" : undefined}
            aria-current={m === month ? "true" : undefined}
            href={m2Href(props.role, props.query, { month: m })}
          >
            {monthLabel(m)}
          </Link>
        ))}
      </nav>
      {isCurrentMonth(month) && (
        <p className="note">
          Ο μήνας δεν έχει κλείσει ακόμα· το πακέτο έχει ό,τι υπάρχει ως σήμερα.
        </p>
      )}
      <dl className="dl">
        <dt>Τιμολόγια</dt>
        <dd>{pack.invoiceCount}</dd>
        <dt>Πιστωτικά</dt>
        <dd>{pack.creditCount}</dd>
        <dt>Εισπράξεις</dt>
        <dd>{pack.receiptCount}</dd>
        <dt>PDF</dt>
        <dd>{pack.pdfCount}</dd>
      </dl>
      <p className="muted">
        Ένα Excel με δύο φύλλα (Τιμολόγια, Εισπράξεις) και τα PDF των
        Τιμολογίων, σε ένα .zip.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={isEmpty}
        >
          Λήψη πακέτου (.zip)
        </button>
      </div>
      {isEmpty && (
        <p className="note">Δεν υπάρχει τίποτα για αυτόν τον μήνα.</p>
      )}
    </section>
  );
}
