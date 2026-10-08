import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { describeDeviation } from "../helpers";
import { DEVIATION_STATUS_LABELS } from "../labels";
import type { AgreementDetail, Deviation } from "../types";

import { MutedNote } from "./terms-section-parts";

// Σε ποια αναθεώρηση εγκρίθηκε η Παρέκκλιση: η πιο πρόσφατη εγκεκριμένη.
const approvedRevision = (agreement: AgreementDetail): number | null => {
  const approved = agreement.revisions.filter(
    (revision) => revision.approval?.state === "approved",
  );
  return approved.length === 0
    ? null
    : Math.max(...approved.map((revision) => revision.number));
};

function StatusBadge({
  deviation,
  approvedIn,
}: {
  deviation: Deviation;
  approvedIn: number | null;
}) {
  if (deviation.status !== "covered")
    return (
      <Badge tone="attention">
        {DEVIATION_STATUS_LABELS[deviation.status]}
      </Badge>
    );
  return (
    <Badge>
      {approvedIn === null
        ? DEVIATION_STATUS_LABELS.covered
        : `${DEVIATION_STATUS_LABELS.covered} στην αναθεώρηση ${approvedIn}`}
    </Badge>
  );
}

// Οι Παρεκκλίσεις από τον Κατάλογο και τις προεπιλογές, με το αν έχουν Έγκριση. Η βάση τις δίνει μόνο σε όποιον τις δικαιούται να τις δει.
export function DeviationsSection({
  agreement,
}: {
  agreement: AgreementDetail;
}) {
  const { deviations, can, needsApproval } = agreement;
  if (deviations.length === 0 && !can.edit) return null;
  const approvedIn = approvedRevision(agreement);
  return (
    <Panel label="Παρεκκλίσεις">
      <div className="grid gap-3">
        {deviations.length === 0 ? (
          <MutedNote>Καμία Παρέκκλιση.</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {deviations.map((deviation) => (
              <li
                key={deviation.key}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>{describeDeviation(deviation, can.seeAmounts)}</span>
                <StatusBadge deviation={deviation} approvedIn={approvedIn} />
              </li>
            ))}
          </ul>
        )}
        {needsApproval && <MutedNote>Θέλει Έγκριση πριν σταλεί.</MutedNote>}
      </div>
    </Panel>
  );
}
