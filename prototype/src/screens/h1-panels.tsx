import Link from "next/link";

import { PROVISION_KINDS } from "@/data/catalogue";
import { DELIVERABLE_RULES } from "@/data/deliverables";
import type { DeliverableSummary } from "@/data/productions";
import type { RoleId } from "@/data/roles";
import { productionLabel } from "@/screens/h1-model";
import { screenHref } from "@/screens/shared";

import "./h1.css";

export function ChargesCard({
  role,
  items,
}: {
  role: RoleId;
  items: readonly DeliverableSummary[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="card h1-charges">
      <h2 className="card-title">Αποφάσεις χρέωσης ({items.length})</h2>
      <p className="note">
        Γύρος πέρα από το Όριο αλλαγών: η δουλειά συνεχίζει, η χρέωση
        περιμένει απόφαση.
      </p>
      <ul>
        {items.map((d) => (
          <li key={d.id}>
            <Link href={screenHref(role, "H2", { id: d.id })}>{d.title}</Link>{" "}
            <span className="muted">({productionLabel(d)})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RulesCard() {
  const rules = DELIVERABLE_RULES;
  return (
    <section className="card h1-rules">
      <h2 className="card-title">⚙ Κανόνες Παραδοτέων</h2>
      <dl className="dl">
        <div className="row">
          <dt>Εσωτερικός έλεγχος</dt>
          <dd>{rules.internalReview ? "ενεργός" : "ανενεργός"}</dd>
        </div>
        <div className="row">
          <dt>Εργάσιμες μετά από αλλαγές</dt>
          <dd>{rules.daysAfterChanges}</dd>
        </div>
        <div className="row">
          <dt>Προθεσμίες ανά είδος (εργάσιμες)</dt>
          <dd>
            {PROVISION_KINDS.filter((k) => rules.deadlineDays[k.id] !== undefined)
              .map((k) => `${k.name} ${rules.deadlineDays[k.id]}`)
              .join(" · ")}
          </dd>
        </div>
        <div className="row">
          <dt>Υπενθυμίσεις στον πελάτη (μέρες αναμονής)</dt>
          <dd>{rules.reminderDays.join(", ")}</dd>
        </div>
      </dl>
    </section>
  );
}
