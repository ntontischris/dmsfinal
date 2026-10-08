"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Td, Tr } from "@/components/ui/table";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import {
  deleteListItem,
  moveListItem,
  reactivateListItem,
  renameListItem,
  retireListItem,
  retireStage,
} from "../actions-settings";
import type { ListItem, ListName } from "../types";

import { ActionForm } from "./action-form";

interface ListRowProps {
  list: ListName;
  item: ListItem;
  uses: number;
  // Το μήνυμα επιτυχίας των ενεργειών που αφαιρούν τη γραμμή ανεβαίνει στη λίστα (βλ. withListNotice).
  onNotice: (notice: string) => void;
  // Μόνο για τα Στάδια: τα άλλα ενεργά Στάδια, όπου μεταφέρονται οι ανοιχτές Ευκαιρίες πριν την απόσυρση.
  retireTargets?: readonly ListItem[];
}

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Διαγραφή και απόσυρση βγάζουν τη γραμμή από τη λίστα μόλις ανανεωθεί η σελίδα, και μαζί της το μήνυμα της φόρμας της·
// ο Χρήστης δεν θα το έβλεπε ποτέ. Η επιτυχία δηλώνεται λοιπόν στη λίστα, που μένει, και η φόρμα της γραμμής μένει καθαρή.
const withListNotice =
  (action: Action, onNotice: (notice: string) => void): Action =>
  async (state, form) => {
    const result = await action(state, form);
    if (!result.notice) return result;
    onNotice(result.notice);
    return INITIAL_FORM_STATE;
  };


function ItemRef({ list, id }: { list: ListName; id: string }) {
  return (
    <>
      <input type="hidden" name="list" value={list} />
      <input type="hidden" name="id" value={id} />
    </>
  );
}

function MoveButtons({ list, item }: { list: ListName; item: ListItem }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((direction) => (
        <ActionForm
          key={direction}
          action={moveListItem}
          submitLabel={direction === "up" ? "↑" : "↓"}
          submitAriaLabel={`${direction === "up" ? "Πάνω" : "Κάτω"}: ${item.label}`}
          pendingLabel="…"
          variant="default"
          size="sm"
          className="gap-1"
        >
          <ItemRef list={list} id={item.id} />
          <input type="hidden" name="direction" value={direction} />
        </ActionForm>
      ))}
    </div>
  );
}

function LabelCell({ list, item }: { list: ListName; item: ListItem }) {
  const [isRenaming, setIsRenaming] = useState(false);
  return (
    <div className="grid gap-2 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-words font-medium">{item.label}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={isRenaming}
          aria-label={`Μετονομασία: ${item.label}`}
          onClick={() => setIsRenaming((current) => !current)}
        >
          Μετονομασία
        </Button>
      </div>
      {isRenaming && (
        <ActionForm
          action={renameListItem}
          submitLabel="Αποθήκευση"
          variant="default"
          size="sm"
        >
          <ItemRef list={list} id={item.id} />
          <Input
            name="label"
            required
            defaultValue={item.label}
            aria-label={`Νέα ετικέτα: ${item.label}`}
          />
        </ActionForm>
      )}
    </div>
  );
}

function StatusBadge({ item, uses }: { item: ListItem; uses: number }) {
  if (item.isRetired) return <Badge>Αποσύρθηκε</Badge>;
  return <Badge>{uses > 0 ? `Σε χρήση σε ${uses}` : "Νέα"}</Badge>;
}

function StageRetireForm({
  item,
  targets,
  onNotice,
}: {
  item: ListItem;
  targets: readonly ListItem[];
  onNotice: (notice: string) => void;
}) {
  return (
    <ActionForm
      action={withListNotice(retireStage, onNotice)}
      submitLabel="Μεταφορά και απόσυρση"
      pendingLabel="Απόσυρση…"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="stageId" value={item.id} />
      <Field label="Μεταφορά των ανοιχτών Ευκαιριών σε">
        <Select name="moveToId" defaultValue="">
          <option value="">Χωρίς μεταφορά (καμία ανοιχτή Ευκαιρία)</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}

// Μία ενέργεια ανά τιμή: επανενεργοποίηση, διαγραφή (δεν χρησιμοποιήθηκε ποτέ) ή απόσυρση (χρησιμοποιείται).
function ActionCell({
  list,
  item,
  uses,
  retireTargets,
  onNotice,
}: ListRowProps) {
  if (item.isRetired)
    return (
      <ActionForm
        action={reactivateListItem}
        submitLabel="Επανενεργοποίηση"
        variant="default"
        size="sm"
      >
        <ItemRef list={list} id={item.id} />
      </ActionForm>
    );
  if (item.isSystem)
    return (
      <span className="text-sm text-muted-foreground">
        Το χρειάζεται το σύστημα
      </span>
    );
  if (uses === 0)
    return (
      <ActionForm
        action={withListNotice(deleteListItem, onNotice)}
        submitLabel="Διαγραφή"
        variant="danger"
        size="sm"
      >
        <ItemRef list={list} id={item.id} />
      </ActionForm>
    );
  if (retireTargets)
    return (
      <StageRetireForm
        item={item}
        targets={retireTargets}
        onNotice={onNotice}
      />
    );
  return (
    <ActionForm
      action={withListNotice(retireListItem, onNotice)}
      submitLabel="Απόσυρση"
      variant="default"
      size="sm"
    >
      <ItemRef list={list} id={item.id} />
    </ActionForm>
  );
}

// Μία γραμμή λίστας: σειρά, ετικέτα με μετονομασία, κατάσταση χρήσης και η μία ενέργεια που επιτρέπεται.
export function ListRow(props: ListRowProps) {
  const { list, item, uses } = props;
  return (
    <Tr>
      <Td data-label="Σειρά">
        {item.isRetired ? null : <MoveButtons list={list} item={item} />}
      </Td>
      <Td data-label="Ετικέτα">
        <LabelCell list={list} item={item} />
      </Td>
      <Td data-label="Κατάσταση">
        <StatusBadge item={item} uses={uses} />
      </Td>
      <Td data-label="Ενέργεια">
        <ActionCell {...props} />
      </Td>
    </Tr>
  );
}
