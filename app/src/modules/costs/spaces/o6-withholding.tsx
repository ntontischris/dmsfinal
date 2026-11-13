"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import type { WithholdingRate } from "@/modules/finance";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { FormNote, RowAction, type Action } from "./o6-methods";

// Τα ποσοστά παρακράτησης φόρου (d6) για όποιον «Διαχειρίζεται Ρυθμίσεις»: ονομασία και ποσοστό, αλλαγή, απόσυρση,
// επαναφορά· χωρίς διαγραφή. Το ποσοστό είναι μόνο πρόταση στη «Νέα Είσπραξη»· το ποσό το γράφει ο Χρήστης.

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
  index: number;
  actions: WithholdingActions;
}) {
  const { rate, actions } = props;
  const [isEditing, setIsEditing] = useState(false);
  return (
    <ListRow
      isFaded={rate.retired}
      lead={<span>{props.index + 1}</span>}
      title={`${rate.label} · ${percentText(rate.percent)}`}
      sub={
        isEditing && !rate.retired ? (
          <RateForm save={actions.save} rate={rate} submitLabel="Αποθήκευση" />
        ) : undefined
      }
      aside={
        <>
          <Badge tone={rate.retired ? "faded" : "ok"}>
            {rate.retired ? "Αποσύρθηκε" : "Σε χρήση"}
          </Badge>
          {!rate.retired && (
            <button
              type="button"
              className="button"
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
        </>
      }
    />
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

export function WithholdingEditor(props: {
  rates: readonly WithholdingRate[];
  actions: WithholdingActions;
}) {
  return (
    <div className="o-card">
      <Panel label="Παρακράτηση φόρου">
        {props.rates.length === 0 ? (
          <p className="muted">Κανένα ποσοστό ακόμα.</p>
        ) : (
          <RowList>
            {props.rates.map((rate, index) => (
              <RateRow
                key={rate.id}
                rate={rate}
                index={index}
                actions={props.actions}
              />
            ))}
          </RowList>
        )}
        <div className="btn-row o-list-actions">
          <AddRate save={props.actions.save} />
        </div>
        <p className="muted o-hint">{RATES_NOTE}</p>
      </Panel>
    </div>
  );
}
