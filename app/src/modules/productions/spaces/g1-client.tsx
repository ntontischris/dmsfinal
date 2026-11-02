import type { ClientProgress } from "@/modules/deliverables";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, Meter, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { NO_OWNER_LABEL } from "../labels";
import type { ProductionCard } from "../types";
import { clientGroupsOf, clientStateLabel } from "./g1-client-model";

// G1 στην όψη πελάτη (prototype `screens/g1-client.tsx`): κάρτες ανά Περίοδο με την πρόοδο των Παραδοτέων.

const NO_PROGRESS: ClientProgress = {
  total: 0,
  approved: 0,
  waitingClient: 0,
  inWork: 0,
};

function ClientCard({
  card,
  progress,
  nextFilming,
}: {
  card: ProductionCard;
  progress: ClientProgress;
  nextFilming: string | undefined;
}) {
  const total = progress.approved + progress.waitingClient + progress.inWork;
  return (
    <>
      <ListRow
        lead={
          <span className="part-tile" aria-hidden="true">
            {initialsOf(card.title)}
          </span>
        }
        href={hrefOf("G2", { id: card.id })}
        title={card.title}
        sub={clientStateLabel(card)}
        aside={
          <>
            {progress.waitingClient > 0 && (
              <Badge tone="waiting">
                περιμένουν εσένα {progress.waitingClient}
              </Badge>
            )}
            <Badge tone="ok">εγκρίθηκαν {progress.approved}</Badge>
            <Badge>σε εργασία {progress.inWork}</Badge>
          </>
        }
      />
      <li className="sx-extra">
        {total > 0 && <Meter used={progress.approved} total={total} />}
        <span>Επόμενο Γύρισμα: {nextFilming ? fmtDate(nextFilming) : "—"}</span>
        <span className="muted">
          Υπεύθυνος: {card.owner?.name ?? NO_OWNER_LABEL}
        </span>
      </li>
    </>
  );
}

export function G1ClientCards({
  cards,
  progress,
  nextFilming,
}: {
  cards: readonly ProductionCard[];
  progress: ReadonlyMap<string, ClientProgress>;
  // Παραγωγή → ημέρα (YYYY-MM-DD, Αθήνα) του επόμενου Γυρίσματος.
  nextFilming: ReadonlyMap<string, string>;
}) {
  return (
    <>
      {clientGroupsOf(cards).map((group) => (
        <Panel key={group.label} label={group.label} isFlush>
          <RowList>
            {group.cards.map((card) => (
              <ClientCard
                key={card.id}
                card={card}
                progress={progress.get(card.id) ?? NO_PROGRESS}
                nextFilming={nextFilming.get(card.id)}
              />
            ))}
          </RowList>
        </Panel>
      ))}
    </>
  );
}
