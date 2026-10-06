"use client";

import { useState } from "react";

import type { ExpenseCategory } from "@/data/finance";
import { CategoryCard } from "@/screens/i6-category";
import {
  addCategory,
  draftsTotal,
  fmtRate,
  rateOf,
  toDrafts,
  type Edit,
} from "@/screens/i6-model";
import { fmtMoney } from "@/screens/shared";

interface EditorProps {
  categories: readonly ExpenseCategory[];
  productiveHours: number;
  editable: boolean;
}

interface SummaryProps {
  total: number;
  hours: number;
  editable: boolean;
  onHours: (hours: number) => void;
}

function Summary({ total, hours, editable, onHours }: SummaryProps) {
  return (
    <section className="card">
      <h2 className="card-title">Κόστος ώρας</h2>
      <p className="i67-big">{fmtRate(rateOf(total, hours))}</p>
      <dl className="dl">
        <dt>Σύνολο εξόδων</dt>
        <dd>{fmtMoney(total)}</dd>
        <dt>Παραγωγικές ώρες</dt>
        <dd>
          {editable ? (
            <input
              className="input"
              type="number"
              min={1}
              aria-label="Παραγωγικές ώρες"
              value={hours}
              onChange={(e) => onHours(Number(e.target.value) || 0)}
            />
          ) : (
            hours
          )}
        </dd>
      </dl>
    </section>
  );
}

export function I6Editor({
  categories,
  productiveHours,
  editable,
}: EditorProps) {
  const [cats, setCats] = useState(() => toDrafts(categories));
  const [hours, setHours] = useState(productiveHours);
  const [touched, setTouched] = useState(false);
  const update = (edit: Edit) => {
    setCats(edit);
    setTouched(true);
  };
  const updateHours = (value: number) => {
    setHours(value);
    setTouched(true);
  };
  return (
    <div className="stack" style={{ alignItems: "stretch" }}>
      <Summary
        total={draftsTotal(cats)}
        hours={hours}
        editable={editable}
        onHours={updateHours}
      />
      {touched && (
        <p className="note" role="status">
          Ισχύει από αυτόν τον μήνα και μετά· οι κλεισμένοι μήνες δεν αλλάζουν.
          (prototype: δεν αποθηκεύεται)
        </p>
      )}
      {cats.map((cat, ci) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          ci={ci}
          editable={editable}
          update={update}
        />
      ))}
      {editable && (
        <p>
          <button
            type="button"
            className="button"
            onClick={() => update(addCategory(crypto.randomUUID()))}
          >
            Προσθήκη κατηγορίας
          </button>
        </p>
      )}
    </div>
  );
}
