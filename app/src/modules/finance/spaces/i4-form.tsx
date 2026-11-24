"use client";

import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { fmtMoney } from "@/spaces/screens/shared";

import { registerReceipt } from "../actions";
import type { ClientOption, WithholdingRate } from "../types";
import { ErrorMessage, type Option } from "./i4-form-fields";
import {
  AmountStep,
  ClientStep,
  WhenStep,
  clientChoicesOf,
  type ReceiptFormValues,
} from "./i4-form-steps";
import {
  linkedPreviewOf,
  settlementOf,
  suggestedWithholding,
  type OpenInvoice,
} from "./i4-model";

interface I4FormProps {
  clients: readonly ClientOption[];
  methods: readonly Option[];
  // null όταν δεν φόρτωσαν τα Τιμολόγια: τότε δεν δείχνουμε «Θα εξοφλήσει» (δεν το ξέρουμε).
  openByClient: Readonly<Record<string, readonly OpenInvoice[]>> | null;
  // Τα ενεργά ποσοστά παρακράτησης (d6).
  rates: readonly WithholdingRate[];
  today: string;
  // Από τη γραμμή Τιμολογίου (I2) ή τη σελίδα Τιμολογίου: ?client=&invoice= (d4).
  initial: { clientId?: string; invoiceId?: string };
}

type FormValues = ReceiptFormValues;

const numberOf = (text: string): number => Number(text.replace(",", ".")) || 0;
const textOf = (value: number): string =>
  value > 0 ? String(value).replace(".", ",") : "";

function PreviewBox(props: {
  open: readonly OpenInvoice[];
  value: number;
  linked: readonly string[];
}) {
  if (props.value <= 0) return null;
  const { covers, surplus } = linkedPreviewOf(
    props.open,
    props.value,
    props.linked,
  );
  return (
    <div className="i245-preview" aria-live="polite">
      {covers.length > 0 && (
        <>
          {props.linked.length > 0
            ? "Θα εξοφλήσει, πρώτα όσα διάλεξες:"
            : "Θα εξοφλήσει, από το παλαιότερο:"}
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
  value: number;
  clientName: string;
  open: readonly OpenInvoice[] | null;
  linked: readonly string[];
}

// Μετά την Είσπραξη: τι εξοφλήθηκε, τι μένει, και σύνδεσμος στα Τιμολόγια όπως είναι τώρα.
function DoneNote({ done }: { done: Recorded }) {
  const settled =
    done.open === null ? [] : settlementOf(done.open, done.value, done.linked);
  const surplus =
    done.open === null
      ? 0
      : linkedPreviewOf(done.open, done.value, done.linked).surplus;
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

// Η πρόταση όταν αλλάζουν τα Τιμολόγια ή το είδος παρακράτησης: παρακράτηση = ποσοστό του καθαρού τους, ποσό = ό,τι
// μένει μείον την παρακράτηση. Το ποσό που έγραψε ο Χρήστης δεν αλλάζει.
const suggestionOf = (
  open: readonly OpenInvoice[],
  rates: readonly WithholdingRate[],
  form: FormValues,
): Partial<FormValues> => {
  const percent = rates.find((r) => r.id === form.rateId)?.percent ?? 0;
  const withheld = suggestedWithholding(open, form.invoiceIds, percent);
  const remaining = open
    .filter((inv) => form.invoiceIds.includes(inv.id))
    .reduce((sum, inv) => sum + inv.remaining, 0);
  const amount = Math.round((remaining - withheld) * 100) / 100;
  return {
    withheld: withheld > 0 ? textOf(withheld) : form.withheld,
    ...(form.amountTouched ? {} : { amount: textOf(amount) }),
  };
};

const initialFormOf = (props: I4FormProps): FormValues => {
  const { clientId: wanted, invoiceId } = props.initial;
  const clientId = props.clients.some((c) => c.id === wanted)
    ? (wanted ?? "")
    : "";
  const open = props.openByClient?.[clientId] ?? [];
  const base: FormValues = {
    clientId,
    amount: "",
    date: props.today,
    method: props.methods[0]?.id ?? "",
    note: "",
    invoiceIds: open.filter((inv) => inv.id === invoiceId).map((inv) => inv.id),
    rateId: "",
    withheld: "",
    amountTouched: false,
  };
  return { ...base, ...suggestionOf(open, props.rates, base) };
};

const formDataOf = (form: FormValues): FormData => {
  const data = new FormData();
  data.set("clientId", form.clientId);
  data.set("amount", form.amount);
  data.set("receivedOn", form.date);
  data.set("methodId", form.method);
  data.set("note", form.note);
  data.set("invoiceIds", form.invoiceIds.join(","));
  data.set("withholdingId", form.rateId);
  data.set("withheld", form.rateId === "" ? "" : form.withheld);
  return data;
};

const CLEARED: Partial<FormValues> = {
  amount: "",
  note: "",
  invoiceIds: [],
  rateId: "",
  withheld: "",
  amountTouched: false,
};

// Η «Νέα Είσπραξη» του prototype (`screens/i4-form.tsx`), με την πραγματική καταχώρηση (receipt_record). Ο Πελάτης
// διαλέγεται πάντα ρητά (d4)· από γραμμή Τιμολογίου έρχονται Πελάτης, Τιμολόγιο και ποσό έτοιμα.
export function I4Form(props: I4FormProps) {
  const [form, setForm] = useState<FormValues>(() => initialFormOf(props));
  const [done, setDone] = useState<Recorded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = (patch: Partial<FormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDone(null);
    setError(null);
  };
  const value =
    numberOf(form.amount) + (form.rateId === "" ? 0 : numberOf(form.withheld));
  // Η προεπισκόπηση ακολουθεί χωρίς να κρατά το πληκτρολόγιο.
  const previewValue = useDeferredValue(value);
  const open =
    props.openByClient === null
      ? null
      : (props.openByClient[form.clientId] ?? []);
  const clientName =
    props.clients.find((c) => c.id === form.clientId)?.name ?? "";
  const suggest = (invoiceIds: string[], rateId: string) =>
    suggestionOf(open ?? [], props.rates, { ...form, invoiceIds, rateId });
  const handleSubmit = () =>
    startTransition(async () => {
      const recorded = {
        amount: numberOf(form.amount),
        value,
        clientName,
        open,
        linked: form.invoiceIds,
      };
      const state = await registerReceipt({}, formDataOf(form));
      if (state.error) return setError(state.error);
      setForm((prev) => ({ ...prev, ...CLEARED }));
      setDone(recorded);
    });
  return (
    <section aria-labelledby="i4-new-title">
      <h2 id="i4-new-title" className="sr-only">
        Νέα Είσπραξη
      </h2>
      <form
        className="i245-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <ClientStep
          form={form}
          set={set}
          suggest={suggest}
          clients={clientChoicesOf(props.clients)}
          open={open ?? []}
        />
        <AmountStep form={form} set={set} suggest={suggest} rates={props.rates}>
          {!done && open !== null && (
            <PreviewBox
              open={open}
              value={previewValue}
              linked={form.invoiceIds}
            />
          )}
        </AmountStep>
        <WhenStep form={form} set={set} methods={props.methods}>
          <button type="submit" className="i3-go" disabled={isPending}>
            {isPending ? "Αποθήκευση…" : "Καταχώρηση Είσπραξης"}
          </button>
        </WhenStep>
        <ErrorMessage text={error} />
        {done && <DoneNote done={done} />}
      </form>
    </section>
  );
}
