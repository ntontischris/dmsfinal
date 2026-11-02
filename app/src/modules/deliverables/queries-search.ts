import { getViewer, isClientViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { pickMatches, type RecordHit } from "@/spaces/data/search-records-model";

import { deliverablesCaps } from "./caps";
import { listClientDeliverables } from "./client-queries";
import { queueViewsOf } from "./helpers";
import { listDeliverableQueue } from "./queries";
import type { ReadResult } from "./read";

// Αναζήτηση Παραδοτέων (Ctrl+K): ο πίνακας είναι κλειστός, άρα οι ίδιες λίστες με την H1 (ομάδα, όλες οι καρτέλες της)
// ή την H3 (πελάτης). Η βάση αποφασίζει τι βλέπεις· η σελίδα /app/deliverables/<id> ανοίγει τη σωστή όψη.

const uniqueById = <T extends { id: string }>(rows: readonly T[]): T[] =>
  rows.filter((row, index) => rows.findIndex((other) => other.id === row.id) === index);

async function clientCards(): Promise<ReadResult<{ id: string; title: string; sublabel: string }[]>> {
  const found = await listClientDeliverables();
  if (!found.ok) return found;
  const cards = [...found.data.awaitingYou, ...found.data.periods.flatMap((period) => period.deliverables)];
  return { ok: true, data: uniqueById(cards).map((card) => ({ id: card.id, title: card.title, sublabel: card.kind })) };
}

async function teamCards(canReview: boolean): Promise<ReadResult<{ id: string; title: string; sublabel: string }[]>> {
  const lists = await Promise.all(queueViewsOf(canReview).map((view) => listDeliverableQueue(view)));
  if (lists.some((list) => !list.ok)) return { ok: false };
  const cards = lists.flatMap((list) => (list.ok ? list.data : []));
  return {
    ok: true,
    data: uniqueById(cards).map((card) => ({ id: card.id, title: card.title, sublabel: card.client ?? card.production })),
  };
}

export async function searchDeliverables(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const viewer = await getViewer();
  const found = isClientViewer(viewer) ? await clientCards() : await teamCards(deliverablesCaps(viewer).canReview);
  if (!found.ok) return found;
  return {
    ok: true,
    data: pickMatches(found.data, { term, limit, textOf: (card) => `${card.title} ${card.sublabel}` }).map((card) => ({
      id: card.id,
      label: card.title,
      sublabel: card.sublabel,
      href: hrefOf("H2", { id: card.id }),
    })),
  };
}
