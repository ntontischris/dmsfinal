import Link from "next/link";

import { Entity, Meter, Person } from "@/spaces/kit/parts";
import { Badge, fmtDate, type BadgeTone } from "@/spaces/screens/shared";

import type { B1Columns, B1Row } from "./b1-adapter";
import type { B1Filters } from "./b1-filters";

interface ClientsTableProps extends B1Columns {
  // Οι γραμμές μετά τα φίλτρα (πάνελ φίλτρων της οθόνης).
  rows: readonly B1Row[];
  // Η αναζήτηση ζει στη διεύθυνση (?q=), όπως στην παλιά εμφάνιση: ψάχνει η βάση, όχι μόνο οι 100 πρώτοι.
  query: string;
  filters: B1Filters;
}

// Η κατάσταση ως χάπι: ενεργός = έμφαση, υποψήφιος = περιμένει, ανενεργός = ξεθωριασμένο.
const STATUS_TONE: Readonly<Record<string, BadgeTone>> = {
  Ενεργός: "strong",
  Υποψήφιος: "waiting",
  Ανενεργός: "faded",
};

// Η αναζήτηση κρατά τα φίλτρα που ισχύουν.
function SearchForm({ query, filters }: { query: string; filters: B1Filters }) {
  return (
    <form className="toolbar" method="get" action="/app/clients" role="search">
      <input
        className="input grow"
        type="search"
        name="q"
        placeholder="Αναζήτηση πελάτη…"
        aria-label="Αναζήτηση πελάτη"
        defaultValue={query}
        autoComplete="off"
      />
      {filters.status && (
        <input type="hidden" name="status" value={filters.status} />
      )}
      {filters.isNoShoot && <input type="hidden" name="noshoot" value="1" />}
      {filters.isMonthly && <input type="hidden" name="monthly" value="1" />}
    </form>
  );
}

// Ο πίνακας Πελατών του prototype (`screens/b1-clients-table.tsx`) με πραγματικές γραμμές. Τα φίλτρα είναι στο πάνελ
// φίλτρων της οθόνης· η αναζήτηση στέλνεται στη βάση.
export function ClientsTable(props: ClientsTableProps) {
  const {
    rows: visible,
    query,
    filters,
    showOwner,
    showOpportunities,
    showAgreements,
    showBalance,
  } = props;

  return (
    <>
      <SearchForm query={query} filters={filters} />
      {visible.length === 0 ? (
        <p className="muted">
          {filters.isNoShoot
            ? "Όλοι οι μηνιαίοι Πελάτες έχουν γύρισμα αυτόν τον μήνα (έγινε ή κλεισμένο)."
            : "Κανένας Πελάτης δεν ταιριάζει με την αναζήτηση και τα φίλτρα."}
        </p>
      ) : (
        <div className="scroll">
          <table className="rtable b1-table">
            <thead>
              <tr>
                <th>Πελάτης</th>
                <th>Κατάσταση</th>
                {showOwner && <th>Υπεύθυνος</th>}
                {showOpportunities && (
                  <th className="num">Ανοιχτές Ευκαιρίες</th>
                )}
                {showOpportunities && <th>Τελευταία επαφή</th>}
                <th>Πακέτο · αυτός ο μήνας</th>
                {showAgreements && <th className="num">Ενεργές Συμφωνίες</th>}
                {showBalance && <th className="num">Υπόλοιπο</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) =>
                row.isTaken && row.ownership ? (
                  <tr key={row.id} className="taken">
                    <td colSpan={9}>
                      <span className="part-title">{row.name}</span>{" "}
                      <Badge>{row.ownership.badge}</Badge>{" "}
                      <span className="muted">{row.ownership.note}</span>
                    </td>
                  </tr>
                ) : (
                  <ClientLine key={row.id} row={row} {...props} />
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ClientLine({
  row,
  showOwner,
  showOpportunities,
  showAgreements,
  showBalance,
}: ClientsTableProps & { row: B1Row }) {
  return (
    <tr>
      <td data-label="Πελάτης">
        <Entity name={row.name} href={row.href} sub={row.city || undefined}>
          {row.ownership && (
            <>
              <Badge>{row.ownership.badge}</Badge>{" "}
              <span className="muted">{row.ownership.note}</span>{" "}
            </>
          )}
          {row.isPossibleDuplicate && (
            <Link className="b1-duplicate" href={row.mergeHref}>
              Πιθανό διπλό: συγχώνευση ή όχι
            </Link>
          )}
        </Entity>
      </td>
      <td data-label="Κατάσταση">
        {row.status ? (
          <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      {showOwner && (
        <td data-label="Υπεύθυνος">
          <Person name={row.owner} />
        </td>
      )}
      {showOpportunities && (
        <td className="num" data-label="Ανοιχτές Ευκαιρίες">
          {row.openOpportunities ?? "—"}
        </td>
      )}
      {showOpportunities && (
        <td data-label="Τελευταία επαφή">
          {row.lastContact ? (
            fmtDate(row.lastContact)
          ) : (
            <span className="muted">καμία</span>
          )}
        </td>
      )}
      <td data-label="Πακέτο · αυτός ο μήνας">
        {row.packageName && (
          <span className="b1-package">{row.packageName}</span>
        )}
        {row.month ? (
          <div className="b1-month" aria-label={row.month.text}>
            {row.month.meters.map((meter) => (
              <Meter key={meter.label} {...meter} />
            ))}
            {row.month.next && (
              <span className="part-sub">
                επόμενο γύρισμα <strong>{row.month.next}</strong>
              </span>
            )}
            {row.month.hasNoShoot && (
              <Badge tone="attention">Χωρίς γύρισμα</Badge>
            )}
          </div>
        ) : (
          !row.packageName && <span className="muted">—</span>
        )}
      </td>
      {showAgreements && (
        <td className="num" data-label="Ενεργές Συμφωνίες">
          {row.activeAgreements ?? "—"}
        </td>
      )}
      {showBalance && (
        <td className="num b1-balance" data-label="Υπόλοιπο">
          {row.balance ?? "—"}
        </td>
      )}
    </tr>
  );
}
