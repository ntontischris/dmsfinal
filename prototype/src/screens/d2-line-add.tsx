"use client";

import { useState } from "react";

import {
  agreementTotal,
  discountedTotal,
  withVat,
  type AgreementLine,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS, findItem, priceSuffix } from "@/data/catalogue";
import { compatibleItems, freeLine, lineFromItem } from "@/screens/d2-model";
import { NumberInput, type SectionProps } from "@/screens/d2-ui";
import { fmtMoney } from "@/screens/shared";

function FreeLineForm({ onAdd }: { onAdd: (line: AgreementLine) => void }) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const add = () => {
    if (!description.trim()) return;
    onAdd(freeLine(description.trim(), price));
    setDescription("");
    setPrice(0);
  };
  return (
    <div className="toolbar">
      <input
        className="input grow"
        aria-label="Περιγραφή ελεύθερης γραμμής"
        placeholder="Περιγραφή, π.χ. 4 επιπλέον reels τον μήνα"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <NumberInput
        label="Τιμή ελεύθερης γραμμής"
        value={price}
        step={10}
        onChange={setPrice}
        suffix="€"
      />
      <button type="button" className="button" onClick={add}>
        Προσθήκη
      </button>
      <span className="muted">
        Οι Παροχές της μπαίνουν μετά στη γραμμή. Η ελεύθερη γραμμή είναι πάντα
        Παρέκκλιση.
      </span>
    </div>
  );
}

export function AddLine({ draft, update }: SectionProps) {
  const [isFree, setIsFree] = useState(false);
  const items = compatibleItems(draft.kind);
  const add = (line: AgreementLine) =>
    update((d) => ({ ...d, lines: [...d.lines, line] }));
  const addFromCatalogue = (id: string) => {
    const item = findItem(id);
    if (item) add(lineFromItem(item));
  };
  return (
    <>
      <div className="toolbar d2-add">
        <select
          className="select"
          aria-label="Γραμμή από τον Κατάλογο"
          value=""
          onChange={(event) => addFromCatalogue(event.target.value)}
        >
          <option value="">+ Από τον Κατάλογο…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {fmtMoney(item.price)} {priceSuffix(item)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button"
          aria-pressed={isFree}
          onClick={() => setIsFree(!isFree)}
        >
          Ελεύθερη γραμμή
        </button>
      </div>
      {isFree && <FreeLineForm onAdd={add} />}
    </>
  );
}

export function LinesTotals({ draft }: { draft: AgreementRecord }) {
  const total = agreementTotal(draft);
  const discount = draft.terms.firstMonthsDiscount;
  const hasDiscount = discount.percent > 0 && discount.months > 0;
  const suffix = draft.kind === "μηνιαία" ? " / μήνα" : "";
  return (
    <dl className="dl d2-totals">
      <dt>Σύνολο</dt>
      <dd>
        <strong>
          {fmtMoney(total)}
          {suffix}
        </strong>
      </dd>
      {hasDiscount && (
        <>
          <dt>Έκπτωση πρώτων μηνών</dt>
          <dd>
            {fmtMoney(discountedTotal(draft))} τους πρώτους {discount.months}{" "}
            μήνες ({discount.percent}%)
          </dd>
        </>
      )}
      <dt>Με ΦΠΑ {COST_SETTINGS.vatPercent}%</dt>
      <dd className="muted">
        {fmtMoney(withVat(total))}
        {suffix} · ενημερωτικά
      </dd>
    </dl>
  );
}
