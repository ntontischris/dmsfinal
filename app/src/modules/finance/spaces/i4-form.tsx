"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { fmtMoney } from "@/spaces/screens/shared";

import { registerReceipt } from "../actions";
import type { ClientOption } from "../types";
import { previewOf, settlementOf, type OpenInvoice } from "./i4-model";

interface Option {
  id: string;
  name: string;
}

interface I4FormProps {
  clients: readonly ClientOption[];
  methods: readonly Option[];
  // null όταν δεν φόρτωσαν τα Τιμολόγια: τότε δεν δείχνουμε «Θα εξοφλήσει» (δεν το ξέρουμε).
  openByClient: Readonly<Record<string, readonly OpenInvoice[]>> | null;
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

// Τα ανοιχτά Τιμολόγια κρατιούνται όπως ήταν πριν την Είσπραξη (μετά η σελίδα φρεσκάρεται με τα νέα).
interface Recorded {
  amount: number;
  clientName: string;
  open: readonly OpenInvoice[] | null;
}

// Μετά την Είσπραξη: τι εξοφλήθηκε, τι μένει, και σύνδεσμος στα Τιμολόγια όπως είναι τώρα.
function DoneNote({ done }: { done: Recorded }) {
  const settled = done.open === null ? [] : settlementOf(done.open, done.amount);
  const surplus =
    done.open === null ? 0 : previewOf(done.open, done.amount).surplus;
  return (
    <div className="note" role="status">
      <p>
        Καταχωρήθηκε {fmtMoney(done.amount)} από {done.clientName}.
      </p>
      {settled.map((s) => (
        <p key={s.number}>
          {s.isPaid
            ? `Το ${s.number} είναι πλέον εξοφλημένο.`
            : `Στο ${s.number} μένουν ${fmtMoney(s.left)}.`}
        </p>
      ))}
      {surplus > 0 && <p>Περισσεύουν {fmtMoney(surplus)} υπέρ του πελάτη.</p>}
      <Link href={hrefOf("I2")}>Δες τα Τιμολόγια</Link>
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

const formDataOf = (form: FormValues): FormData => {
  const data = new FormData();
  data.set("clientId", form.clientId);
  data.set("amount", form.amount);
  data.set("receivedOn", form.date);
  data.set("methodId", form.method);
  data.set("note", form.note);
  return data;
};

function ErrorMessage({ text }: { text: string | null }) {
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

// Η «Νέα Είσπραξη» του prototype (`screens/i4-form.tsx`), με την πραγματική καταχώρηση (receipt_register).
export function I4Form(props: I4FormProps) {
  const [form, setForm] = useState<FormValues>({
    clientId: props.clients[0]?.id ?? "",
    amount: "",
    date: props.today,
    method: props.methods[0]?.id ?? "",
    note: "",
  });
  const [done, setDone] = useState<Recorded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = (patch: Partial<FormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDone(null);
    setError(null);
  };
  const value = Number(form.amount.replace(",", ".")) || 0;
  // Η προεπισκόπηση ακολουθεί χωρίς να κρατά το πληκτρολόγιο.
  const previewAmount = useDeferredValue(value);
  const open =
    props.openByClient === null
      ? null
      : (props.openByClient[form.clientId] ?? []);
  const clientName =
    props.clients.find((c) => c.id === form.clientId)?.name ?? "";
  const handleSubmit = () =>
    startTransition(async () => {
      const recorded = { amount: value, clientName, open };
      const state = await registerReceipt({}, formDataOf(form));
      if (state.error) return setError(state.error);
      setForm((prev) => ({ ...prev, amount: "", note: "" }));
      setDone(recorded);
    });
  return (
    <Panel label="Νέα Είσπραξη">
      <form
        className="i245-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormFields
          form={form}
          clients={props.clients}
          methods={props.methods}
          set={set}
        />
        {!done && open !== null && (
          <PreviewBox open={open} amount={previewAmount} />
        )}
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending}
        >
          {isPending ? "Αποθήκευση…" : "Καταχώρηση Είσπραξης"}
        </button>
        <ErrorMessage text={error} />
        {done && <DoneNote done={done} />}
      </form>
    </Panel>
  );
}
