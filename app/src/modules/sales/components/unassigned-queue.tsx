import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Rows, type RowItem } from "@/components/ui/rows";

import { assignOpportunity } from "../actions-queue";
import { formatDate } from "../helpers";
import type { AssignableUser, ListItem, QueueItem } from "../types";

import { ActionForm } from "./action-form";

interface UnassignedQueueProps {
  items: readonly QueueItem[];
  assignable: readonly AssignableUser[];
  sources: readonly ListItem[];
}

function AssignForm({
  item,
  assignable,
}: {
  item: QueueItem;
  assignable: readonly AssignableUser[];
}) {
  if (assignable.length === 0)
    return (
      <span className="text-sm text-muted-foreground">
        Δεν υπάρχει πωλητής να την αναλάβει.
      </span>
    );
  return (
    <ActionForm
      action={assignOpportunity}
      submitLabel="Ανάθεση"
      pendingLabel="Ανάθεση…"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="opportunityId" value={item.opportunityId} />
      <Select
        name="userId"
        required
        defaultValue=""
        aria-label={`Νέος Υπεύθυνος: ${item.title}`}
      >
        <option value="" disabled>
          Διάλεξε Υπεύθυνο
        </option>
        {assignable.map((user) => (
          <option key={user.userId} value={user.userId}>
            {user.name}
          </option>
        ))}
      </Select>
    </ActionForm>
  );
}

const toRow = (
  item: QueueItem,
  assignable: readonly AssignableUser[],
  sources: readonly ListItem[],
): RowItem => ({
  id: item.opportunityId,
  title: item.title,
  href: `/app/pipeline/${item.opportunityId}`,
  meta: (
    <span className="flex flex-wrap items-center gap-2">
      <Link href={`/app/clients/${item.clientId}`}>{item.clientName}</Link>
      <Badge>
        Πηγή: {sources.find((s) => s.id === item.sourceId)?.label ?? "—"}
      </Badge>
      {item.isNewClient && <Badge>Νέος Πελάτης</Badge>}
      {item.isPossibleDuplicate && <Badge tone="attention">Πιθανό διπλό</Badge>}
      <span>{formatDate(item.createdAt)}</span>
    </span>
  ),
  aside: <AssignForm item={item} assignable={assignable} />,
});

// Η ουρά «Χωρίς υπεύθυνο» (B5): Ευκαιρίες που περιμένουν να τις αναλάβει κάποιος. Όποιος ορίζεται Υπεύθυνος παίρνει και τον Πελάτη.
export function UnassignedQueue({
  items,
  assignable,
  sources,
}: UnassignedQueueProps) {
  if (items.length === 0)
    return (
      <Notice kind="empty" title="Η ουρά είναι άδεια">
        <p className="m-0">Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο.</p>
      </Notice>
    );
  return <Rows items={items.map((item) => toRow(item, assignable, sources))} />;
}
