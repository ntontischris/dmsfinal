import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { formatDateTime, stateTone } from "../helpers";
import { STATE_LABELS } from "../labels";
import type { ProductionDetail } from "../types";

import { MutedNote } from "./form-fields";
import { CancelForm, DeliverForm, ReopenForm } from "./state-forms";

// Η κατάσταση της Παραγωγής, με τον λόγος της, και οι μεταβάσεις που επιτρέπονται σε αυτόν τον θεατή.
export function StatePanel({ production }: { production: ProductionDetail }) {
  return (
    <Panel label="Κατάσταση">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stateTone(production.state)}>{STATE_LABELS[production.state]}</Badge>
          <StateNote production={production} />
        </div>
        <StateActions production={production} />
      </div>
    </Panel>
  );
}

function StateNote({ production }: { production: ProductionDetail }) {
  if (production.state === "delivered" && production.deliveredAt)
    return (
      <span className="text-sm">
        Παραδόθηκε {formatDateTime(production.deliveredAt)}
        {production.deliveredNote && `: ${production.deliveredNote}`}
      </span>
    );
  if (production.state === "cancelled" && production.cancelledAt)
    return (
      <span className="text-sm">
        Ακυρώθηκε {formatDateTime(production.cancelledAt)}
        {production.cancelledReason && `. Λόγος: ${production.cancelledReason}`}
      </span>
    );
  return null;
}

// Οι ενέργειες έρχονται από τη βάση (viewerCan)· εδώ μόνο εμφανίζονται. Χωρίς ενέργειες, μία σημείωση.
function StateActions({ production }: { production: ProductionDetail }) {
  const { viewerCan, id } = production;
  const hasAction = viewerCan.deliver || viewerCan.cancel || viewerCan.reopen;
  if (!hasAction) return <MutedNote>Μόνο ανάγνωση για σένα.</MutedNote>;
  return (
    <div className="grid gap-6">
      {viewerCan.deliver && <DeliverForm productionId={id} />}
      {viewerCan.reopen && <ReopenForm productionId={id} />}
      {viewerCan.cancel && <CancelForm productionId={id} />}
    </div>
  );
}
