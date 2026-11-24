import Link from "next/link";
import type { CSSProperties } from "react";

import type { ClientProgress } from "@/modules/deliverables";
import { hrefOf } from "@/spaces/data/screens";
import { fmtDate } from "@/spaces/screens/shared";
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

const percentOf = (part: number, total: number): string =>
  `${total === 0 ? 0 : Math.round((part / total) * 100)}%`;

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
  const meta = [
    `Επόμενο Γύρισμα: ${nextFilming ? fmtDate(nextFilming) : "—"}`,
    `Υπεύθυνος: ${card.owner?.name ?? NO_OWNER_LABEL}`,
  ].join(" · ");
  return (
    <li
      className="ml-line"
      data-urgent={progress.waitingClient > 0 ? "" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(card.title)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">{clientStateLabel(card)}</span>
        <strong>
          <Link href={hrefOf("G2", { id: card.id })}>{card.title}</Link>
        </strong>
        <small>{meta}</small>
        {total > 0 && (
          <span
            className="ml-meter"
            style={
              { "--v": percentOf(progress.approved, total) } as CSSProperties
            }
          >
            <span>Εγκρίθηκαν</span>
            <i>
              <b />
            </i>
            <strong>
              {progress.approved}/{total}
            </strong>
          </span>
        )}
      </span>
      <span className="ml-amount">
        {progress.waitingClient}
        <small>περιμένουν εσένα</small>
      </span>
      <span className="ml-quick">
        <span className="ml-tag">σε εργασία {progress.inWork}</span>
      </span>
    </li>
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
        <section key={group.label} className="g1-group">
          <h2 className="ml-box-title">{group.label}</h2>
          <ul className="ml-list">
            {group.cards.map((card) => (
              <ClientCard
                key={card.id}
                card={card}
                progress={progress.get(card.id) ?? NO_PROGRESS}
                nextFilming={nextFilming.get(card.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
