import type { B1Columns, B1Row } from "./b1-adapter";
import type { B1Filters } from "./b1-filters";
import { ClientLine, TakenLine } from "./b1-line";

interface ClientsTableProps extends B1Columns {
  // Οι γραμμές μετά τα φίλτρα (σειρά φίλτρων της οθόνης).
  rows: readonly B1Row[];
  filters: B1Filters;
}

// Η αναζήτηση ζει στη διεύθυνση (?q=), όπως στην παλιά εμφάνιση: ψάχνει η βάση, όχι μόνο οι 100 πρώτοι.
// Μένει πάντα ορατή πάνω από τη λίστα (τα φίλτρα είναι στο κλειστό «Φίλτρα») και κρατά τα φίλτρα που ισχύουν.
export function ClientsSearch({
  query,
  filters,
}: {
  query: string;
  filters: B1Filters;
}) {
  return (
    <form
      className="kit-fb-search"
      method="get"
      action="/app/clients"
      role="search"
    >
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
      {filters.pkg && (
        <input type="hidden" name="package" value={filters.pkg} />
      )}
      {Object.entries(filters.columns ?? {}).map(
        ([key, value]) =>
          value && <input key={key} type="hidden" name={key} value={value} />,
      )}
    </form>
  );
}

// Οι Πελάτες ως γραμμές (όπως τα Τιμολόγια): ένας <table> για τις σειρές με κείμενο, κάθε <tr> μία γραμμή-κάρτα.
// Κάθε παλιά στήλη ζει στη γραμμή: κατάσταση στην ετικέτα, τα υπόλοιπα στη μικρή γραμμή, το Υπόλοιπο δεξιά.
export function ClientsTable({ rows, filters, ...columns }: ClientsTableProps) {
  if (rows.length === 0)
    return (
      <p className="muted">
        {filters.isNoShoot
          ? "Όλοι οι μηνιαίοι Πελάτες έχουν γύρισμα αυτόν τον μήνα (έγινε ή κλεισμένο)."
          : "Κανένας Πελάτης δεν ταιριάζει με την αναζήτηση και τα φίλτρα."}
      </p>
    );
  return (
    <table className="ml-table ml-list b1-table">
      <thead>
        <tr>
          <th>Αρχικά</th>
          <th>Πελάτης</th>
          <th>Υπόλοιπο</th>
          <th>Ενέργειες</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
          row.isTaken && row.ownership ? (
            <TakenLine key={row.id} row={row} />
          ) : (
            <ClientLine key={row.id} row={row} {...columns} />
          ),
        )}
      </tbody>
    </table>
  );
}
