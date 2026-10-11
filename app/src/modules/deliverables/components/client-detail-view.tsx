import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { answeredText, roundsText, stateLabel, stateTone } from "../client-helpers";
import { APPROVAL_FINAL_NOTE, IN_PROGRESS_NOTE, REQUEST_PENDING_NOTE } from "../client-labels";
import type { ClientDeliverableDetail } from "../client-types";

import { ClientDecisionForms } from "./client-decision-forms";
import { ClientRequestForm } from "./client-request-form";
import { ClientVersionCard } from "./client-version-card";
import { MutedNote } from "./form-fields";

interface ClientDetailViewProps {
  detail: ClientDeliverableDetail;
}

// H4: ένα Παραδοτέο για τον πελάτη. Μόνο σταλμένες Εκδόσεις· η νεότερη πρώτη.
export function ClientDetailView({ detail }: ClientDetailViewProps) {
  const [latest] = detail.versions;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <StatusPanel detail={detail} />
        <VersionsPanel detail={detail} />
      </div>
      <div className="grid content-start gap-4">
        {detail.can.answer && (
          <Panel label="Η απάντησή σου">
            <ClientDecisionForms
              deliverableId={detail.id}
              overLimit={detail.overLimit}
              roundsUsed={detail.roundsUsed}
            />
          </Panel>
        )}
        {!detail.can.answer && latest?.answeredByName && detail.state !== "awaiting_you" && (
          <Panel label="Απάντηση">
            <MutedNote>{answeredText(latest.answeredByName)}</MutedNote>
          </Panel>
        )}
        <AfterApprovalPanel detail={detail} />
      </div>
    </div>
  );
}

function StatusPanel({ detail }: ClientDetailViewProps) {
  return (
    <Panel label="Κατάσταση">
      <div className="grid gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stateTone(detail.state)}>{stateLabel(detail.state)}</Badge>
          <span className="text-muted-foreground">{detail.kind}</span>
        </div>
        <span>{roundsText(detail.roundsUsed, detail.roundsLimit)}</span>
        {detail.state === "in_progress" && <MutedNote>{IN_PROGRESS_NOTE}</MutedNote>}
      </div>
    </Panel>
  );
}

function VersionsPanel({ detail }: ClientDetailViewProps) {
  const [latest] = detail.versions;
  return (
    <Panel label="Εκδόσεις">
      {detail.versions.length === 0 ? (
        <MutedNote>{IN_PROGRESS_NOTE}</MutedNote>
      ) : (
        <div className="grid gap-4">
          {detail.versions.map((version) => (
            <ClientVersionCard
              key={version.number}
              deliverableId={detail.id}
              version={version}
              canReport={detail.can.reportLink}
              canComment={detail.can.comment && version.number === latest?.number}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function AfterApprovalPanel({ detail }: ClientDetailViewProps) {
  // Τα τελικά αρχεία μένουν ορατά μέχρι τη νέα έγκριση (ξανάνοιγμα δεν τα κρύβει).
  const hasFinal = detail.finalFilesUrl !== null;
  const showsRequest = detail.can.requestChange || detail.openRequest !== null;
  if (!hasFinal && !showsRequest) return null;
  return (
    <Panel label="Μετά την έγκριση">
      <div className="grid gap-4 text-sm">
        {hasFinal && detail.finalFilesUrl && (
          <a href={detail.finalFilesUrl} target="_blank" rel="noopener noreferrer" className="font-medium">
            Τελικά αρχεία
          </a>
        )}
        {detail.openRequest && <MutedNote>{REQUEST_PENDING_NOTE} «{detail.openRequest.body}»</MutedNote>}
        {detail.can.requestChange && <ClientRequestForm deliverableId={detail.id} />}
        {detail.state === "approved" && <MutedNote>{APPROVAL_FINAL_NOTE}</MutedNote>}
      </div>
    </Panel>
  );
}
