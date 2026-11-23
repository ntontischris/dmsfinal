"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import type { WithholdingRate } from "@/modules/finance";
import { G3Box } from "./g3-box";
import { inUseCount } from "./o6-lines";
import { FormNote, RowAction, type Action } from "./o6-methods";

// Τα ποσοστά παρακράτησης φόρου (d6) για όποιον «Διαχειρίζεται Ρυθμίσεις»: ονομασία και ποσοστό, αλλαγή, απόσυρση,
// επαναφορά· χωρίς διαγραφή. Το ποσοστό είναι μόνο πρόταση στη «Νέα Είσπραξη»· το ποσό το γράφει ο Χρήστης.
// Μορφή «Χρήματα»: δικό του κλειστό κουτί, κάθε ποσοστό μία γραμμή (ml-line) με γρήγορα κουμπιά.

export interface WithholdingActions {
  save: Action;
  retire: Action;
  restore: Action;
}

const RATES_NOTE =
  "Στη «Νέα Είσπραξη» το ποσοστό προτείνει ποσό παρακράτησης· το ποσό που κρατήθηκε κλείνει το Τιμολόγιο σαν πληρωμή.";
const MAX_LABEL = 60;

const percentText = (percent: number): string =>
  `${String(percent).replace(".", ",")}%`;

// Ίδια φόρμα για νέο και για αλλαγή: id κενό = νέο.
function RateForm(props: {
  save: Action;
  rate?: WithholdingRate;
  submitLabel: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(props.save, {
    resetOnSuccess: props.rate === undefined,
  });
  return (
    <form ref={formRef} className="btn-row" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={props.rate?.id ?? ""} />
      <input
        className="input"
        name="label"
        maxLength={MAX_LABEL}
        aria-label="Ονομασία παρακράτησης"
        placeholder="π.χ. Παρακράτηση 20%"
        defaultValue={props.rate?.label ?? ""}
      />
      <input
        className="input"
        name="percent"
        inputMode="decimal"
        aria-label="Ποσοστό (%)"
        placeholder="20"
        defaultValue={
          props.rate ? String(props.rate.percent).replace(".", ",") : ""
        }
      />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending}
      >
        {props.submitLabel}
      </button>
      <FormNote state={state} />
    </form>
  );
}

function RateRow(props: {
  rate: WithholdingRate;
  actions: WithholdingActions;
}) {
  const { rate, actions } = props;
  const [isEditing, setIsEditing] = useState(false);
  return (
    <li className="ml-line" data-faded={rate.retired || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {percentText(rate.percent)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">
          {rate.retired ? "Αποσύρθηκε" : "Σε χρήση"}
        </span>
        <strong>{`${rate.label} · ${percentText(rate.percent)}`}</strong>
        {isEditing && !rate.retired && (
          <RateForm save={actions.save} rate={rate} submitLabel="Αποθήκευση" />
        )}
      </span>
      <span className="ml-quick">
        {!rate.retired && (
          <button
            type="button"
            aria-expanded={isEditing}
            aria-label={`Αλλαγή: ${rate.label}`}
            onClick={() => setIsEditing((current) => !current)}
          >
            Αλλαγή
          </button>
        )}
        <RowAction
          action={rate.retired ? actions.restore : actions.retire}
          id={rate.id}
          label={rate.retired ? "Επαναφορά" : "Απόσυρση"}
        />
      </span>
    </li>
  );
}

function AddRate({ save }: { save: Action }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        + Νέο ποσοστό
      </button>
    );
  return <RateForm save={save} submitLabel="Προσθήκη ποσοστού" />;
}

const hintOf = (rates: readonly WithholdingRate[]): string =>
  rates.length === 0
    ? "Κανένα ποσοστό ακόμα · + Νέο ποσοστό"
    : `${inUseCount(rates)} σε χρήση · ${rates
        .filter((rate) => !rate.retired)
        .map((rate) => percentText(rate.percent))
        .join(", ")}`;

export function WithholdingEditor(props: {
  rates: readonly WithholdingRate[];
  actions: WithholdingActions;
}) {
  return (
    <G3Box title="Παρακράτηση φόρου" hint={hintOf(props.rates)}>
      {props.rates.length === 0 ? (
        <p className="muted">Κανένα ποσοστό ακόμα.</p>
      ) : (
        <ul className="ml-list">
          {props.rates.map((rate) => (
            <RateRow key={rate.id} rate={rate} actions={props.actions} />
          ))}
        </ul>
      )}
      <div className="btn-row o-list-actions">
        <AddRate save={props.actions.save} />
      </div>
      <p className="muted o-hint">{RATES_NOTE}</p>
    </G3Box>
  );
}
