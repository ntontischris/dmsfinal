import Link from "next/link";

import "@/spaces/styles/deck.css";
import "./a1-deck.css";
import { breakdownOf, facesOf, isUrgentGroup } from "./a1-deck-model";
import { countedOf, type ListGroup } from "./a1-list";

// Οι ομάδες της Σήμερα ως κάρτες-κάδρα, όπως τα «Χρήματα»: διαλέγεις κάρτα, η λίστα της ανοίγει από κάτω (?g=).

const TONE_OF: Readonly<Partial<Record<ListGroup["id"], string>>> = {
  time: "yellow",
  company: "text",
};

function GroupReel({
  group,
  isActive,
  decisionIds,
}: {
  group: ListGroup;
  isActive: boolean;
  decisionIds: ReadonlySet<string>;
}) {
  const isUrgent = isUrgentGroup(group, decisionIds);
  return (
    <Link
      className="money-reel"
      href={`/app?g=${group.id}`}
      scroll={false}
      data-tone={TONE_OF[group.id]}
      data-urgent={isUrgent || undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="money-reel-vf" aria-hidden />
      <span className="money-reel-top">
        {isUrgent && <i className="money-rec">ΕΠΕΙΓΕΙ</i>}
      </span>
      <span className="money-reel-count">{countedOf(group)}</span>
      <span className="money-reel-title">{group.title}</span>
      <span className="money-reel-foot">
        <span className="money-faces" aria-hidden>
          {facesOf(group).map((face) => (
            <span key={face}>{face}</span>
          ))}
        </span>
        <small>{breakdownOf(group)}</small>
      </span>
    </Link>
  );
}

export function TodayDeck({
  groups,
  activeId,
  decisionIds,
}: {
  groups: readonly ListGroup[];
  activeId: string | null;
  decisionIds: ReadonlySet<string>;
}) {
  return (
    <>
      <div className="ml-head">
        <p>Διάλεξε κάρτα. Ό,τι καίει, βγαίνει πρώτο μέσα της.</p>
      </div>
      <nav className="money-deck today-deck" aria-label="Οι ομάδες της Σήμερα">
        {groups.map((group) => (
          <GroupReel
            key={group.id}
            group={group}
            isActive={group.id === activeId}
            decisionIds={decisionIds}
          />
        ))}
      </nav>
    </>
  );
}
