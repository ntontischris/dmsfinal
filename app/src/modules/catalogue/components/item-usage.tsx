import { formatDateTime } from "../helpers";
import { restoreItem, retireItem } from "../actions-items";
import type { CatalogueItem } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote, ReadOnlyRow } from "./item-basics-form-parts";

interface ItemUsageProps {
  item: CatalogueItem;
  canManage: boolean;
}

const usesText = (uses: number): string =>
  uses === 0
    ? "Καμία Συμφωνία δεν το έχει αντιγράψει ακόμα."
    : `${uses} Συμφωνίες το έχουν αντιγράψει· οι αλλαγές εδώ δεν τις αγγίζουν.`;

function RetireOrRestore({ item }: { item: CatalogueItem }) {
  if (item.isRetired)
    return (
      <div className="grid gap-3 border-t pt-3">
        <MutedNote>
          Αρχειοθετημένο: δεν προσφέρεται σε νέες προτάσεις.
        </MutedNote>
        <ActionForm
          action={restoreItem}
          submitLabel="Επαναφορά"
          variant="default"
        >
          <input type="hidden" name="itemId" value={item.id} />
        </ActionForm>
      </div>
    );
  return (
    <div className="grid gap-3 border-t pt-3">
      <MutedNote>
        Δεν διαγράφεται. Η αρχειοθέτηση το βγάζει από τις νέες προτάσεις και την
        Ιστοσελίδα· οι Συμφωνίες που το έχουν συνεχίζουν.
      </MutedNote>
      <ActionForm
        action={retireItem}
        submitLabel="Αρχειοθέτηση"
        variant="danger"
      >
        <input type="hidden" name="itemId" value={item.id} />
      </ActionForm>
    </div>
  );
}

// Χρήση και αρχειοθέτηση. Το «Σε χρήση» το στέλνει η βάση μόνο σε όποιον Διαχειρίζεται Κατάλογο (αλλιώς null και η γραμμή λείπει).
export function ItemUsage({ item, canManage }: ItemUsageProps) {
  return (
    <div className="grid gap-3">
      {item.uses !== null && (
        <ReadOnlyRow label="Σε χρήση">{usesText(item.uses)}</ReadOnlyRow>
      )}
      <ReadOnlyRow label="Τελευταία αλλαγή">
        {formatDateTime(item.updatedAt)}, {item.updatedByName ?? "το σύστημα"}
      </ReadOnlyRow>
      {canManage && <RetireOrRestore item={item} />}
    </div>
  );
}
