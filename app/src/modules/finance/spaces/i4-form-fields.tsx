"use client";

import type { ReactNode } from "react";

import { fmtMoney } from "@/spaces/screens/shared";

import type { OpenInvoice } from "./i4-model";

// Τα πεδία της «Νέας Είσπραξης» (I4). Καθαρά στοιχεία οθόνης: η λογική ζει στο i4-model.ts.

export interface Option {
  id: string;
  name: string;
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label>
      {props.label}
      {props.children}
    </label>
  );
}

// placeholder: η κενή πρώτη επιλογή (π.χ. «Διάλεξε Πελάτη…»)· χωρίς αυτήν διαλέγεται η πρώτη.
export function SelectField(props: {
  label: string;
  value: string;
  options: readonly Option[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <select
        className="select"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.placeholder !== undefined && (
          <option value="">{props.placeholder}</option>
        )}
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function InputField(props: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <input
        className="input"
        type={props.type}
        value={props.value}
        inputMode={props.type === undefined ? "decimal" : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

const toggled = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

// Για ποια Τιμολόγια είναι η Είσπραξη (d4). Κανένα τσεκαρισμένο = από το παλαιότερο, όπως πάντα.
export function InvoicePicker(props: {
  open: readonly OpenInvoice[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  if (props.open.length === 0) return null;
  return (
    <fieldset className="i245-invoices">
      <legend>Για ποια Τιμολόγια; (κανένα = από το παλαιότερο)</legend>
      {props.open.map((inv) => (
        <label key={inv.id} className="i245-check">
          <input
            type="checkbox"
            checked={props.selected.includes(inv.id)}
            onChange={() => props.onChange(toggled(props.selected, inv.id))}
          />
          {inv.number} · μένουν {fmtMoney(inv.remaining)}
        </label>
      ))}
    </fieldset>
  );
}

// Παρακράτηση φόρου (d6): είδος από τις Ρυθμίσεις και ποσό. Χωρίς είδος, το ποσό δεν φαίνεται.
export function WithholdingFields(props: {
  rates: readonly Option[];
  rateId: string;
  withheld: string;
  onRate: (rateId: string) => void;
  onWithheld: (withheld: string) => void;
}) {
  if (props.rates.length === 0) return null;
  return (
    <>
      <SelectField
        label="Παρακράτηση"
        value={props.rateId}
        options={props.rates}
        placeholder="Χωρίς παρακράτηση"
        onChange={props.onRate}
      />
      {props.rateId !== "" && (
        <InputField
          label="Ποσό παρακράτησης (€)"
          value={props.withheld}
          onChange={props.onWithheld}
        />
      )}
    </>
  );
}

export function ErrorMessage({ text }: { text: string | null }) {
  return (
    <span
      className="feedback-msg"
      data-tone="error"
      data-shown={text !== null}
      role="alert"
      aria-live="assertive"
    >
      {text && (
        <>
          <span aria-hidden="true">!</span> {text}
        </>
      )}
    </span>
  );
}
