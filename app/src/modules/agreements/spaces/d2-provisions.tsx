"use client";

import { useState } from "react";

import { activeKinds } from "../helpers";
import type { KindInfo, Provision } from "../types";
import { NumberInput } from "./d2-ui";

// Οι Παροχές μιας γραμμής, ανά μονάδα, στη μορφή του prototype (`screens/d2-line-cells.tsx`): ποσότητα ανά είδος,
// «×» για αφαίρεση και «+ Παροχή». Γράφει το κρυφό πεδίο `provisions` (JSON) της φόρμας `formId`, όπως η σημερινή σελίδα.

interface Row {
  kindId: string;
  quantity: string;
  catalogQuantity: number | null;
}

const serialize = (rows: readonly Row[]): string =>
  JSON.stringify(
    rows.map((row) => ({
      kindId: row.kindId,
      quantity: Number(row.quantity) || 0,
    })),
  );

const unitOf = (kinds: readonly KindInfo[], kindId: string): string => {
  const kind = kinds.find((k) => k.id === kindId);
  if (!kind) return "—";
  return kind.isRetired ? `${kind.unit} (αποσυρμένο)` : kind.unit;
};

interface ProvisionsCellProps {
  formId: string;
  kinds: readonly KindInfo[];
  initial: readonly Provision[];
}

export function ProvisionsCell({
  formId,
  kinds,
  initial,
}: ProvisionsCellProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((p) => ({
      kindId: p.kindId,
      quantity: String(p.quantity),
      catalogQuantity: p.catalogQuantity,
    })),
  );
  const missing = activeKinds(kinds).filter(
    (kind) => !rows.some((row) => row.kindId === kind.id),
  );
  const setQuantity = (kindId: string, quantity: string) =>
    setRows((current) =>
      current.map((row) =>
        row.kindId === kindId ? { ...row, quantity } : row,
      ),
    );
  const remove = (kindId: string) =>
    setRows((current) => current.filter((row) => row.kindId !== kindId));
  const add = (kindId: string) =>
    kindId &&
    setRows((current) => [
      ...current,
      { kindId, quantity: "1", catalogQuantity: null },
    ]);
  return (
    <span className="stack">
      <input
        type="hidden"
        name="provisions"
        form={formId}
        value={serialize(rows)}
      />
      {rows.length === 0 && <span className="muted">Καμία Παροχή.</span>}
      {rows.map((row) => {
        const unit = unitOf(kinds, row.kindId);
        return (
          <span key={row.kindId} className="stack">
            <span className="btn-row">
              <NumberInput
                label={`Ποσότητα ${unit}`}
                value={row.quantity}
                min={1}
                max={999}
                onChange={(value) => setQuantity(row.kindId, value)}
                suffix={unit}
              />
              <button
                type="button"
                className="button"
                aria-label={`Αφαίρεση ${unit}`}
                onClick={() => remove(row.kindId)}
              >
                ×
              </button>
            </span>
            {row.catalogQuantity !== null && (
              <span className="muted">
                Κατάλογος: {row.catalogQuantity} ανά μονάδα
              </span>
            )}
          </span>
        );
      })}
      {missing.length > 0 && (
        <select
          className="select"
          aria-label="Προσθήκη Παροχής"
          value=""
          onChange={(event) => add(event.target.value)}
        >
          <option value="">+ Παροχή</option>
          {missing.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.unit}
            </option>
          ))}
        </select>
      )}
      <span className="btn-row">
        <button type="submit" className="button" form={formId}>
          Αποθήκευση Παροχών
        </button>
      </span>
    </span>
  );
}
