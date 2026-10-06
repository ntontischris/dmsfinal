import { personName } from "@/data/filming";
import { INVOICES } from "@/data/finance";
import { clientNameOf } from "@/screens/i2-model";
import { VoidedBadge } from "@/screens/i2-ui";
import { fmtDate, fmtMoney } from "@/screens/shared";

import "./i245.css";

export function VoidedCard() {
  const voided = INVOICES.filter((i) => i.voided);
  if (voided.length === 0) return null;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ακυρωμένες καταχωρίσεις</h2>
      </div>
      <p className="note">
        Λάθος στο DMS (π.χ. ανέβηκε δύο φορές). Δεν μετρούν σε Καρτέλα και
        σύνολα· ο πελάτης δεν τις βλέπει.
      </p>
      <ul className="list">
        {voided.map((i) => (
          <li key={i.id} className="i245-cell">
            <VoidedBadge /> {i.number} · {clientNameOf(i.clientId)} ·{" "}
            {fmtMoney(i.total)} · έκδοση {fmtDate(i.issueDate)}
            <span className="i245-sub">
              Λόγος: {i.voided?.reason} ({personName(i.voided?.by ?? "")},{" "}
              {fmtDate(i.voided?.when ?? i.issueDate)})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
