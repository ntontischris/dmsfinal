"use client";

import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { setMilestones, setRevisionLimits } from "../actions-draft";
import { milestoneText } from "../helpers";
import { MILESTONE_LABELS } from "../labels";
import type { AgreementDetail, MilestoneTrigger } from "../types";
import { D2Form, IdField, NumberInput } from "./d2-ui";

// Όριο αλλαγών και Δόσεις σε ορόσημα (prototype `screens/d2-terms-more.tsx`), με τα πραγματικά actions και τα ίδια
// κρυφά πεδία JSON (`limits`, `milestones`) με τη σημερινή σελίδα.

const rounds = (n: number) => `${n} ${n === 1 ? "γύρος" : "γύροι"}`;

const serializeLimits = (values: Readonly<Record<string, string>>): string =>
  JSON.stringify(
    Object.entries(values)
      .filter(([, value]) => value.trim() !== "")
      .map(([kindId, value]) => ({ kindId, rounds: Number(value) || 0 })),
  );

export function RevisionLimitTerms({
  agreement,
}: {
  agreement: AgreementDetail;
}) {
  const { revisionLimits: limits, can } = agreement;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(limits.map((l) => [l.kindId, String(l.rounds)])),
  );
  const text = limits.map((l) => `${l.label}: ${rounds(l.rounds)}`).join(" · ");
  if (!can.edit)
    return (
      <dl className="dl">
        <dt>Όριο αλλαγών</dt>
        <dd>{text || "—"}</dd>
      </dl>
    );
  return (
    <D2Form action={setRevisionLimits} submitLabel="Αποθήκευση ορίων">
      <IdField id={agreement.id} />
      <input type="hidden" name="limits" value={serializeLimits(values)} />
      <dl className="dl">
        <dt>Όριο αλλαγών</dt>
        <dd>
          <span className="stack">
            {limits.map((limit) => (
              <span key={limit.kindId} className="stack">
                <NumberInput
                  label={`Όριο αλλαγών: ${limit.label}`}
                  value={values[limit.kindId] ?? ""}
                  min={1}
                  max={20}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [limit.kindId]: value,
                    }))
                  }
                  suffix={`γύροι · ${limit.label}`}
                />
                {limit.baseRounds !== null &&
                  limit.baseRounds !== limit.rounds && (
                    <span className="muted">
                      προεπιλογή: {rounds(limit.baseRounds)}
                    </span>
                  )}
              </span>
            ))}
          </span>
          <div className="muted">
            Περισσότεροι γύροι από την προεπιλογή είναι Παρέκκλιση.
          </div>
        </dd>
      </dl>
    </D2Form>
  );
}

const TRIGGERS: readonly MilestoneTrigger[] = [
  "signature",
  "date",
  "filming_done",
  "delivered",
];
const MAX_ROWS = 6;

interface Row {
  key: number;
  trigger: MilestoneTrigger;
  percent: string;
  dueOn: string;
}

const percentOf = (text: string): number => {
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : 0;
};

const serializeMilestones = (rows: readonly Row[]): string =>
  JSON.stringify(
    rows.map((row) => ({
      trigger: row.trigger,
      percent: percentOf(row.percent),
      dueOn: row.trigger === "date" && row.dueOn !== "" ? row.dueOn : null,
    })),
  );

const SumBadge = ({ sum }: { sum: number }) =>
  sum === 100 ? null : (
    <p>
      <Badge tone="attention">Οι δόσεις κάνουν {sum}%, όχι 100%</Badge>
    </p>
  );

function MilestoneRow({
  row,
  onChange,
  onRemove,
  canRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <li className="btn-row">
      <NumberInput
        label="Ποσοστό δόσης (%)"
        inputMode="decimal"
        value={row.percent}
        onChange={(percent) => onChange({ percent })}
        suffix="%"
      />
      <select
        className="select"
        aria-label="Πότε πληρώνεται η δόση"
        value={row.trigger}
        onChange={(e) =>
          onChange({
            trigger: TRIGGERS.find((t) => t === e.target.value) ?? row.trigger,
          })
        }
      >
        {TRIGGERS.map((t) => (
          <option key={t} value={t}>
            {MILESTONE_LABELS[t]}
          </option>
        ))}
      </select>
      {row.trigger === "date" && (
        <input
          className="input"
          type="date"
          aria-label="Ημερομηνία δόσης"
          value={row.dueOn}
          onChange={(e) => onChange({ dueOn: e.target.value })}
        />
      )}
      <button
        type="button"
        className="button"
        aria-label="Αφαίρεση δόσης"
        disabled={!canRemove}
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}

function MilestonesEditor({ agreement }: { agreement: AgreementDetail }) {
  const [rows, setRows] = useState<Row[]>(() =>
    agreement.milestones.map((m, key) => ({
      key,
      trigger: m.trigger,
      percent: String(m.percent).replace(".", ","),
      dueOn: m.dueOn ?? "",
    })),
  );
  const [nextKey, setNextKey] = useState(agreement.milestones.length);
  const sum =
    Math.round(
      rows.reduce((total, row) => total + percentOf(row.percent), 0) * 100,
    ) / 100;
  const add = () => {
    setRows((current) => [
      ...current,
      {
        key: nextKey,
        trigger: "delivered",
        percent: String(Math.max(0, 100 - sum)),
        dueOn: "",
      },
    ]);
    setNextKey((current) => current + 1);
  };
  return (
    <D2Form action={setMilestones} submitLabel="Αποθήκευση δόσεων">
      <IdField id={agreement.id} />
      <input
        type="hidden"
        name="milestones"
        value={serializeMilestones(rows)}
      />
      <ul className="list">
        {rows.map((row) => (
          <MilestoneRow
            key={row.key}
            row={row}
            canRemove={rows.length > 1}
            onChange={(patch) =>
              setRows((current) =>
                current.map((r) =>
                  r.key === row.key ? { ...r, ...patch } : r,
                ),
              )
            }
            onRemove={() =>
              setRows((current) => current.filter((r) => r.key !== row.key))
            }
          />
        ))}
      </ul>
      <span className="btn-row">
        <button
          type="button"
          className="button"
          disabled={rows.length >= MAX_ROWS}
          onClick={add}
        >
          + Δόση
        </button>
      </span>
      <SumBadge sum={sum} />
    </D2Form>
  );
}

// Δόσεις σε ορόσημα: μόνο στην εφάπαξ. Άθροισμα διαφορετικό από 100% είναι προειδοποίηση, ποτέ εμπόδιο.
export function MilestoneTerms({ agreement }: { agreement: AgreementDetail }) {
  return (
    <>
      <h3>Δόσεις σε ορόσημα</h3>
      {agreement.can.edit ? (
        <MilestonesEditor agreement={agreement} />
      ) : (
        <>
          {agreement.milestones.length === 0 ? (
            <p className="muted">Καμία δόση.</p>
          ) : (
            <ul className="list">
              {agreement.milestones.map((m) => (
                <li key={m.id}>{milestoneText(m)}</li>
              ))}
            </ul>
          )}
          <SumBadge sum={agreement.milestonesTotal} />
        </>
      )}
    </>
  );
}
