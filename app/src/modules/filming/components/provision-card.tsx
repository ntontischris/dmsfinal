import { Panel } from "@/components/ui/panel";

import { MEASURE_LABELS } from "../labels";
import { balanceText, formatHours } from "../helpers";
import type { ProvisionBalance } from "../types";

import { MutedNote } from "./form-fields";

// Η κάρτα Παροχής: πόσες δόθηκαν, μεταφέρθηκαν, καταναλώθηκαν και δεσμεύτηκαν στην Περίοδο, και το υπόλοιπο. Χωρίς ποσά.
export function ProvisionCard({
  provision,
}: {
  provision: ProvisionBalance | null;
}) {
  return (
    <Panel label="Παροχή">
      {provision === null ? (
        <MutedNote>
          Αυτό το Γύρισμα δεν μετράει Παροχή (έξτρα ή εσωτερικό).
        </MutedNote>
      ) : (
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Είδος</dt>
          <dd className="m-0">
            {provision.kind.label} ({MEASURE_LABELS[provision.kind.measure]})
          </dd>
          <dt className="text-muted-foreground">Δόθηκαν</dt>
          <dd className="m-0">{formatHours(provision.given)}</dd>
          <dt className="text-muted-foreground">Μεταφέρθηκαν</dt>
          <dd className="m-0">{formatHours(provision.carried)}</dd>
          <dt className="text-muted-foreground">Καταναλώθηκαν</dt>
          <dd className="m-0">{formatHours(provision.used)}</dd>
          <dt className="text-muted-foreground">Δεσμευμένα</dt>
          <dd className="m-0">{formatHours(provision.reserved)}</dd>
          <dt className="text-muted-foreground">Υπόλοιπο</dt>
          <dd className="m-0 font-medium">{balanceText(provision.balance)}</dd>
        </dl>
      )}
    </Panel>
  );
}
