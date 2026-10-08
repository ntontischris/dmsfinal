"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { requestAccess } from "../actions-clients";
import type { ListItem } from "../types";

import { ActionForm } from "./action-form";

interface AccessRequestFormProps {
  clientId: string;
  managerName: string | null;
  sources: readonly ListItem[];
}

// Ο Πελάτης είναι άλλου πωλητή: το αίτημα πηγαίνει στη Διαχείριση, που αποφασίζει (Ευκαιρία ή μεταβίβαση).
export function AccessRequestForm({
  clientId,
  managerName,
  sources,
}: AccessRequestFormProps) {
  return (
    <ActionForm
      action={requestAccess}
      submitLabel="Αίτημα πρόσβασης"
      pendingLabel="Αποστολή…"
    >
      <input type="hidden" name="clientId" value={clientId} />
      {managerName && (
        <p className="m-0 text-sm text-muted-foreground">
          Υπεύθυνος του Πελάτη: {managerName}. Το αίτημα το βλέπει η Διαχείριση.
        </p>
      )}
      <Field label="Τι αφορά">
        <Input name="topic" autoComplete="off" />
      </Field>
      <Field label="Σχόλιο">
        <Input name="comment" autoComplete="off" />
      </Field>
      <Field label="Πηγή">
        <Select name="sourceId" defaultValue="">
          <option value="" disabled>
            Διάλεξε Πηγή
          </option>
          {sources
            .filter((source) => !source.isRetired)
            .map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
