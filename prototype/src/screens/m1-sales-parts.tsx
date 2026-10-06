import type { ReactNode } from "react";

import { type SalesRow } from "@/data/reports-access";
import { fmtMoney } from "@/screens/shared";

import "./m1-sales.css";

export const AMOUNT_HIDDEN = "—";

export const money = (value: number, canSee: boolean): string =>
  canSee ? fmtMoney(value) : AMOUNT_HIDDEN;

export const monthlyText = (value: number, canSee: boolean): string =>
  canSee ? `${fmtMoney(value)} /μήνα` : AMOUNT_HIDDEN;

export const rowValue = (row: SalesRow, canSee: boolean): string => {
  if (row.monthly !== null) return monthlyText(row.monthly, canSee);
  if (row.once !== null) return money(row.once, canSee);
  return "Χωρίς πρόταση";
};

export function Cards({
  items,
}: {
  items: readonly { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="m1s-cards">
      {items.map((item) => (
        <div key={item.label} className="card m1s-card">
          <span className="muted">{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint && <span className="muted">{item.hint}</span>}
        </div>
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
    <section className="m1s-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ExportRow({ canExport }: { canExport: boolean }) {
  if (!canExport) return null;
  return (
    <div className="m1s-export">
      <button className="button" type="button">
        Εξαγωγή σε Excel
      </button>
      <span className="muted">
        Βγάζει ό,τι βλέπεις, με τα ίδια φίλτρα. Γράφεται στο Ίχνος ενεργειών.
      </span>
    </div>
  );
}
