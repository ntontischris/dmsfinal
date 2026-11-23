"use client";

import { formatDateTime } from "../helpers";
import type { CatalogueItem } from "../types";

import { usesText } from "./c2-adapter";
import { RETIRE_NOTE, RETIRED_NOTE } from "./c2-archive";
import { C2Box } from "./c2-box";

const usageHint = (item: CatalogueItem): string =>
  [
    item.uses === null ? null : `σε ${item.uses} Συμφωνίες`,
    `αλλαγή ${formatDateTime(item.updatedAt)}`,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

// Χρήση και ιστορικό. Το «Σε χρήση» το στέλνει η βάση μόνο σε όποιον Διαχειρίζεται Κατάλογο (αλλιώς null και η γραμμή λείπει).
// Το κουμπί Αρχειοθέτηση/Επαναφορά ζει στο hero· εδώ μένει η εξήγησή του.
export function C2Usage({
  item,
  canManage,
}: {
  item: CatalogueItem;
  canManage: boolean;
}) {
  return (
    <C2Box title="Χρήση και ιστορικό" hint={usageHint(item)}>
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
      {canManage && (
        <p className="muted">{item.isRetired ? RETIRED_NOTE : RETIRE_NOTE}</p>
      )}
    </C2Box>
  );
}
