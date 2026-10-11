import { Badge } from "@/components/ui/badge";

import { formatDateTime } from "../helpers";
import { formatTimecode } from "../timecode";
import type { DeliverableComment } from "../types";

// Τα σχόλια μιας Έκδοσης, με τον χρόνο mm:ss και το σήμα «εσωτερικό».
export function CommentList({ comments }: { comments: readonly DeliverableComment[] }) {
  if (comments.length === 0)
    return <p className="m-0 text-sm text-muted-foreground">Κανένα σχόλιο σε αυτή την Έκδοση.</p>;
  return (
    <ul className="m-0 grid list-none gap-3 p-0 text-sm">
      {comments.map((comment) => (
        <li key={comment.id} className="grid gap-1">
          <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {comment.authorName ?? "—"} · {formatDateTime(comment.createdAt)}
            {comment.atSeconds !== null && <Badge>{formatTimecode(comment.atSeconds)}</Badge>}
            {comment.isInternal && <Badge tone="attention">εσωτερικό</Badge>}
          </span>
          <p className="m-0 whitespace-pre-line">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}
