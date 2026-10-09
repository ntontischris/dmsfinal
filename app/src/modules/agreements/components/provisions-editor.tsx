"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

import { activeKinds } from "../helpers";
import type { KindInfo, Provision } from "../types";

interface DraftRow {
  key: number;
  kindId: string; // "" = δεν διαλέχτηκε ακόμα είδος
  quantity: string;
  catalogQuantity: number | null; // πόσα έδινε ο Κατάλογος όταν αντιγράφηκε η γραμμή
}

interface ProvisionsEditorProps {
  kinds: readonly KindInfo[]; // όλα τα είδη, και τα αποσυρμένα (για να φαίνεται το όνομα ενός παλιού)
  initial: readonly Provision[];
}

const toDrafts = (initial: readonly Provision[]): DraftRow[] =>
  initial.map((provision, key) => ({
    key,
    kindId: provision.kindId,
    quantity: String(provision.quantity),
    catalogQuantity: provision.catalogQuantity,
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

// Τα είδη που προσφέρει μια γραμμή: τα ενεργά που δεν τα έχει άλλη γραμμή, και το δικό της αν έχει αποσυρθεί.
const optionsFor = (
  row: DraftRow,
  rows: readonly DraftRow[],
  kinds: readonly KindInfo[],
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
  kinds: readonly KindInfo[];
  onChange: (key: number, patch: Partial<DraftRow>) => void;
  onRemove: (key: number) => void;
}

function EditorRow({ row, rows, kinds, onChange, onRemove }: RowProps) {
  return (
    <li className="grid gap-1 rounded-sm border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <Input
            type="number"
            min={1}
            max={999}
            step={1}
            aria-label="Ποσότητα Παροχής"
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
      {row.catalogQuantity !== null && (
        <p className="m-0 text-xs text-muted-foreground">
          Κατάλογος: {row.catalogQuantity} ανά μονάδα
        </p>
      )}
    </li>
  );
}

// Οι Παροχές μιας γραμμής, ανά μονάδα. Γράφει ένα κρυφό πεδίο `provisions` (JSON) για τη φόρμα που το φιλοξενεί.
export function ProvisionsEditor({ kinds, initial }: ProvisionsEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDrafts(initial));
  const [nextKey, setNextKey] = useState(initial.length);
  const hasFreeKind = activeKinds(kinds).some(
    (kind) => !rows.some((row) => row.kindId === kind.id),
  );

  const handleAdd = () => {
    setRows((current) => [
      ...current,
      { key: nextKey, kindId: "", quantity: "1", catalogQuantity: null },
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
