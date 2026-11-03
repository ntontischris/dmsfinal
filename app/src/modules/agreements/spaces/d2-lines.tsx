"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { StateNotice } from "@/spaces/screens/shared";

import {
  addCatalogueLine,
  addFreeLine,
  removeLine,
  setLineProvisions,
  updateLine,
} from "../actions-draft";
import {
  formatMoney,
  formatNumber,
  provisionsText,
  sortOptions,
} from "../helpers";
import type { AgreementDetail, CatalogueOption, KindInfo } from "../types";
import { LineRow, lineFormIds, type LineColumns } from "./d2-line-row";
import { perPeriodSuffix } from "./d2-model";
import { D2Form, D2Scope, IdField, NumberInput } from "./d2-ui";

// Οι Γραμμές της πρότασης (prototype `screens/d2-lines.tsx` + `d2-line-add.tsx`): πίνακας, προσθήκη από τον Κατάλογο ή
// ελεύθερη γραμμή, σύνολα. Τιμές, ώρες και κόστος φτάνουν μόνο σε όποιον τα δικαιούται (αλλιώς null).

interface LinesProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  options: readonly CatalogueOption[];
  isOptionsFailed: boolean;
}

const optionSummary = (
  option: CatalogueOption,
  kinds: readonly KindInfo[],
): string => {
  const price = option.price === null ? null : formatMoney(option.price);
  const provisions = provisionsText(option.provisions, kinds);
  return [price, provisions === "—" ? null : provisions]
    .filter((part) => part !== null)
    .join(" · ");
};

function FreeLineForm({ agreementId }: { agreementId: string }) {
  return (
    <D2Form
      action={addFreeLine}
      submitLabel="Προσθήκη ελεύθερης γραμμής"
      className="toolbar"
      resetOnSuccess
    >
      <IdField id={agreementId} />
      <input
        className="input grow"
        name="description"
        aria-label="Περιγραφή ελεύθερης γραμμής"
        placeholder="Περιγραφή, π.χ. 4 επιπλέον reels τον μήνα"
        autoComplete="off"
      />
      <input
        className="input grow"
        name="descriptionEn"
        aria-label="Περιγραφή ελεύθερης γραμμής (English)"
        placeholder="English"
        autoComplete="off"
      />
      <NumberInput
        name="price"
        label="Τιμή ελεύθερης γραμμής (€)"
        inputMode="decimal"
        suffix="€"
      />
      <span className="muted">
        Οι Παροχές της μπαίνουν μετά στη γραμμή. Η ελεύθερη γραμμή είναι πάντα
        Παρέκκλιση.
      </span>
    </D2Form>
  );
}

function AddLine({
  agreement,
  kinds,
  options,
}: Omit<LinesProps, "isOptionsFailed">) {
  const [selectedId, setSelectedId] = useState("");
  const selected = options.find((option) => option.itemId === selectedId);
  return (
    <>
      <div className="toolbar d2-add">
        <D2Form
          action={addCatalogueLine}
          submitLabel="Προσθήκη"
          className="toolbar"
        >
          <IdField id={agreement.id} />
          <select
            className="select"
            name="itemId"
            aria-label="Προσθήκη από τον Κατάλογο"
            required
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">+ Από τον Κατάλογο…</option>
            {sortOptions(options).map((option) => (
              <option key={option.itemId} value={option.itemId}>
                {option.name}
              </option>
            ))}
          </select>
          <NumberInput
            name="quantity"
            label="Ποσότητα"
            min={1}
            max={999}
            defaultValue="1"
            suffix="×"
          />
          {selected && (
            <span className="muted">{optionSummary(selected, kinds)}</span>
          )}
        </D2Form>
      </div>
      {/* Όπως η σημερινή σελίδα: η φόρμα της ελεύθερης γραμμής φαίνεται πάντα σε όποιον βάζει τιμές, χωρίς διακόπτη. */}
      {agreement.can.editPrices && <FreeLineForm agreementId={agreement.id} />}
    </>
  );
}

