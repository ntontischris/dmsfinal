import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { initialsOf } from "@/spaces/shell/avatar";

import type { DeliverableRules } from "../rules-types";
import type { DeliverableCard } from "../types";
import { productionLabel } from "./h1-model";

import "./h1.css";

// Οι κάρτες του H1 (prototype `screens/h1-panels.tsx`): αποφάσεις χρέωσης και Κανόνες Παραδοτέων.

export function ChargesCard({ items }: { items: readonly DeliverableCard[] }) {
  if (items.length === 0) return null;
  return (
    <Panel label="Αποφάσεις χρέωσης" aside={items.length} isFlush>
      <p className="note sx-pad">
        Η Παροχή δεν έφτανε για το Παραδοτέο: η δουλειά συνεχίζει, η χρέωση
        περιμένει απόφαση.
      </p>
      <RowList>
        {items.map((d) => (
          <ListRow
            key={d.id}
            lead={
              <span className="part-tile" aria-hidden="true">
                {initialsOf(d.title)}
              </span>
            }
            href={hrefOf("H2", { id: d.id })}
            title={d.title}
            sub={`(${productionLabel(d)})`}
          />
        ))}
      </RowList>
    </Panel>
  );
}

export function RulesCard({ rules }: { rules: DeliverableRules }) {
  return (
    <Panel label="⚙ Κανόνες Παραδοτέων">
      <dl className="dl">
        <div className="row">
          <dt>Εσωτερικός έλεγχος</dt>
          <dd>{rules.internalReview ? "ενεργός" : "ανενεργός"}</dd>
        </div>
        <div className="row">
          <dt>Εργάσιμες μετά από αλλαγές</dt>
          <dd>{rules.changesDays}</dd>
        </div>
        <div className="row">
          <dt>Προθεσμίες ανά είδος (εργάσιμες)</dt>
          <dd>
            {rules.kinds.map((k) => `${k.label} ${k.deadlineDays}`).join(" · ")}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
