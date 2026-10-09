import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { formatDate, formatDateTime } from "../helpers";
import type {
  AgreementDetail,
  ApprovalState,
  ChangeRequest,
  KindInfo,
  RevisionEntry,
  SignatureInfo,
} from "../types";

import { MutedNote } from "./terms-section-parts";

interface HistorySectionsProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  isInternal: boolean; // οι αιτήσεις αλλαγών και οι Εγκρίσεις φαίνονται μόνο στους εσωτερικούς θεατές
}

const APPROVAL_TEXT: Readonly<Record<ApprovalState, string>> = {
  pending: "Αναμένει Έγκριση",
  approved: "Εγκρίθηκε",
  rejected: "Απορρίφθηκε",
  withdrawn: "Το αίτημα αποσύρθηκε",
};

function ChangeRequests({
  requests,
  currentRevision,
}: {
  requests: readonly ChangeRequest[];
  currentRevision: number;
}) {
  return (
    <Panel label="Αιτήματα αλλαγών από τον πελάτη">
      <div className="grid gap-3">
        {requests.length === 0 ? (
          <MutedNote>Κανένα αίτημα αλλαγών.</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {requests.map((request) => (
              <li key={request.id} className="grid gap-1 rounded-sm border p-3">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-medium">
                  {request.fromName}
                  <span className="font-normal text-muted-foreground">
                    {formatDateTime(request.createdAt)} · αναθεώρηση{" "}
                    {request.revision}
                  </span>
                  {request.revision === currentRevision && (
                    <Badge tone="attention">τρέχουσα αναθεώρηση</Badge>
                  )}
                </p>
                <p className="m-0 whitespace-pre-wrap text-sm">
                  {request.message}
                </p>
              </li>
            ))}
          </ul>
        )}
        <MutedNote>Νέα αναθεώρηση τα καθαρίζει από τη μέτρηση.</MutedNote>
      </div>
    </Panel>
  );
}

function ApprovalLine({ revision }: { revision: RevisionEntry }) {
  const { approval } = revision;
  if (approval === null) return null;
  const by = approval.decidedByName ?? approval.requestedByName;
  const at = approval.decidedAt ?? approval.requestedAt;
  return (
    <p className="m-0 text-sm text-muted-foreground">
      Έγκριση: {APPROVAL_TEXT[approval.state]}
      {by && ` · ${by}`}
      {at && ` · ${formatDate(at)}`}
      {approval.comment !== "" && ` · «${approval.comment}»`}
    </p>
  );
}

function Revisions({ revisions }: { revisions: readonly RevisionEntry[] }) {
  const newestFirst = [...revisions].sort((a, b) => b.number - a.number);
  return (
    <Panel label="Αναθεωρήσεις">
      <ol className="m-0 grid list-none gap-3 p-0">
        {newestFirst.map((revision) => (
          <li key={revision.number} className="grid gap-1">
            <p className="m-0 text-sm font-medium">
              Αναθεώρηση {revision.number} · {formatDate(revision.createdAt)}
              {revision.createdByName && ` · ${revision.createdByName}`}
            </p>
            {revision.summary !== "" && (
              <p className="m-0 text-sm">{revision.summary}</p>
            )}
            <ApprovalLine revision={revision} />
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const channelText = (signature: SignatureInfo): string => {
  if (signature.method === "outside")
    return `εκτός συστήματος: ${signature.reference ?? "—"}`;
  const delivery =
    signature.otpDelivery === "manual"
      ? " (κωδικός που παραδόθηκε χειροκίνητα)"
      : signature.otpDelivery === "email"
        ? " (κωδικός που στάλθηκε με email)"
        : "";
  return `Σύνδεσμο πρότασης${delivery}`;
};

const usedText = (
  signature: SignatureInfo,
  kinds: readonly KindInfo[],
): string | null => {
  if (
    signature.usedProvisions === null ||
    signature.usedProvisions.length === 0
  )
    return null;
  return signature.usedProvisions
    .map((u) => {
      const kind = kinds.find((k) => k.id === u.kindId);
      return `${kind?.unit ?? "—"}: ${u.used}`;
    })
    .join(", ");
};

function SignaturePanel({
  signature,
  kinds,
}: {
  signature: SignatureInfo;
  kinds: readonly KindInfo[];
}) {
  const used = usedText(signature, kinds);
  return (
    <Panel label="Υπογραφή">
      <div className="grid gap-1 text-sm">
        <p className="m-0">
          Υπέγραψε {signature.signedName} στις {formatDate(signature.signedOn)}{" "}
          {signature.method === "link" ? "με " : ""}
          {channelText(signature)}
        </p>
        {signature.ip && (
          <p className="m-0 text-muted-foreground">IP {signature.ip}</p>
        )}
        <p className="m-0 text-muted-foreground">
          Αποτύπωμα εγγράφου {signature.documentHash.slice(0, 12)}…
        </p>
        {used && (
          <p className="m-0 text-muted-foreground">
            Έχουν ήδη καταναλωθεί: {used}
          </p>
        )}
        {signature.monthInvoiced === true && (
          <p className="m-0 text-muted-foreground">
            Ο μήνας τιμολογήθηκε ήδη εκτός συστήματος.
          </p>
        )}
      </div>
    </Panel>
  );
}

// Ιστορικό: αιτήματα αλλαγών του πελάτη, αναθεωρήσεις με τις Εγκρίσεις τους, και η υπογραφή.
export function HistorySections({
  agreement,
  kinds,
  isInternal,
}: HistorySectionsProps) {
  const { signature } = agreement;
  if (!isInternal && signature === null) return null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {isInternal && (
        <ChangeRequests
          requests={agreement.changeRequests}
          currentRevision={agreement.revision}
        />
      )}
      {isInternal && agreement.revisions.length > 0 && (
        <Revisions revisions={agreement.revisions} />
      )}
      {signature && <SignaturePanel signature={signature} kinds={kinds} />}
    </div>
  );
}
