import type { Warning } from "../invoices-model";

interface InvoiceWarningsProps {
  warnings: readonly Warning[];
}

// Οι προειδοποιήσεις δεν μπλοκάρουν (Π4)· μόνο το άλλο ΑΦΜ θέλει τικ επιβεβαίωσης.
export function InvoiceWarnings({ warnings }: InvoiceWarningsProps) {
  if (warnings.length === 0) return null;
  return (
    <ul
      aria-label="Προειδοποιήσεις"
      className="m-0 grid list-none gap-1 p-0 text-sm"
    >
      {warnings.map((warning) => (
        <li
          key={warning.text}
          className={
            warning.isStrong ? "font-semibold text-destructive" : "text-primary"
          }
        >
          {warning.isStrong ? "Προσοχή: " : "Προειδοποίηση: "}
          {warning.text}
        </li>
      ))}
    </ul>
  );
}
