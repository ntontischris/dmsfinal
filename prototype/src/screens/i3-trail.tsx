import { personName } from "@/data/filming";
import type { Invoice } from "@/data/finance";
import { fmtDate } from "@/screens/shared";

import "./i13.css";

export function InvoiceTrail({ invoice }: { invoice: Invoice }) {
  const { voided, corrections = [] } = invoice;
  return (
    <section className="card">
      <h2>Ίχνος καταχώρισης: {invoice.number}</h2>
      <ul className="list">
        <li className="i13-wrap">
          Καταχωρήθηκε {fmtDate(invoice.registeredAt)} από{" "}
          {personName(invoice.registeredBy)}
        </li>
        {corrections.map((c) => (
          <li key={`${c.when}-${c.what}`} className="i13-wrap">
            {fmtDate(c.when)} · {personName(c.by)} · Διόρθωση: {c.what}
          </li>
        ))}
        {voided && (
          <li className="i13-wrap">
            {fmtDate(voided.when)} · {personName(voided.by)} · ακυρώθηκε:{" "}
            {voided.reason}
          </li>
        )}
      </ul>
    </section>
  );
}
