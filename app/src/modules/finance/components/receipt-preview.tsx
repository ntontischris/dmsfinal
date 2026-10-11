import { formatReceiptMoney } from "../money";
import type { PreviewResult } from "../actions";

interface ReceiptPreviewProps {
  result: PreviewResult | null;
}

// «Θα εξοφλήσει»: τα Τιμολόγια που θα εξοφληθούν (παλαιότερο πρώτα) και το υπόλοιπο υπέρ του Πελάτη.
export function ReceiptPreview({ result }: ReceiptPreviewProps) {
  if (result === null || !("preview" in result)) return null;
  const { settles, surplus } = result.preview;
  return (
    <section aria-label="Θα εξοφλήσει" className="grid gap-2 rounded-sm border border-border bg-muted p-3 text-sm">
      <span className="kit-label">Θα εξοφλήσει</span>
      {settles.length === 0 ? (
        <p className="m-0">
          Κανένα Τιμολόγιο ακόμη· όλο το ποσό είναι υπέρ του πελάτη ({formatReceiptMoney(surplus)}) και
          συμψηφίζεται με το επόμενο.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-1 p-0">
          {settles.map((settle) => (
            <li key={settle.invoiceId}>
              Τιμολόγιο {settle.number}: {formatReceiptMoney(settle.amount)}
            </li>
          ))}
          {surplus > 0 && <li>Υπέρ του πελάτη: {formatReceiptMoney(surplus)}</li>}
        </ul>
      )}
    </section>
  );
}
