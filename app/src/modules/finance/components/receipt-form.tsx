"use client";

import { useState } from "react";

import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { registerReceipt } from "../actions";
import { athensToday } from "../money";
import type { ClientOption, PaymentMethod } from "../types";

import { ActionForm } from "./action-form";
import { ReceiptPreview } from "./receipt-preview";
import { useReceiptPreview } from "./use-receipt-preview";

interface ReceiptFormProps {
  clients: readonly ClientOption[];
  methods: readonly PaymentMethod[];
}

// Η φόρμα «Νέα Είσπραξη»: ποσό με ΦΠΑ, ημερομηνία (σήμερα), τρόπος και σημείωση, με ζωντανή προεπισκόπηση.
export function ReceiptForm({ clients, methods }: ReceiptFormProps) {
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const preview = useReceiptPreview(clientId, amount);
  const activeMethods = methods.filter((method) => !method.retired);
  return (
    <Panel label="Νέα Είσπραξη">
      <ActionForm
        action={registerReceipt}
        submitLabel="Καταχώρηση Είσπραξης"
        resetOnSuccess
        onSuccess={() => {
          setClientId("");
          setAmount("");
        }}
      >
        <Field label="Πελάτης">
          <Select name="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Διάλεξε Πελάτη</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ποσό (€, με ΦΠΑ)">
          <Input
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Ημερομηνία">
          <Input name="receivedOn" type="date" defaultValue={athensToday()} />
        </Field>
        <Field label="Τρόπος">
          <Select name="methodId" defaultValue="">
            <option value="" disabled>
              Διάλεξε τρόπο
            </option>
            {activeMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Σημείωση">
          <Input name="note" maxLength={500} />
        </Field>
        <ReceiptPreview result={preview} />
      </ActionForm>
    </Panel>
  );
}
