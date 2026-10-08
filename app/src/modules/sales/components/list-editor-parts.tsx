"use client";

import { useState } from "react";

import { FormMessage } from "@/components/ui/form-message";
import { Table, Th } from "@/components/ui/table";

import type { ListItem, ListName, ListUsage } from "../types";

import { ListRow } from "./list-row";

interface ListTableProps {
  list: ListName;
  items: readonly ListItem[];
  usage: ListUsage;
  showRetired: boolean;
  // Μόνο για τα Στάδια: οι χρησιμοποιημένες τιμές αποσύρονται με μεταφορά των ανοιχτών Ευκαιριών.
  hasTransferRetire: boolean;
}

// Ο πίνακας κρατά το μήνυμα επιτυχίας των γραμμών του: η γραμμή που διαγράφηκε ή αποσύρθηκε φεύγει με την ανανέωση της σελίδας,
// ο πίνακας μένει, άρα το μήνυμα («Μεταφέρθηκαν N Ευκαιρίες…») φαίνεται και μετά την ανανέωση.
export function ListTable({
  list,
  items,
  usage,
  showRetired,
  hasTransferRetire,
}: ListTableProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const activeOnly = items.filter((item) => !item.isRetired);
  const visible = showRetired ? items : activeOnly;
  return (
    <div className="grid gap-3">
      {notice && <FormMessage state={{ notice }} />}
      <Table>
        <thead>
          <tr>
            <Th>Σειρά</Th>
            <Th>Ετικέτα</Th>
            <Th>Κατάσταση</Th>
            <Th>Ενέργεια</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <ListRow
              key={item.id}
              list={list}
              item={item}
              uses={usage[item.id] ?? 0}
              retireTargets={
                hasTransferRetire
                  ? activeOnly.filter((other) => other.id !== item.id)
                  : undefined
              }
              onNotice={setNotice}
            />
          ))}
        </tbody>
      </Table>
    </div>
  );
}
