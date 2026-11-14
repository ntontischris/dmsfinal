import { FilterBar } from "@/spaces/kit/filter-bar";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import {
  EXPENSE_LINE_COLUMNS,
  INVOICE_COLUMNS,
  RECEIPT_COLUMNS,
} from "../export/datasets";
import { packMonths, pickPackMonth, type ExportQuery } from "../export/url";
import { PackButton } from "./m2-buttons";
import { m2Href, packButtonLabel, packMonthLabel } from "./m2-model";

// Οι στήλες των φύλλων του Excel: ίδιες με την «Άλλη εξαγωγή». Τα «Έξοδα» μόνο για όποιον τα βλέπει (d10).
const SHEETS = [
  { id: "invoices", label: "Τιμολόγια", columns: INVOICE_COLUMNS },
  { id: "receipts", label: "Εισπράξεις", columns: RECEIPT_COLUMNS },
  { id: "expenses", label: "Έξοδα", columns: EXPENSE_LINE_COLUMNS },
] as const;

function SheetColumns() {
  return (
    <dl className="dl">
      {SHEETS.map((d) => (
        <div key={d.id} className="m2-sheet">
          <dt>Φύλλο «{d.label}»</dt>
          <dd className="m2-cols">
            {d.columns.map((c) => (
              <Badge key={c.key}>{c.header}</Badge>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Πακέτο λογιστή (prototype `screens/m2-pack.tsx`): οι τελευταίοι 6 μήνες ως σήμερα (ημερομηνία της βάσης), προεπιλογή ο
// πρώτος κλεισμένος. Το .zip το φτιάχνει ο browser από ό,τι δίνει η βάση (export_accountant_pack, που γράφει Ίχνος).
export function PackSection(props: { today: string; query: ExportQuery }) {
  const months = packMonths(props.today);
  const current = months[0];
  const month = pickPackMonth(months, props.query.month);
  return (
    <div className="m2-section">
      <Panel label="Πακέτο λογιστή">
        <p className="muted">
          Ό,τι χρειάζεται ο λογιστής για έναν μήνα, με ένα κουμπί. Αρχικά
          επιλέγεται ο τελευταίος μήνας που έκλεισε· διάλεξε άλλον αν θέλεις.
        </p>
        <FilterBar
          label="Μήνας"
          filters={[
            {
              label: "Μήνας",
              options: months.map((m) => ({
                label: packMonthLabel(m, current),
                href: m2Href(props.query, { month: m }),
                isCurrent: m === month,
              })),
            },
          ]}
        />
        {month === current && (
          <p className="note">
            Ο μήνας δεν έχει κλείσει ακόμα· το πακέτο έχει ό,τι υπάρχει ως
            σήμερα.
          </p>
        )}
        <p className="muted">
          Ένα αρχείο .zip με ένα Excel (Τιμολόγια, Εισπράξεις και, για όποιον
          βλέπει Κόστος ή ποσά, Έξοδα) και τα PDF των Τιμολογίων του μήνα. Τα πιστωτικά είναι στο φύλλο «Τιμολόγια»,
          με «Είδος: Πιστωτικό».
        </p>
        <SheetColumns />
        <div className="btn-row">
          <PackButton
            month={month}
            label={`${packButtonLabel(month)} (.zip)`}
          />
        </div>
      </Panel>
    </div>
  );
}
