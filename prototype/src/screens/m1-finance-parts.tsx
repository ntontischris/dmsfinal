import type { ReactNode } from "react";

import { fmtMoney } from "@/screens/shared";

export const money = (value: number, show: boolean): string =>
  show ? fmtMoney(value) : "—";

export function SummaryCard(props: {
  label: string;
  basis: string;
  value: string;
}) {
  return (
    <div className="card m1f-card">
      <span className="muted">{props.label}</span>
      <strong>{props.value}</strong>
      <span className="muted">{props.basis}</span>
    </div>
  );
}

export function ExportRow({ canExport }: { canExport: boolean }) {
  if (!canExport) return null;
  return (
    <div className="m1f-export">
      <button className="button" type="button">
        Εξαγωγή σε Excel
      </button>
      <span className="muted">
        Βγάζει ό,τι βλέπεις, με τα ίδια φίλτρα. Γράφεται στο Ίχνος ενεργειών.
      </span>
    </div>
  );
}

export function Cell(props: {
  label: string;
  num?: boolean;
  children: ReactNode;
}) {
  return (
    <td className={props.num ? "num" : undefined} data-label={props.label}>
      {props.children}
    </td>
  );
}
