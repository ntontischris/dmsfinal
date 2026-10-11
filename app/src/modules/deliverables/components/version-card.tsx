import { Badge, type Tone } from "@/components/ui/badge";

import { formatDateTime } from "../helpers";
import { VERSION_STATE_LABELS } from "../labels";
import type { DeliverableVersion, VersionState } from "../types";

import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";

const versionTone = (state: VersionState): Tone | undefined => {
  if (state === "approved") return "ok";
  if (state === "changes_requested") return "attention";
  return undefined;
};

interface VersionCardProps {
  version: DeliverableVersion;
  deliverableId: string;
  canComment: boolean;
}

// Μία Έκδοση: link (σε νέα καρτέλα), κατάσταση, ιστορικό της απάντησης, και τα σχόλιά της.
export function VersionCard({ version, deliverableId, canComment }: VersionCardProps) {
  return (
    <article className="grid gap-3 border-b pb-5 last:border-0 last:pb-0">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-base font-semibold">Έκδοση {version.number}</h3>
        <Badge tone={versionTone(version.state)}>{VERSION_STATE_LABELS[version.state]}</Badge>
        {version.linkBroken && <Badge tone="attention">Το link δεν ανοίγει</Badge>}
      </header>
      <VersionFacts version={version} />
      <CommentList comments={version.comments} />
      {canComment && <CommentForm deliverableId={deliverableId} versionNumber={version.number} />}
    </article>
  );
}

function VersionFacts({ version }: { version: DeliverableVersion }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Link</dt>
      <dd className="m-0 break-all">
        <a href={version.url} target="_blank" rel="noopener noreferrer">
          {version.url}
        </a>{" "}
        <Badge>{version.host}</Badge>
      </dd>
      <dt className="text-muted-foreground">Προστέθηκε</dt>
      <dd className="m-0">{formatDateTime(version.createdAt)}</dd>
      {version.note && (
        <>
          <dt className="text-muted-foreground">Σημείωση</dt>
          <dd className="m-0">{version.note}</dd>
        </>
      )}
      {version.reviewNote && (
        <>
          <dt className="text-muted-foreground">Επιστροφή από έλεγχο</dt>
          <dd className="m-0">{version.reviewNote}</dd>
        </>
      )}
      {version.sentAt && (
        <>
          <dt className="text-muted-foreground">Στάλθηκε στον πελάτη</dt>
          <dd className="m-0">{formatDateTime(version.sentAt)}</dd>
        </>
      )}
      {version.answeredAt && (
        <>
          <dt className="text-muted-foreground">Απάντηση πελάτη</dt>
          <dd className="m-0">
            {formatDateTime(version.answeredAt)}
            {version.answerNote ? `: ${version.answerNote}` : ""}
          </dd>
        </>
      )}
    </dl>
  );
}
