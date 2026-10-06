import { HOLIDAYS_2026 } from "@/data/notifications";
import { Badge, fmtDate } from "@/screens/shared";

import "./k1.css";

export function HolidayList() {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Αργίες 2026</h2>
        <button className="button" type="button">
          Προσθήκη αργίας
        </button>
      </div>
      <p className="note">
        13 επίσημες αργίες με τις κινητές του Πάσχα. Σβήνεις όποια δεν θες να
        φεύγει ευχή· όσες πρόσθεσες εσύ φαίνονται με σήμα.
      </p>
      <ul className="list">
        {HOLIDAYS_2026.map((h) => (
          <li key={h.date} className="k1-holiday">
            <span>
              {fmtDate(h.date)} · {h.name}{" "}
              {h.isAdded && <Badge>πρόσθεσες εσύ</Badge>}
            </span>
            <label className="k1-switch">
              <input type="checkbox" defaultChecked={h.isOn} />
              Ενεργή
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