function LinesTotals({ agreement }: { agreement: AgreementDetail }) {
  const { totals, moneyTerms } = agreement;
  if (totals === null || agreement.lines.length === 0) return null;
  const suffix = perPeriodSuffix(agreement.kind);
  const hasDiscount =
    moneyTerms !== null &&
    moneyTerms.discountPercent > 0 &&
    totals.discountedPrice < totals.price;
  return (
    <dl className="dl d2-totals">
      <dt>Σύνολο</dt>
      <dd>
        <strong>
          {formatMoney(totals.price)}
          {suffix}
        </strong>
      </dd>
      {hasDiscount && (
        <>
          <dt>Έκπτωση πρώτων μηνών</dt>
          <dd>
            {formatMoney(totals.discountedPrice)} τους πρώτους{" "}
            {moneyTerms.discountMonths} μήνες (
            {formatNumber(moneyTerms.discountPercent)}%)
            <div className="muted">
              Ο ΦΠΑ υπολογίζεται ανά Περίοδο στο ποσό που τιμολογείται.
            </div>
          </dd>
        </>
      )}
      <dt>Με ΦΠΑ {formatNumber(totals.vatRate)}%</dt>
      <dd className="muted">
        {formatMoney(totals.gross)}
        {suffix} · ΦΠΑ {formatMoney(totals.vat)}
      </dd>
    </dl>
  );
}

// Οι φόρμες κάθε γραμμής, έξω από τον πίνακα: τα πεδία των κελιών τις βρίσκουν με `form=`.
function LineForms({ agreement }: { agreement: AgreementDetail }) {
  return (
    <>
      {agreement.lines.map((line) => {
        const ids = lineFormIds(line.id);
        const lineId = <input type="hidden" name="lineId" value={line.id} />;
        return (
          <div key={line.id} hidden>
            <D2Form id={ids.update} action={updateLine} hideSubmit>
              {lineId}
            </D2Form>
            <D2Form id={ids.provisions} action={setLineProvisions} hideSubmit>
              {lineId}
            </D2Form>
            <D2Form id={ids.remove} action={removeLine} hideSubmit>
              {lineId}
            </D2Form>
          </div>
        );
      })}
    </>
  );
}

export function LinesSection({
  agreement,
  kinds,
  options,
  isOptionsFailed,
}: LinesProps) {
  const { can, lines } = agreement;
  const columns: LineColumns = { amount: can.seeAmounts, cost: can.seeCost };
  const perPeriod = agreement.kind === "monthly" ? " ανά μήνα" : "";
  return (
    <Panel label="Γραμμές" aside={`Τιμές χωρίς ΦΠΑ${perPeriod}`}>
      <D2Scope messageAt="top">
        {lines.length === 0 ? (
          <p className="muted">
            {can.edit
              ? "Καμία γραμμή ακόμα. Πρόσθεσε Πακέτο ή Υπηρεσία από τον Κατάλογο ή ελεύθερη γραμμή."
              : "Δεν υπάρχουν γραμμές ακόμα."}
          </p>
        ) : (
          <div className="scroll">
            <table className="rtable">
              <thead>
                <tr>
                  <th>Γραμμή</th>
                  <th className="num">Ποσότητα</th>
                  {columns.amount && <th className="num">Τιμή μονάδας</th>}
                  <th>Παροχές</th>
                  {columns.cost && <th className="num">Ώρες γύρ. / μοντ.</th>}
                  <th className="num">Σύνολο</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    agreement={agreement}
                    kinds={kinds}
                    columns={columns}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {can.edit && <LineForms agreement={agreement} />}
        {can.edit && isOptionsFailed && (
          <StateNotice kind="error" title="Δεν φόρτωσε ο Κατάλογος">
            Δεν μπορείς να προσθέσεις γραμμές αυτή τη στιγμή. Τίποτα δεν χάθηκε·
            δοκίμασε ξανά σε λίγο.
          </StateNotice>
        )}
        {can.edit && !isOptionsFailed && (
          <AddLine agreement={agreement} kinds={kinds} options={options} />
        )}
      </D2Scope>
      <LinesTotals agreement={agreement} />
    </Panel>
  );
}
