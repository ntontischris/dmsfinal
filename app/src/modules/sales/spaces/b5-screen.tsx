import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { formatDate, salesCaps } from "../helpers";
import { listSalesLists } from "../queries-lists";
import {
  listAccessRequests,
  listAssignableUsers,
  listQueue,
} from "../queries-queue";
import { AccessRequests, UnassignedQueue } from "./b5-queue";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

// B5 Χωρίς υπεύθυνο στη νέα εμφάνιση (prototype `screens/B5.tsx`): η ουρά της φόρμας και τα Αιτήματα πρόσβασης.
export async function SpacesUnassigned() {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canTransfer)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση">
          <p>
            Την ουρά «Χωρίς υπεύθυνο» τη βλέπει όποιος «Μεταβιβάζει Υπεύθυνο».
          </p>
        </StateNotice>
      </Frame>
    );
  const [queue, requests, assignable, lists] = await Promise.all([
    listQueue(),
    listAccessRequests(),
    listAssignableUsers(),
    listSalesLists(),
  ]);
  if (!queue.ok || !requests.ok || !assignable.ok || !lists.ok)
    return (
      <Frame>
        <ErrorNotice what="η ουρά «Χωρίς υπεύθυνο»" />
      </Frame>
    );
  const sourceOf = (id: string): string =>
    lists.data.sources.find((source) => source.id === id)?.label ?? "—";
  return (
    <Frame>
      <p className="note">
        Πού πάνε οι νέες Ευκαιρίες από τη φόρμα το ορίζεις στις{" "}
        {caps.canManageSettings ? (
          <Link href={hrefOf("O2")}>Ρυθμίσεις › Πωλήσεις</Link>
        ) : (
          "Ρυθμίσεις › Πωλήσεις"
        )}
        . Όσοι αναθέτουν ειδοποιούνται για κάθε νέα Ευκαιρία από φόρμα· αυτόματη
        μοιρασιά σε πωλητές δεν υπάρχει.
      </p>
      {queue.data.length === 0 && requests.data.length === 0 ? (
        <StateNotice kind="empty" title="Δεν υπάρχει τίποτα σε αναμονή">
          <p>
            Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο και δεν υπάρχουν
            Αιτήματα πρόσβασης.
          </p>
        </StateNotice>
      ) : (
        <>
          <h2>Χωρίς υπεύθυνο</h2>
          <UnassignedQueue
            assignable={assignable.data}
            items={queue.data.map((item) => ({
              id: item.opportunityId,
              href: hrefOf("B4", { id: item.opportunityId }),
              title: item.title,
              clientName: item.clientName,
              source: sourceOf(item.sourceId),
              received: formatDate(item.createdAt),
              isNewClient: item.isNewClient,
              isPossibleDuplicate: item.isPossibleDuplicate,
            }))}
          />
          <h2>Αιτήματα πρόσβασης</h2>
          <p className="muted">
            Ένας Πελάτης έχει έναν πωλητή. Εδώ αποφασίζεις αν άλλος πωλητής
            ανοίγει Ευκαιρία σε Πελάτη που δεν είναι δικός του.
          </p>
          <AccessRequests
            canTransfer={caps.canTransfer}
            items={requests.data.map((request) => ({
              id: request.id,
              clientId: request.clientId,
              requesterId: request.requesterId,
              requester: request.requesterName,
              client: request.clientName,
              currentOwner: request.clientManagerName,
              topic: request.topic,
              comment: request.comment,
              date: formatDate(request.createdAt),
            }))}
          />
        </>
      )}
    </Frame>
  );
}
