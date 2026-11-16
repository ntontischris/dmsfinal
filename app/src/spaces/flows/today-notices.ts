// Οι Ειδοποιήσεις που ζητούν κίνηση ως γραμμές της λίστας (καθαρό αρχείο). «Ζητά κίνηση» = ο τύπος του Γεγονότος
// είναι στη σταθερή λίστα NOTICE_AREA· οι υπόλοιπες είναι μόνο ενημέρωση («Ενημερώσεις (N) →»). Ένα γεγονός = μία
// γραμμή: ό,τι έχει ήδη γραμμή από κάρτα ή οδηγό δεν ξαναμπαίνει, και πολλές Ειδοποιήσεις για το ίδιο πράγμα γίνονται μία.

import { z } from "zod";

import { agoText } from "./athens-time";
import type { Area, QueueRow } from "./queue-rows";

// Οι τύποι που ζητούν κίνηση και ο Χώρος τους. Λείπουν σκόπιμα όσα μετρά ήδη οδηγός: Μηνύματα και Αιτήματα
// (Απαντώ σε Πελάτες), νέο Γύρισμα και αναμονή έγκρισης (Αιτήματα γυρίσματος), διαγραφή από το Google.
const NOTICE_AREA: Readonly<Record<string, Area>> = {
  "opportunity.form_submitted": "Πελάτες",
  "opportunity.next_step_due": "Πελάτες",
  "proposal.approval_requested": "Πελάτες",
  "proposal.changes_requested": "Πελάτες",
  "proposal.declined": "Πελάτες",
  "proposal.link_expiring": "Πελάτες",
  "proposal.expired": "Πελάτες",
  "agreement.expiring": "Πελάτες",
  "filming.cancel_requested": "Παραγωγή",
  "filming.crew_declined": "Παραγωγή",
  "filming.crew_vacated": "Παραγωγή",
  "filming.not_done": "Παραγωγή",
  "filming.google_move_rejected": "Παραγωγή",
  "deliverable.assigned": "Παραγωγή",
  "deliverable.client_answered": "Παραγωγή",
  "deliverable.client_commented": "Παραγωγή",
  "deliverable.review_pending": "Παραγωγή",
  "deliverable.review_returned": "Παραγωγή",
  "deliverable.limit_exceeded": "Παραγωγή",
  "deliverable.change_requested": "Παραγωγή",
  "deliverable.link_broken": "Παραγωγή",
  "deliverable.deadline": "Παραγωγή",
  "deliverable.client_waiting": "Παραγωγή",
  "billable.created": "Χρήματα",
  "billable.open_waiting": "Χρήματα",
  "invoice.overdue": "Χρήματα",
  "production.cost_overrun": "Χρήματα",
  "production.delivered_without_hours": "Χρήματα",
  "health.job_missed": "Εταιρεία",
  "health.send_failed": "Εταιρεία",
  "health.google_stopped": "Εταιρεία",
  "health.event_stuck": "Εταιρεία",
  "assistant.cap_reached": "Εταιρεία",
};

export const isActionType = (type: string | null | undefined): boolean =>
  type !== null && type !== undefined && type in NOTICE_AREA;

// Το JSON του notifications_list· το `type` υπάρχει μόνο αφού περάσει το migration 20261115130000.
const noticeSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  link: z.string().nullable(),
  createdAt: z.string(),
  type: z.string().nullable().optional(),
});

export type Notice = z.infer<typeof noticeSchema>;

// Άγνωστο σχήμα: καμία γραμμή Ειδοποίησης (η λίστα συνεχίζει χωρίς αυτές).
export const parseNotices = (data: unknown): Notice[] => {
  const parsed = z.object({ items: z.array(noticeSchema) }).safeParse(data);
  if (!parsed.success) console.error("flows.notices:", parsed.error.message);
  return parsed.success ? parsed.data.items : [];
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const INTERNAL = /^\/app(\/|\?|$)/;

const pathOf = (href: string): string => href.split(/[?#]/)[0];

const linkOf = (notice: Notice): string | null =>
  notice.link && INTERNAL.test(notice.link) ? notice.link : null;

// Το ίδιο πράγμα έχει ήδη γραμμή: ίδια σελίδα, ή το ίδιο id σε κλειδί ή διεύθυνση γραμμής.
const isTaken = (link: string | null, taken: readonly QueueRow[]): boolean => {
  if (!link) return false;
  const ids = link.match(UUID) ?? [];
  return taken.some(
    (row) =>
      pathOf(row.href) === pathOf(link) ||
      ids.some((id) => row.key.includes(id) || row.href.includes(id)),
  );
};

interface Group {
  key: string;
  link: string | null;
  area: Area;
  items: Notice[];
}

const groupOf = (notice: Notice, link: string | null): string =>
  link ?? `${notice.type}:${notice.id}`;

const rowOf = (group: Group, now: number): QueueRow => {
  // Νεότερη πρώτη από τη βάση: ο τίτλος της τελευταίας, ο χρόνος της πρώτης.
  const [newest] = group.items;
  const since = Date.parse(group.items[group.items.length - 1].createdAt);
  const more = group.items.length > 1 ? ` (${group.items.length})` : "";
  return {
    key: `notice:${group.key.slice(0, 190)}`,
    title: `${newest.title}${more} · ${agoText(since, now)}`,
    sub: "Ειδοποίηση",
    area: group.area,
    href: group.link ?? "/app/notifications",
    since,
    hasSince: true,
    amountCents: null,
    isNew: false,
    parked: null,
    noticeIds: group.items.map((item) => item.id),
  };
};

// Οι αδιάβαστες Ειδοποιήσεις που ζητούν κίνηση, ως γραμμές· `taken` = οι γραμμές των καρτών και των οδηγών.
export const noticeRowsOf = (
  notices: readonly Notice[],
  taken: readonly QueueRow[],
  now: number,
): QueueRow[] => {
  const groups = new Map<string, Group>();
  notices
    .filter((notice) => isActionType(notice.type))
    .forEach((notice) => {
      const link = linkOf(notice);
      if (isTaken(link, taken)) return;
      const key = groupOf(notice, link);
      const group = groups.get(key);
      groups.set(key, {
        key,
        link,
        area: NOTICE_AREA[notice.type ?? ""],
        items: [...(group?.items ?? []), notice],
      });
    });
  return [...groups.values()].map((group) => rowOf(group, now));
};
