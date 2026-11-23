import type { ReactNode } from "react";

import type { OpportunityKind } from "../sales-schema";
import { money, monthlyText } from "./m1-adapter";
import { Box, Facts } from "./m1-box";

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
    <Facts
      items={items.map((item) => ({
        label: item.label,
        value: item.value,
        basis: item.hint,
      }))}
    />
  );
}

// Ένα κλειστό κουτί της Αναφοράς· η υπόδειξη λέει τι έχει μέσα.
export function Section(props: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Box title={props.title} hint={props.hint}>
      {props.children}
    </Box>
  );
}

export const opportunitiesHint = (count: number): string =>
  count === 1 ? "1 Ευκαιρία" : `${count} Ευκαιρίες`;
