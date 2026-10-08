import { LIST_LABELS } from "../labels";
import type { ListItem, ListUsage } from "../types";

import { ListEditor } from "./list-editor";

interface StagesEditorProps {
  items: readonly ListItem[];
  usage: ListUsage;
  showRetired: boolean;
}

// Τα Στάδια είναι λίστα όπως οι άλλες, με μία διαφορά: ένα Στάδιο που χρησιμοποιείται αποσύρεται μεταφέροντας πρώτα τις ανοιχτές Ευκαιρίες του.
export function StagesEditor({ items, usage, showRetired }: StagesEditorProps) {
  return (
    <ListEditor
      list="stages"
      title={LIST_LABELS.stages}
      items={items}
      usage={usage}
      showRetired={showRetired}
      hasTransferRetire
      footer={
        <p className="m-0 text-sm text-muted-foreground">
          Η Κερδισμένη και η Χαμένη είναι σταθερές Εκβάσεις, όχι Στάδια.
        </p>
      }
    />
  );
}
