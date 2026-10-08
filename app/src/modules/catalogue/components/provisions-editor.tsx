"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

import { MEASURE_LABELS } from "../labels";
import { activeKinds } from "../helpers";
import type { Provision, ProvisionKind } from "../types";

interface DraftRow {
  key: number;
  kindId: string; // "" = δεν διαλέχτηκε ακόμα είδος
  quantity: string;
}

interface ProvisionsEditorProps {
  kinds: readonly ProvisionKind[]; // όλα τα είδη, και τα αποσυρμένα (για να φαίνεται το όνομα ενός παλιού)
  initial: readonly Provision[];
  isPerPeriod: boolean; // μηνιαίο Πακέτο: οι ποσότητες είναι «ανά Περίοδο»
}

const toDrafts = (initial: readonly Provision[]): DraftRow[] =>
  initial.map((provision, key) => ({
    key,
    kindId: provision.kindId,
    quantity: String(provision.quantity),
  }));

// Οι γραμμές χωρίς είδος μένουν έξω· μια ποσότητα που δεν διαβάζεται γίνεται 0 ώστε να τη ρίξει ο έλεγχος με καθαρό μήνυμα.
const serialize = (rows: readonly DraftRow[]): string =>
  JSON.stringify(
    rows
      .filter((row) => row.kindId !== "")
      .map((row) => ({
        kindId: row.kindId,
        quantity: Number(row.quantity) || 0,
      })),
  );

const measureText = (kind: ProvisionKind | undefined): string => {
  if (!kind) return "";
  if (kind.measure === null) return "μετράει σε πλήθος";
  const label = MEASURE_LABELS[kind.measure];
  return kind.defaultHours === null
    ? label
    : `${label}, έως ${kind.defaultHours} ώρες`;
};

// Τα είδη που προσφέρει μια γραμμή: τα ενεργά που δεν τα έχει άλλη γραμμή, και το δικό της αν έχει αποσυρθεί.
const optionsFor = (
  row: DraftRow,
  rows: readonly DraftRow[],
  kinds: readonly ProvisionKind[],
): { id: string; label: string }[] => {
  const takenElsewhere = new Set(
    rows.filter((other) => other.key !== row.key).map((other) => other.kindId),
  );
  const own = kinds.find((kind) => kind.id === row.kindId && kind.isRetired);
  return [
    ...activeKinds(kinds)
      .filter((kind) => !takenElsewhere.has(kind.id))
      .map((kind) => ({ id: kind.id, label: kind.label })),
    ...(own ? [{ id: own.id, label: `${own.label} (αποσυρμένο)` }] : []),
  ];
};

interface RowProps {
  row: DraftRow;
  rows: readonly DraftRow[];
  kinds: readonly ProvisionKind[];
  isPerPeriod: boolean;
  onChange: (key: number, patch: Partial<DraftRow>) => void;
  onRemove: (key: number) => void;
}

function EditorRow({
  row,
  rows,
  kinds,
  isPerPeriod,
  onChange,
  onRemove,
}: RowProps) {
  const kind = kinds.find((candidate) => candidate.id === row.kindId);
  return (
    <li className="grid gap-1 rounded-sm border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <Input
            type="number"
            min={1}
            max={999}
            step={1}
            aria-label="Ποσότητα"
            value={row.quantity}
            onChange={(event) =>
              onChange(row.key, { quantity: event.target.value })
            }
          />
        </div>
        <div className="min-w-40 flex-1">
          <Select
            aria-label="Είδος Παροχής"
            value={row.kindId}
            onChange={(event) =>
              onChange(row.key, { kindId: event.target.value })
            }
          >
            <option value="">Διάλεξε είδος…</option>
            {optionsFor(row, rows, kinds).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onRemove(row.key)}>
          Αφαίρεση
        </Button>
      </div>
      {kind && (
        <p className="m-0 text-xs text-muted-foreground">
          {measureText(kind)}
          {isPerPeriod && " · ανά Περίοδο"}
        </p>
      )}
    </li>
  );
}

// Οι γραμμές Παροχών ενός Πακέτου ή μιας Υπηρεσίας. Γράφει ένα κρυφό πεδίο `provisions` (JSON) για τη φόρμα που το φιλοξενεί.
export function ProvisionsEditor({
  kinds,
  initial,
  isPerPeriod,
}: ProvisionsEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDrafts(initial));
  const [nextKey, setNextKey] = useState(initial.length);
  const hasFreeKind = activeKinds(kinds).some(
    (kind) => !rows.some((row) => row.kindId === kind.id),
  );

  const handleAdd = () => {
    setRows((current) => [
      ...current,
      { key: nextKey, kindId: "", quantity: "1" },
    ]);
    setNextKey((current) => current + 1);
  };
  const handleChange = (key: number, patch: Partial<DraftRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const handleRemove = (key: number) =>
    setRows((current) => current.filter((row) => row.key !== key));

  return (
    <div className="grid gap-2">
      <input type="hidden" name="provisions" value={serialize(rows)} />
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">Καμία Παροχή.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {rows.map((row) => (
            <EditorRow
              key={row.key}
              row={row}
              rows={rows}
              kinds={kinds}
              isPerPeriod={isPerPeriod}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
      <div>
        <Button size="sm" disabled={!hasFreeKind} onClick={handleAdd}>
          Προσθήκη Παροχής
        </Button>
      </div>
    </div>
  );
}
