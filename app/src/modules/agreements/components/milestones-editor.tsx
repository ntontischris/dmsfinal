"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

import { setMilestones } from "../actions-draft";
import { milestoneText } from "../helpers";
import { MILESTONE_LABELS } from "../labels";
import type { Milestone, MilestoneTrigger } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./terms-section-parts";

interface DraftRow {
  key: number;
  trigger: MilestoneTrigger;
  percent: string;
  dueOn: string;
}

const TRIGGERS: readonly MilestoneTrigger[] = [
  "signature",
  "date",
  "filming_done",
  "delivered",
];
const MAX_ROWS = 6;

const parseTrigger = (
  value: string,
  fallback: MilestoneTrigger,
): MilestoneTrigger => TRIGGERS.find((t) => t === value) ?? fallback;

// Ένα ποσοστό που δεν διαβάζεται μετράει 0 στο σύνολο· το μήνυμα λάθους το δίνει ο server στην αποθήκευση.
const percentOf = (text: string): number => {
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : 0;
};

const totalOf = (rows: readonly DraftRow[]): number =>
  Math.round(rows.reduce((sum, row) => sum + percentOf(row.percent), 0) * 100) /
  100;

const toDrafts = (milestones: readonly Milestone[]): DraftRow[] =>
  milestones.map((m, key) => ({
    key,
    trigger: m.trigger,
    percent: String(m.percent).replace(".", ","),
    dueOn: m.dueOn ?? "",
  }));

const serialize = (rows: readonly DraftRow[]): string =>
  JSON.stringify(
    rows.map((row) => ({
      trigger: row.trigger,
      percent: percentOf(row.percent),
      dueOn: row.trigger === "date" && row.dueOn !== "" ? row.dueOn : null,
    })),
  );

interface RowProps {
  row: DraftRow;
  onChange: (key: number, patch: Partial<DraftRow>) => void;
  onRemove: (key: number) => void;
  canRemove: boolean;
}

function EditorRow({ row, onChange, onRemove, canRemove }: RowProps) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-sm border px-3 py-2">
      <div className="w-24">
        <Input
          inputMode="decimal"
          aria-label="Ποσοστό δόσης (%)"
          value={row.percent}
          onChange={(event) =>
            onChange(row.key, { percent: event.target.value })
          }
        />
      </div>
      <span className="text-sm text-muted-foreground">%</span>
      <div className="min-w-44 flex-1">
        <Select
          aria-label="Πότε πληρώνεται η δόση"
          value={row.trigger}
          onChange={(event) =>
            onChange(row.key, {
              trigger: parseTrigger(event.target.value, row.trigger),
            })
          }
        >
          {TRIGGERS.map((trigger) => (
            <option key={trigger} value={trigger}>
              {MILESTONE_LABELS[trigger]}
            </option>
          ))}
        </Select>
      </div>
      {row.trigger === "date" && (
        <div className="min-w-40">
          <Input
            type="date"
            aria-label="Ημερομηνία δόσης"
            value={row.dueOn}
            onChange={(event) =>
              onChange(row.key, { dueOn: event.target.value })
            }
          />
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRemove}
        onClick={() => onRemove(row.key)}
      >
        Αφαίρεση
      </Button>
    </li>
  );
}

function Editor({ milestones }: { milestones: readonly Milestone[] }) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDrafts(milestones));
  const [nextKey, setNextKey] = useState(milestones.length);
  const total = totalOf(rows);

  const handleAdd = () => {
    setRows((current) => [
      ...current,
      { key: nextKey, trigger: "delivered", percent: "", dueOn: "" },
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
    <div className="grid gap-3">
      <input type="hidden" name="milestones" value={serialize(rows)} />
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((row) => (
          <EditorRow
            key={row.key}
            row={row}
            onChange={handleChange}
            onRemove={handleRemove}
            canRemove={rows.length > 1}
          />
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={rows.length >= MAX_ROWS}
          onClick={handleAdd}
        >
          Προσθήκη δόσης
        </Button>
        {total !== 100 ? (
          <Badge tone="attention">Οι δόσεις κάνουν {total}%, όχι 100%.</Badge>
        ) : (
          <Badge tone="ok">Οι δόσεις κάνουν 100%</Badge>
        )}
      </div>
    </div>
  );
}

interface MilestonesEditorProps {
  agreementId: string;
  milestones: readonly Milestone[];
  total: number;
  canEdit: boolean;
}

// Δόσεις σε ορόσημα (εφάπαξ). Άθροισμα διαφορετικό από 100% είναι προειδοποίηση, ποτέ εμπόδιο.
export function MilestonesEditor({
  agreementId,
  milestones,
  total,
  canEdit,
}: MilestonesEditorProps) {
  if (!canEdit)
    return (
      <div className="grid gap-2">
        {milestones.length === 0 ? (
          <MutedNote>Καμία δόση.</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {milestones.map((m) => (
              <li key={m.id}>{milestoneText(m)}</li>
            ))}
          </ul>
        )}
        {total !== 100 && (
          <Badge tone="attention">Οι δόσεις κάνουν {total}%, όχι 100%.</Badge>
        )}
      </div>
    );
  return (
    <ActionForm action={setMilestones} onlyWhenChanged submitLabel="Αποθήκευση δόσεων">
      <input type="hidden" name="agreementId" value={agreementId} />
      <Editor milestones={milestones} />
    </ActionForm>
  );
}
