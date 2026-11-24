"use client";

import type { ReactNode } from "react";

import type { ClientOption, WithholdingRate } from "../types";
import { Step } from "./i3-parts";
import {
  InputField,
  InvoicePicker,
  SelectField,
  WithholdingFields,
  type Option,
} from "./i4-form-fields";
import type { OpenInvoice } from "./i4-model";

// Τα τρία βήματα της «Νέας Είσπραξης» (I4), στη μορφή των βημάτων της Καταχώρησης Τιμολογίου.

export interface ReceiptFormValues {
  clientId: string;
  amount: string;
  date: string;
  method: string;
  note: string;
  invoiceIds: string[];
  rateId: string;
  withheld: string;
  // Ο Χρήστης έγραψε ποσό: η φόρμα δεν το ξαναπροτείνει.
  amountTouched: boolean;
}

interface StepProps {
  form: ReceiptFormValues;
  set: (patch: Partial<ReceiptFormValues>) => void;
  suggest: (invoiceIds: string[], rateId: string) => Partial<ReceiptFormValues>;
}

// Βήμα 1: ποιος πλήρωσε και (προαιρετικά) ποια Τιμολόγια κλείνει.
export function ClientStep(
  props: StepProps & {
    clients: readonly Option[];
    open: readonly OpenInvoice[];
  },
) {
  const { form, set } = props;
  const name = props.clients.find((c) => c.id === form.clientId)?.name;
  return (
    <Step
      no={1}
      title="Πελάτης και Τιμολόγια"
      hint={name ?? "Ποιος πλήρωσε. Τα Τιμολόγια κλείνουν από το παλαιότερο."}
    >
      <SelectField
        label="Πελάτης"
        value={form.clientId}
        options={props.clients}
        placeholder="Διάλεξε Πελάτη…"
        onChange={(clientId) =>
          set({ clientId, invoiceIds: [], withheld: "", amountTouched: false })
        }
      />
      <InvoicePicker
        open={props.open}
        selected={form.invoiceIds}
        onChange={(ids) =>
          set({ invoiceIds: ids, ...props.suggest(ids, form.rateId) })
        }
      />
    </Step>
  );
}

// Βήμα 2: το ποσό, η παρακράτηση και τι θα εξοφλήσει.
export function AmountStep(
  props: StepProps & { rates: readonly WithholdingRate[]; children: ReactNode },
) {
  const { form, set } = props;
  return (
    <Step no={2} title="Ποσό" hint="Ό,τι μπήκε στον λογαριασμό, με ΦΠΑ.">
      <InputField
        label="Ποσό (€, με ΦΠΑ)"
        value={form.amount}
        onChange={(amount) => set({ amount, amountTouched: true })}
      />
      <WithholdingFields
        rates={props.rates.map((r) => ({ id: r.id, name: r.label }))}
        rateId={form.rateId}
        withheld={form.withheld}
        onRate={(rateId) =>
          set({ rateId, ...props.suggest(form.invoiceIds, rateId) })
        }
        onWithheld={(withheld) => set({ withheld })}
      />
      {props.children}
    </Step>
  );
}

// Βήμα 3: πότε και πώς, και η καταχώρηση.
export function WhenStep(
  props: Omit<StepProps, "suggest"> & {
    methods: readonly Option[];
    children: ReactNode;
  },
) {
  const { form, set } = props;
  return (
    <Step no={3} title="Πότε και πώς" hint="Ημερομηνία, τρόπος και σημείωση.">
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
        type="text"
        value={form.note}
        onChange={(note) => set({ note })}
      />
      {props.children}
    </Step>
  );
}

// Ίδια ονόματα Πελατών ξεχωρίζουν με την αχνή λέξη (πόλη ή υπεύθυνος) δίπλα στο όνομα.
export const clientChoicesOf = (clients: readonly ClientOption[]): Option[] =>
  clients.map((c) => ({
    id: c.id,
    name: c.hint ? `${c.name} · ${c.hint}` : c.name,
  }));
