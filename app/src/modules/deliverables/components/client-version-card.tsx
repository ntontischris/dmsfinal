import { formatTimecode } from "../timecode";
import type { ClientComment, ClientVersion } from "../client-types";
import { formatDateTime } from "../helpers";
import { answeredText } from "../client-helpers";
import { LINK_REPORTED_NOTE } from "../client-labels";

import { ClientCommentForm } from "./client-comment-form";
import { ClientReportButton } from "./client-report-button";
import { MutedNote } from "./form-fields";

interface ClientVersionCardProps {
  deliverableId: string;
  version: ClientVersion;
  canReport: boolean;
  canComment: boolean;
}

// Μία σταλμένη Έκδοση: link σε νέα καρτέλα, απάντηση, «Το link δεν ανοίγει» και σχόλια.
export function ClientVersionCard({ deliverableId, version, canReport, canComment }: ClientVersionCardProps) {
  return (
    <article className="grid gap-3 rounded-sm border p-4 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold">Έκδοση {version.number}</h3>
        <span className="text-muted-foreground">{formatDateTime(version.sentAt)}</span>
      </header>
      <a href={version.url} target="_blank" rel="noopener noreferrer" className="font-medium">
        Άνοιγμα ({version.host})
      </a>
      {version.answeredByName && version.answeredAt && (
        <p className="m-0">
          {answeredText(version.answeredByName)}
          {version.answerNote && <span className="text-muted-foreground"> «{version.answerNote}»</span>}
        </p>
      )}
      {version.linkBroken ? (
        <MutedNote>{LINK_REPORTED_NOTE}</MutedNote>
      ) : (
        canReport && <ClientReportButton deliverableId={deliverableId} versionNumber={version.number} />
      )}
      <CommentList comments={version.comments} />
      {canComment && <ClientCommentForm deliverableId={deliverableId} versionNumber={version.number} />}
    </article>
  );
}

function CommentList({ comments }: { comments: readonly ClientComment[] }) {
  if (comments.length === 0) return null;
  return (
    <ul className="m-0 grid list-none gap-2 border-t pt-3 p-0">
      {comments.map((comment) => (
        <li key={comment.id} className="grid gap-0.5">
          <span className="text-muted-foreground">
            {comment.authorName ?? "Ομάδα"}
            {comment.atSeconds !== null && ` · ${formatTimecode(comment.atSeconds)}`}
          </span>
          <span>{comment.body}</span>
        </li>
      ))}
    </ul>
  );
}
