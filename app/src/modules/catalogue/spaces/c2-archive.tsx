"use client";

import { restoreItem, retireItem } from "../actions-items";
import type { CatalogueItem } from "../types";

import { C2Form, C2Submit } from "./c2-form";

export const RETIRED_NOTE =
  "Αρχειοθετημένο: δεν προσφέρεται σε νέες προτάσεις.";
export const RETIRE_NOTE =
  "Δεν διαγράφεται. Η αρχειοθέτηση το βγάζει από τις νέες προτάσεις και την Ιστοσελίδα· οι Συμφωνίες που το έχουν συνεχίζουν.";

// Αρχειοθέτηση ή Επαναφορά, στα κουμπιά του hero. Η εξήγηση μένει στο κουτί «Χρήση και ιστορικό».
export function ArchiveAction({ item }: { item: CatalogueItem }) {
  if (item.isRetired)
    return (
      <C2Form action={restoreItem} itemId={item.id}>
        <C2Submit
          label="Επαναφορά"
          pendingLabel="Επαναφορά…"
          isPrimary={false}
        />
      </C2Form>
    );
  return (
    <C2Form action={retireItem} itemId={item.id}>
      <C2Submit
        label="Αρχειοθέτηση"
        pendingLabel="Αρχειοθέτηση…"
        isPrimary={false}
      />
    </C2Form>
  );
}
