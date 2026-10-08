"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Td, Tr } from "@/components/ui/table";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import {
  deleteKind,
  moveKind,
  reactivateKind,
  retireKind,
  updateKind,
} from "../actions-settings";
import { formatHours } from "../helpers";
import { MEASURE_LABELS } from "../labels";
import type { ProvisionKind } from "../types";

import { ActionForm } from "./action-form";
import { ProvisionKindFields } from "./provision-kind-fields";

interface ProvisionKindRowProps {
  kind: ProvisionKind;
  uses: number;
  // Το μήνυμα επιτυχίας των ενεργειών που αφαιρούν τη γραμμή ανεβαίνει στον πίνακα (βλ. withTableNotice).
  onNotice: (notice: string) => void;
}

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Διαγραφή και απόσυρση βγάζουν τη γραμμή μόλις ανανεωθεί η σελίδα, και μαζί της το μήνυμα της φόρμας της·
// ο χρήστης δεν θα το έβλεπε ποτέ. Η επιτυχία δηλώνεται λοιπόν στον πίνακα, που μένει.
const withTableNotice =
  (action: Action, onNotice: (notice: string) => void): Action =>
  async (state, form) => {
    const result = await action(state, form);
    if (!result.notice) return result;
    onNotice(result.notice);
    return INITIAL_FORM_STATE;
  };

const measureText = (kind: ProvisionKind): string => {
  if (kind.measure === null) return "σε πλήθος";
  const label = MEASURE_LABELS[kind.measure];
  return kind.defaultHours === null
    ? label
    : `${label}, έως ${formatHours(kind.defaultHours)}`;
};

function KindRef({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}

function MoveButtons({ kind }: { kind: ProvisionKind }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((direction) => (
        <ActionForm
          key={direction}
          action={moveKind}
          submitLabel={direction === "up" ? "↑" : "↓"}
          submitAriaLabel={`${direction === "up" ? "Πάνω" : "Κάτω"}: ${kind.label}`}
          pendingLabel="…"
          variant="default"
          size="sm"
          className="gap-1"
        >
          <KindRef id={kind.id} />
          <input type="hidden" name="direction" value={direction} />
        </ActionForm>
      ))}
    </div>
  );
}

function StatusBadge({ kind, uses }: { kind: ProvisionKind; uses: number }) {
  if (kind.isRetired) return <Badge>Αποσύρθηκε</Badge>;
  return <Badge>{uses > 0 ? `Σε χρήση σε ${uses}` : "Νέο"}</Badge>;
}

// Μία ενέργεια ανά είδος: επανενεργοποίηση, διαγραφή (δεν χρησιμοποιήθηκε ποτέ) ή απόσυρση (χρησιμοποιείται).
function RemoveAction({ kind, uses, onNotice }: ProvisionKindRowProps) {
  if (kind.isRetired)
    return (
      <ActionForm
        action={reactivateKind}
        submitLabel="Επανενεργοποίηση"
        variant="default"
        size="sm"
      >
        <KindRef id={kind.id} />
      </ActionForm>
    );
  const isUnused = uses === 0;
  return (
    <ActionForm
      action={withTableNotice(isUnused ? deleteKind : retireKind, onNotice)}
      submitLabel={isUnused ? "Διαγραφή" : "Απόσυρση"}
      variant={isUnused ? "danger" : "default"}
      size="sm"
    >
      <KindRef id={kind.id} />
    </ActionForm>
  );
}

function KindCell({
  kind,
  isEditing,
}: {
  kind: ProvisionKind;
  isEditing: boolean;
}) {
  return (
    <div className="grid gap-2 text-left">
      <div className="grid gap-0.5">
        <span className="break-words font-medium">{kind.label}</span>
        <span className="text-xs text-muted-foreground">{kind.labelEn}</span>
      </div>
      {isEditing && (
        <ActionForm
          action={updateKind}
          submitLabel="Αποθήκευση"
          variant="default"
          size="sm"
        >
          <KindRef id={kind.id} />
          <ProvisionKindFields kind={kind} />
        </ActionForm>
      )}
    </div>
  );
}

interface ActionsCellProps extends ProvisionKindRowProps {
  isEditing: boolean;
  onToggleEdit: () => void;
}

function ActionsCell({ isEditing, onToggleEdit, ...row }: ActionsCellProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={isEditing}
        onClick={onToggleEdit}
      >
        Επεξεργασία
      </Button>
      <RemoveAction {...row} />
    </div>
  );
}

// Μία γραμμή: σειρά, είδος με αγγλικά, μονάδα, μέτρηση, κατάσταση χρήσης και οι ενέργειες που επιτρέπονται.
export function ProvisionKindRow(props: ProvisionKindRowProps) {
  const { kind, uses } = props;
  const [isEditing, setIsEditing] = useState(false);
  return (
    <Tr>
      <Td data-label="Σειρά">
        {kind.isRetired ? null : <MoveButtons kind={kind} />}
      </Td>
      <Td data-label="Είδος">
        <KindCell kind={kind} isEditing={isEditing} />
      </Td>
      <Td data-label="Μονάδα">
        <div className="grid gap-0.5 text-left">
          <span>{kind.unit}</span>
          <span className="text-xs text-muted-foreground">{kind.unitEn}</span>
        </div>
      </Td>
      <Td data-label="Μέτρηση">{measureText(kind)}</Td>
      <Td data-label="Κατάσταση">
        <StatusBadge kind={kind} uses={uses} />
      </Td>
      <Td data-label="Ενέργεια">
        <ActionsCell
          {...props}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing((current) => !current)}
        />
      </Td>
    </Tr>
  );
}
