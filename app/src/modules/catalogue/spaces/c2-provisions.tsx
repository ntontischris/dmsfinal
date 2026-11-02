"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";

import { setProvisions } from "../actions-items";
import type {
  CatalogueCaps,
  CatalogueItem,
  Provision,
  ProvisionKind,
} from "../types";

import {
  hasFreeKind,
  kindOptions,
  measureText,
  provisionsIntro,
  serializeDrafts,
  toDrafts,
  type DraftRow,
} from "./c2-adapter";
import { C2Form, C2Submit } from "./c2-form";
import { ItemRows } from "./lane-rows";

const OVERAGE_NOTE =
  "Ό,τι ξεπερνά τις Παροχές χρεώνεται με την τιμή της αντίστοιχης Υπηρεσίας στη Συμφωνία.";

export function ProvisionsNote({
  canManageSettings,
}: {
  canManageSettings: boolean;
}) {
  return (
    <p className="note">
      Τα είδη Παροχής, οι μονάδες και ο Τρόπος μέτρησης ορίζονται στις{" "}
      {canManageSettings ? (
        <Link href={hrefOf("O3")}>Ρυθμίσεις › Συμφωνίες</Link>
      ) : (
        "Ρυθμίσεις › Συμφωνίες"
      )}
      . {OVERAGE_NOTE}
    </p>
  );
}

const perPeriodText = <span className="muted"> ανά Περίοδο</span>;

interface EditorProps {
  kinds: readonly ProvisionKind[]; // όλα τα είδη, και τα αποσυρμένα (για να φαίνεται το όνομα ενός παλιού)
  initial: readonly Provision[];
  isPerPeriod: boolean;
  intro: string;
  children?: ReactNode; // σημειώσεις και κουμπί κάτω από τις γραμμές
}

interface RowInputProps {
  row: DraftRow;
  rows: readonly DraftRow[];
  kinds: readonly ProvisionKind[];
  isPerPeriod: boolean;
  onChange: (key: number, patch: Partial<DraftRow>) => void;
}

function RowInputs({ row, rows, kinds, isPerPeriod, onChange }: RowInputProps) {
  return (
    <span className="btn-row">
      <input
        className="input"
        type="number"
        min={1}
        max={999}
        step={1}
        aria-label="Ποσότητα"
        value={row.quantity}
        onChange={(event) =>
          onChange(row.key, { quantity: event.target.value })
        }
        style={{ width: "5rem" }}
      />
      <select
        className="select"
        aria-label="Είδος Παροχής"
        value={row.kindId}
        onChange={(event) => onChange(row.key, { kindId: event.target.value })}
      >
        <option value="">Διάλεξε είδος…</option>
        {kindOptions(row, rows, kinds).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {isPerPeriod && <span className="muted">ανά Περίοδο</span>}
    </span>
  );
}

// Ο επεξεργαστής Παροχών (prototype ProvisionsSection): γράφει ένα κρυφό πεδίο `provisions` (JSON) για τη φόρμα γύρω του.
export function ProvisionsEditorPanel({
  kinds,
  initial,
  isPerPeriod,
  intro,
  children,
}: EditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDrafts(initial));
  const [nextKey, setNextKey] = useState(initial.length);
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
  const addButton = (
    <button
      type="button"
      className="button"
      disabled={!hasFreeKind(rows, kinds)}
      onClick={handleAdd}
    >
      Προσθήκη Παροχής
    </button>
  );
  return (
    <Panel label="Παροχές" aside={addButton}>
      <input type="hidden" name="provisions" value={serializeDrafts(rows)} />
      <p className="muted">{intro}</p>
      {rows.length === 0 ? (
        <p className="muted">Καμία Παροχή.</p>
      ) : (
        <ItemRows
          items={rows.map((row) => {
            const kind = kinds.find((candidate) => candidate.id === row.kindId);
            return {
              id: String(row.key),
              title: (
                <RowInputs
                  row={row}
                  rows={rows}
                  kinds={kinds}
                  isPerPeriod={isPerPeriod}
                  onChange={handleChange}
                />
              ),
              sub: kind ? measureText(kind) : undefined,
              aside: (
                <button
                  type="button"
                  className="button"
                  onClick={() => handleRemove(row.key)}
                >
                  Αφαίρεση
                </button>
              ),
            };
          })}
        />
      )}
      {children}
    </Panel>
  );
}

interface C2ProvisionsProps {
  item: CatalogueItem;
  kinds: readonly ProvisionKind[];
  caps: CatalogueCaps;
}

// Η ανάγνωση: «{ποσότητα} {μονάδα}» ανά γραμμή, με το είδος όπως είναι τώρα στις Ρυθμίσεις.
function ReadOnlyProvisions({ item, kinds, caps }: C2ProvisionsProps) {
  const isPerPeriod = item.billing === "monthly";
  return (
    <Panel label="Παροχές">
      <p className="muted">{provisionsIntro(item)}</p>
      {item.provisions.length === 0 ? (
        <p className="muted">Καμία Παροχή.</p>
      ) : (
        <ItemRows
          items={item.provisions.map((provision) => {
            const kind = kinds.find(
              (candidate) => candidate.id === provision.kindId,
            );
            return {
              id: provision.kindId,
              title: (
                <>
                  {provision.quantity} {kind?.unit ?? "—"}
                  {isPerPeriod && perPeriodText}
                </>
              ),
              sub: measureText(kind) || undefined,
            };
          })}
        />
      )}
      <ProvisionsNote canManageSettings={caps.canManageSettings} />
    </Panel>
  );
}

export function C2Provisions(props: C2ProvisionsProps) {
  const { item, kinds, caps } = props;
  if (!caps.canManage) return <ReadOnlyProvisions {...props} />;
  return (
    <C2Form action={setProvisions} itemId={item.id}>
      <ProvisionsEditorPanel
        kinds={kinds}
        initial={item.provisions}
        isPerPeriod={item.billing === "monthly"}
        intro={provisionsIntro(item)}
      >
        <ProvisionsNote canManageSettings={caps.canManageSettings} />
        <C2Submit label="Αποθήκευση" onlyWhenChanged />
      </ProvisionsEditorPanel>
    </C2Form>
  );
}
