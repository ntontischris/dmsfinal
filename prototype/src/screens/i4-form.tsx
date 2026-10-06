"use client";

import { useState, type ReactNode } from "react";

import {
  previewOf,
  type ClientOption,
  type OpenInvoice,
} from "@/screens/i4-model";
import { fmtMoney } from "@/screens/shared";

import "./i245.css";

interface Option {
  id: string;
  name: string;
}

interface I4FormProps {
  clients: readonly ClientOption[];
  methods: readonly Option[];
  openByClient: Readonly<Record<string, readonly OpenInvoice[]>>;
  today: string;
}

interface FormValues {
  clientId: string;
  amount: string;
  date: string;
  method: string;
  note: string;
}

function PreviewBox(props: { open: readonly OpenInvoice[]; amount: number }) {
  if (props.amount <= 0) return null;
  const { covers, surplus } = previewOf(props.open, props.amount);
  return (
    <div className="i245-preview" aria-live="polite">
      {covers.length > 0 && (
        <>
          Θα εξοφλήσει, από το παλαιότερο:
          <ul>
            {covers.map((c) => (
              <li key={c.number}>
                {c.number}: {fmtMoney(c.amount)}
              </li>
            ))}
          </ul>
        </>
      )}
      {surplus > 0 && (
        <p>
          Θα μείνει υπόλοιπο υπέρ του πελάτη {fmtMoney(surplus)}· συμψηφίζεται
          με το επόμενο Τιμολόγιο.
        </p>
      )}
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label>
      {props.label}
      {props.children}
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <select
        className="select"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function InputField(props: {
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
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

function FormFields(props: {
  form: FormValues;
  clients: readonly Option[];
  methods: readonly Option[];
  set: (patch: Partial<FormValues>) => void;
}) {
  const { form, set } = props;
  return (
    <>
        <SelectField
          label="Πελάτης"
          value={form.clientId}
          options={props.clients}
          onChange={(clientId) => set({ clientId })}
        />
        <InputField
          label="Ποσό (€, με ΦΠΑ)"
          value={form.amount}
          onChange={(amount) => set({ amount })}
        />
        <InputField
          label="Ημερομηνία"
          type="date"
          value={form.date}
          onChange={(date) => set({ date })}
        />
        <SelectField
          label="Τρόπος"
          value={form.method}
          options={props.methods}
          onChange={(method) => set({ method })}
        />
        <InputField
          label="Σημείωση"
          value={form.note}
          onChange={(note) => set({ note })}
        />
    </>
  );
}

export function I4Form(props: I4FormProps) {
  const [form, setForm] = useState<FormValues>({
    clientId: props.clients[0]?.id ?? "",
    amount: "",
    date: props.today,
    method: props.methods[0]?.id ?? "",
    note: "",
  });
  const [done, setDone] = useState(false);
  const set = (patch: Partial<FormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDone(false);
  };
  const value = Number(form.amount.replace(",", ".")) || 0;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Νέα Είσπραξη</h2>
      </div>
      <form
        className="i245-form"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(value > 0);
        }}
      >
        <FormFields
          form={form}
          clients={props.clients}
          methods={props.methods}
          set={set}
        />
        <PreviewBox
          open={props.openByClient[form.clientId] ?? []}
          amount={value}
        />
        <button type="submit" className="button" data-primary="true">
          Καταχώρηση Είσπραξης
        </button>
        {done && (
          <p className="note">
            Καταχωρήθηκε {fmtMoney(value)} (prototype: δεν αποθηκεύεται). Η
            εξόφληση ξαναϋπολογίστηκε από το παλαιότερο Τιμολόγιο.
          </p>
        )}
      </form>
    </section>
  );
}
