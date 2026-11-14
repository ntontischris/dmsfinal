import { Panel } from "@/spaces/kit/panel";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import { formatDate, formatDateTime } from "../helpers";
import type {
  AgreementDetail,
  ApprovalState,
  KindInfo,
  SignatureInfo,
} from "../types";
import { ItemRows } from "./lane-rows";

// Αιτήματα αλλαγών, Αναθεωρήσεις και Υπογραφή (prototype `screens/d2-history.tsx`), από την πραγματική Συμφωνία.

const APPROVAL_TEXT: Readonly<Record<ApprovalState, string>> = {
  pending: "αναμένει",
  approved: "εγκρίθηκε",
  rejected: "απορρίφθηκε",
  withdrawn: "αποσύρθηκε",
};
const APPROVAL_TONE: Readonly<Record<ApprovalState, BadgeTone>> = {
  pending: "waiting",
  approved: "strong",
  rejected: "attention",
  withdrawn: "faded",
};

export function ChangeRequestsSection({
  agreement,
}: {
  agreement: AgreementDetail;
}) {
  const { changeRequests: requests, revision } = agreement;
  return (
    <Panel label="Αιτήματα αλλαγών από τον πελάτη">
      {requests.length === 0 ? (
        <p className="muted">Κανένα αίτημα αλλαγών.</p>
      ) : (
        <ItemRows
          items={requests.map((request) => ({
            id: request.id,
            isHighlighted: request.revision === revision,
            title: request.fromName,
            sub: (
              <>
                {formatDateTime(request.createdAt)} · αναθεώρηση{" "}
                {request.revision}
                <br />
                <span className="d2-message">{request.message}</span>
              </>
            ),
            aside:
              request.revision === revision ? (
                <Badge tone="attention">τρέχουσα αναθεώρηση</Badge>
              ) : undefined,
          }))}
        />
      )}
      <p className="muted">Νέα αναθεώρηση τα καθαρίζει από τη μέτρηση.</p>
    </Panel>
  );
}

export function RevisionsSection({
  agreement,
}: {
  agreement: AgreementDetail;
}) {
  if (agreement.revisions.length === 0) return null;
  const newestFirst = [...agreement.revisions].sort(
    (a, b) => b.number - a.number,
  );
  return (
    <Panel label="Αναθεωρήσεις">
      <ItemRows
        items={newestFirst.map((revision) => {
          const { approval } = revision;
          const by = approval?.decidedByName ?? approval?.requestedByName;
          const at = approval?.decidedAt ?? approval?.requestedAt;
          return {
            id: String(revision.number),
            lead: <span className="d2-version">v{revision.number}</span>,
            title: revision.summary || `Αναθεώρηση ${revision.number}`,
            sub: (
              <>
                Αναθεώρηση {revision.number} · {formatDate(revision.createdAt)}
                {revision.createdByName && ` · ${revision.createdByName}`}
                {approval?.comment && (
                  <>
                    <br />«{approval.comment}»
                  </>
                )}
              </>
            ),
            aside: approval ? (
              <>
                {by && (
                  <span className="part-sub">
                    {by}
                    {at && `, ${formatDate(at)}`}
                  </span>
                )}
                <Badge tone={APPROVAL_TONE[approval.state]}>
                  Έγκριση: {APPROVAL_TEXT[approval.state]}
                </Badge>
              </>
            ) : undefined,
          };
        })}
      />
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
  return `με Σύνδεσμο πρότασης${delivery}`;
};

const usedText = (
  signature: SignatureInfo,
  kinds: readonly KindInfo[],
): string | null =>
  signature.usedProvisions === null || signature.usedProvisions.length === 0
    ? null
    : signature.usedProvisions
        .map(
          (u) =>
            `${kinds.find((k) => k.id === u.kindId)?.unit ?? "—"}: ${u.used}`,
        )
        .join(", ");

export function SignatureSection({
  agreement,
  kinds,
  canDownload,
}: {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  // Το PDF έχει τιμές: μόνο με «Βλέπει ποσά».
  canDownload: boolean;
}) {
  const { signature } = agreement;
  if (signature === null) return null;
  const used = usedText(signature, kinds);
  return (
    <Panel label="Υπογραφή">
      <p>
        Υπέγραψε {signature.signedName} στις {formatDate(signature.signedOn)}{" "}
        {channelText(signature)}
      </p>
      <dl className="dl">
        {signature.ip && (
          <>
            <dt>IP</dt>
            <dd>{signature.ip}</dd>
          </>
        )}
        <dt>Αποτύπωμα εγγράφου</dt>
        <dd className="muted">{signature.documentHash.slice(0, 12)}…</dd>
        {used && (
          <>
            <dt>Έχουν ήδη καταναλωθεί</dt>
            <dd>{used}</dd>
          </>
        )}
        {signature.monthInvoiced === true && (
          <>
            <dt>Τιμολόγηση</dt>
            <dd>Ο μήνας τιμολογήθηκε ήδη εκτός συστήματος.</dd>
          </>
        )}
      </dl>
      {canDownload && (
        <p>
          <a href={`/app/agreements/${agreement.id}/pdf`}>Λήψη PDF</a>
        </p>
      )}
    </Panel>
  );
}
