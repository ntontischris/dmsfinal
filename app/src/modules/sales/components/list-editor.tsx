import Link from "next/link";
import type { ReactNode } from "react";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { createListItem } from "../actions-settings";
import type { ListItem, ListName, ListUsage } from "../types";

import { ActionForm } from "./action-form";
import { ListTable } from "./list-editor-parts";

interface ListEditorProps {
  list: ListName;
  title: string;
  items: readonly ListItem[];
  usage: ListUsage;
  showRetired: boolean;
  // Μόνο για τα Στάδια (StagesEditor): οι χρησιμοποιημένες τιμές αποσύρονται με μεταφορά των ανοιχτών Ευκαιριών.
  hasTransferRetire?: boolean;
  footer?: ReactNode;
}

const SETTINGS_HREF = "/app/settings/sales";

function RetiredToggle({
  count,
  showRetired,
}: {
  count: number;
  showRetired: boolean;
}) {
  if (count === 0 && !showRetired) return null;
  return (
    <Link
      href={showRetired ? SETTINGS_HREF : `${SETTINGS_HREF}?retired=1`}
      className="text-sm"
    >
      {showRetired ? "Κρύψε αποσυρμένες" : `Δείξε αποσυρμένες (${count})`}
    </Link>
  );
}

function AddItemForm({ list }: { list: ListName }) {
  return (
    <ActionForm
      action={createListItem}
      submitLabel="Προσθήκη"
      pendingLabel="Προσθήκη…"
      resetOnSuccess
    >
      <input type="hidden" name="list" value={list} />
      <Field label="Νέα τιμή">
        <Input name="label" required />
      </Field>
    </ActionForm>
  );
}

// Μια λίστα του admin: προστίθεται και αναδιατάσσεται ελεύθερα· ό,τι χρησιμοποιήθηκε αποσύρεται, δεν σβήνεται (ADR 0015).
export function ListEditor({
  list,
  title,
  items,
  usage,
  showRetired,
  hasTransferRetire = false,
  footer,
}: ListEditorProps) {
  const retiredCount = items.filter((item) => item.isRetired).length;
  return (
    <Panel
      label={title}
      aside={<RetiredToggle count={retiredCount} showRetired={showRetired} />}
    >
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Οι αλλαγές ισχύουν από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.
        </p>
        <ListTable
          list={list}
          items={items}
          usage={usage}
          showRetired={showRetired}
          hasTransferRetire={hasTransferRetire}
        />
        <div className="border-t pt-4">
          <AddItemForm list={list} />
        </div>
        {footer}
      </div>
    </Panel>
  );
}
