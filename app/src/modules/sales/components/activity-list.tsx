import Link from "next/link";

import { Notice } from "@/components/ui/notice";

import { describeActivity, formatDateTime } from "../helpers";
import type { ActivityLookups, ActivityRow } from "../types";

interface ActivityListProps {
  items: readonly ActivityRow[];
  lookups: ActivityLookups;
  showOpportunity?: boolean; // στην καρτέλα Πελάτη: από ποια Ευκαιρία προέρχεται κάθε γραμμή
}

// Οι Δραστηριότητες, νεότερες πρώτα (τις φέρνει ταξινομημένες το query). Οι αυτόματες φαίνονται ως «σύστημα».
export function ActivityList({
  items,
  lookups,
  showOpportunity = false,
}: ActivityListProps) {
  if (items.length === 0) {
    return (
      <Notice kind="empty" title="Καμία Δραστηριότητα ακόμα">
        <p className="m-0">
          Οι κλήσεις, τα email και οι αλλαγές Σταδίου θα φαίνονται εδώ.
        </p>
      </Notice>
    );
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {items.map((item) => {
        const { kind, text } = describeActivity(item, lookups);
        return (
          <li
            key={item.id}
            className="grid gap-1 border-b pb-3 last:border-b-0"
          >
            <span className="text-xs text-muted-foreground">
              {formatDateTime(item.occurredAt)} · {kind} ·{" "}
              {item.actorName ?? "Σύστημα"}
            </span>
            <span className="text-sm">{text}</span>
            {showOpportunity && item.opportunityTitle && (
              <Link
                href={`/app/pipeline/${item.opportunityId}`}
                className="text-xs"
              >
                {item.opportunityTitle}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
