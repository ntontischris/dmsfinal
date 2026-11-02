"use client";

import { Panel } from "@/spaces/kit/panel";

import { restoreItem, retireItem } from "../actions-items";
import { formatDateTime } from "../helpers";
import type { CatalogueItem } from "../types";

import { usesText } from "./c2-adapter";
import { C2Form, C2Submit } from "./c2-form";

function RetireOrRestore({ item }: { item: CatalogueItem }) {
  if (item.isRetired)
    return (
      <C2Form action={restoreItem} itemId={item.id}>
        <C2Submit
          label="Επαναφορά"
          pendingLabel="Επαναφορά…"
          isPrimary={false}
          aside="Αρχειοθετημένο: δεν προσφέρεται σε νέες προτάσεις."
        />
      </C2Form>
    );
  return (
    <C2Form action={retireItem} itemId={item.id}>
      <C2Submit
        label="Αρχειοθέτηση"
        pendingLabel="Αρχειοθέτηση…"
        isDanger
        aside="Δεν διαγράφεται. Η αρχειοθέτηση το βγάζει από τις νέες προτάσεις και την Ιστοσελίδα· οι Συμφωνίες που το έχουν συνεχίζουν."
      />
    </C2Form>
  );
}

// Χρήση και ιστορικό. Το «Σε χρήση» το στέλνει η βάση μόνο σε όποιον Διαχειρίζεται Κατάλογο (αλλιώς null και η γραμμή λείπει).
export function C2Usage({
  item,
  canManage,
}: {
  item: CatalogueItem;
  canManage: boolean;
}) {
  return (
    <Panel label="Χρήση και ιστορικό">
      <dl className="dl">
        {item.uses !== null && (
          <>
            <dt>Σε χρήση</dt>
            <dd>
              {usesText(item.uses)}
              <div className="muted">
                Οι αλλαγές εδώ δεν τις αγγίζουν: κάθε Συμφωνία κρατά αντίγραφο
                τιμής, ωρών και κόστους.
              </div>
            </dd>
          </>
        )}
        <dt>Τελευταία αλλαγή</dt>
        <dd>
          {formatDateTime(item.updatedAt)}, {item.updatedByName ?? "το σύστημα"}
        </dd>
      </dl>
      {canManage && <RetireOrRestore item={item} />}
    </Panel>
  );
}
