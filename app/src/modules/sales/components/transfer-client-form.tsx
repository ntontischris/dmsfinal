"use client";

import { Field, Select } from "@/components/ui/field";

import { transferClient } from "../actions-clients";
import type { AssignableUser } from "../types";

import { ActionForm } from "./action-form";

interface TransferClientFormProps {
  clientId: string;
  currentManagerId: string | null;
  assignable: readonly AssignableUser[];
}

// Μεταβίβαση ολόκληρου του Πελάτη. Δεν αναιρείται από εδώ: ο νέος Υπεύθυνος μπορεί να τον ξαναμεταβιβάσει η Διαχείριση.
export function TransferClientForm({
  clientId,
  currentManagerId,
  assignable,
}: TransferClientFormProps) {
  const candidates = assignable.filter(
    (user) => user.userId !== currentManagerId,
  );
  if (candidates.length === 0)
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Δεν υπάρχει άλλος Υπεύθυνος στον οποίο να περάσει ο Πελάτης.
      </p>
    );
  return (
    <ActionForm
      action={transferClient}
      submitLabel="Μεταβίβαση"
      pendingLabel="Μεταβίβαση…"
      variant="danger"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="requestId" value="" />
      <Field label="Νέος Υπεύθυνος">
        <Select name="userId" defaultValue="">
          <option value="" disabled>
            Διάλεξε Υπεύθυνο
          </option>
          {candidates.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="m-0 text-sm text-muted-foreground">
        Ολόκληρος ο Πελάτης περνά στον νέο Υπεύθυνο. Οι ανοιχτές Ευκαιρίες του
        προηγούμενου Υπεύθυνου τον ακολουθούν.
      </p>
    </ActionForm>
  );
}
