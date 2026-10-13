"use client";

import { deleteItem, publishItem, unpublishItem } from "../actions-items";
import { publishBlockers } from "../helpers";
import type { EditableItem } from "../view-schema";
import { ActionForm } from "./action-form";

// Δημοσίευση, απόσυρση και οριστική διαγραφή. Η βάση κρίνει· εδώ φαίνεται από πριν τι λείπει για τη δημοσίευση.

function IdField({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}

export function ItemActions({ item }: { item: EditableItem }) {
  if (item.status === "published") {
    return (
      <div className="grid gap-2">
        <ActionForm
          action={unpublishItem}
          submitLabel="Απόσυρση"
          pendingLabel="Απόσυρση…"
        >
          <IdField id={item.id} />
        </ActionForm>
        <p className="m-0 text-sm text-muted-foreground">
          Γυρίζει σε πρόχειρο· ο Βοηθός το ξεχνά αμέσως. Δημοσιευμένο στοιχείο
          πρώτα αποσύρεται και μετά διαγράφεται.
        </p>
      </div>
    );
  }
  const blockers = publishBlockers({ ...item, hasFile: item.file !== null });
  return (
    <div className="grid gap-3">
      <ActionForm
        action={publishItem}
        submitLabel="Δημοσίευση"
        pendingLabel="Δημοσίευση…"
      >
        <IdField id={item.id} />
        {blockers.length > 0 && (
          <ul
            aria-label="Τι λείπει για τη δημοσίευση"
            className="m-0 pl-5 text-sm text-muted-foreground"
          >
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
      </ActionForm>
      <ActionForm
        action={deleteItem}
        submitLabel="Διαγραφή"
        pendingLabel="Διαγραφή…"
        submitVariant="danger"
      >
        <IdField id={item.id} />
        <p className="m-0 text-sm text-muted-foreground">
          Η διαγραφή είναι οριστική· οι Συζητήσεις που το είχαν πηγή το δείχνουν
          ως «δεν υπάρχει πια».
        </p>
      </ActionForm>
    </div>
  );
}
