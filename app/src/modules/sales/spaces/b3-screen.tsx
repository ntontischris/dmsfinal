import { getViewer } from "@/modules/access";
import { agreementCaps, listAgreements } from "@/modules/agreements";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { athensToday, salesCaps } from "../helpers";
import { listSalesLists } from "../queries-lists";
import { listPipeline } from "../queries-opportunities";
import { listClientLastContacts } from "../queries-overview";
import type { Opportunity, SalesCaps } from "../types";
import { boardCardsOf } from "./b3-adapter";
import { PipelineBoard } from "./b3-board";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

const labelsOf = (
  items: readonly { id: string; label: string }[],
): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

// Ο Υπεύθυνος της Ευκαιρίας και όποιος διαχειρίζεται όλους τους Πελάτες τη δουλεύουν· οι υπόλοιποι τη βλέπουν μόνο.
const canWorkOn = (caps: SalesCaps, o: Opportunity): boolean =>
  caps.manageScope === "all" ||
  (caps.userId !== null && o.managerId === caps.userId);

// B3 Pipeline στη νέα εμφάνιση (prototype `screens/B3.tsx`): Στήλες ανά Στάδιο, φίλτρα και κλεισμένες. Ποσό από τη
// Συμφωνία της Ευκαιρίας (μόνο όταν η βάση το δίνει), τελευταία επαφή από την ελαφριά ανάγνωση sales_client_last_contacts.
export async function SpacesPipeline() {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canManage)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση στο Pipeline">
          Το Pipeline το βλέπει όποιος «Διαχειρίζεται Πελάτες και Ευκαιρίες».
        </StateNotice>
      </Frame>
    );
  const [pipeline, lists, agreements] = await Promise.all([
    listPipeline(),
    listSalesLists(),
    agreementCaps(viewer).canView ? listAgreements() : null,
  ]);
  if (!pipeline.ok || !lists.ok)
    return (
      <Frame>
        <ErrorNotice what="το Pipeline Ευκαιριών" />
      </Frame>
    );
  const all = [...pipeline.data.open, ...pipeline.data.closed];
  const lastContacts = await listClientLastContacts([
    ...new Set(all.map((o) => o.clientId)),
  ]);
  const today = athensToday();
  const cards = boardCardsOf({
    opportunities: all,
    sourceLabels: labelsOf(lists.data.sources),
    lossLabels: labelsOf(lists.data.lossReasons),
    agreements: agreements?.ok ? agreements.data : [],
    lastContacts: lastContacts.ok ? lastContacts.data : {},
    canWork: (o) => canWorkOn(caps, o),
    today,
  });
  return (
    <Frame>
      {caps.manageScope === "mine" && (
        <p className="muted">
          Βλέπεις τις Ευκαιρίες σου και όσες αφορούν τους Πελάτες σου.
        </p>
      )}
      {cards.length === 0 ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ανοιχτές Ευκαιρίες">
          <p>
            Μια Ευκαιρία γεννιέται από τη φόρμα της Ιστοσελίδας ή όταν την
            καταχωρείς εσύ.
          </p>
        </StateNotice>
      ) : (
        <PipelineBoard
          today={today}
          cards={cards}
          stages={lists.data.stages}
          lossReasons={lists.data.lossReasons}
        />
      )}
    </Frame>
  );
}
