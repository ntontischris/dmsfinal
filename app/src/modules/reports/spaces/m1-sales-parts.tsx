import type { ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";

import type { OpportunityKind } from "../sales-schema";
import { money, monthlyText } from "./m1-adapter";

import "./m1-sales.css";

// Κοινά κομμάτια των Αναφορών πωλήσεων (prototype `screens/m1-sales-parts.tsx`). Το ExportRow είναι στο m1-export-row.

// Η αξία μιας Ευκαιρίας: χωρίς πρόταση το λέει ρητά, χωρίς ποσά «—», αλλιώς μηνιαία ή εφάπαξ.
export const rowValue = (
  kind: OpportunityKind,
  value: number | null,
): string => {
  if (kind === null) return "Χωρίς πρόταση";
  return kind === "monthly" ? monthlyText(value) : money(value);
};

export function Cards({
  items,
}: {
  items: readonly { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="m1s-cards">
      {items.map((item) => (
        <Panel key={item.label} label={item.label} aside={item.hint}>
          <strong className="m1s-big">{item.value}</strong>
        </Panel>
      ))}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="m1s-section">
      <Panel label={title} isFlush>
        {children}
      </Panel>
    </div>
  );
}
