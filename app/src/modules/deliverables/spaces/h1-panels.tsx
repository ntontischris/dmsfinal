import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { DeliverableRules } from "../rules-types";
import type { DeliverableCard } from "../types";
import { productionLabel } from "./h1-model";

import "../../finance/spaces/money-lines.css";
import "./h1.css";

// Τα κουτιά του H1: αποφάσεις χρέωσης (ανοιχτό, θέλει απόφαση) και Κανόνες Παραδοτέων (κλειστό).

export function ChargesCard({ items }: { items: readonly DeliverableCard[] }) {
  if (items.length === 0) return null;
  return (
    <section className="h1-box">
      <details className="ml-box" open>
        <summary>
          <h2 className="ml-box-title">Αποφάσεις χρέωσης</h2>
          <small>{items.length} περιμένουν απόφαση</small>
        </summary>
        <p className="note">
          Η Παροχή δεν έφτανε ή ένας γύρος αλλαγών πέρασε το όριο: η δουλειά
          συνεχίζει, η χρέωση περιμένει απόφαση.
        </p>
        <ul className="ml-list">
          {items.map((d) => (
            <li key={d.id} className="ml-line">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(d.title)}
              </span>
              <span className="ml-main">
                <strong>
                  <Link href={hrefOf("H2", { id: d.id })}>{d.title}</Link>
                </strong>
                <small>{productionLabel(d)}</small>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function RulesCard({ rules }: { rules: DeliverableRules }) {
  const review = rules.internalReview ? "ενεργός" : "ανενεργός";
  return (
    <section className="h1-box">
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Κανόνες Παραδοτέων</h2>
          <small>Εσωτερικός έλεγχος {review}</small>
        </summary>
        <dl className="ml-kv">
          <div>
            <dt>Εσωτερικός έλεγχος</dt>
            <dd>{review}</dd>
          </div>
          <div>
            <dt>Εργάσιμες μετά από αλλαγές</dt>
            <dd>{rules.changesDays}</dd>
          </div>
          <div>
            <dt>Προθεσμίες ανά είδος (εργάσιμες)</dt>
            <dd>
              {rules.kinds
                .map((k) => `${k.label} ${k.deadlineDays}`)
                .join(" · ")}
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
