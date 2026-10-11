import { attachmentHref } from "../helpers";
import { formatSize } from "../attachment-rules";
import { ATTACH_LIST_LABEL } from "../labels";
import type { MessageAttachment } from "../view-schema";

interface AttachmentListProps {
  attachments: readonly MessageAttachment[];
}

// Τα συνημμένα ενός Μηνύματος στο νήμα: όνομα και μέγεθος, με σύνδεσμο λήψης. Οι εικόνες είναι απλός σύνδεσμος, χωρίς προεπισκόπηση.
// Η λήψη περνά από τη διαδρομή που ελέγχει ορατότητα και κάνει redirect σε προσωρινό σύνδεσμο.
export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  return (
    <ul aria-label={ATTACH_LIST_LABEL} className="m-0 grid list-none gap-1 p-0">
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex flex-wrap items-baseline gap-2 text-sm"
        >
          <a
            href={attachmentHref(attachment.id)}
           
            className="break-all"
          >
            {attachment.name}
          </a>
          <span className="text-muted-foreground">
            {formatSize(attachment.size)}
          </span>
        </li>
      ))}
    </ul>
  );
}
