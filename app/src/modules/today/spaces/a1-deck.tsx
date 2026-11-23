import Link from "next/link";

import "../../finance/spaces/money-deck.css";
import "./a1-deck.css";
import { facesOf, isUrgentGroup } from "./a1-deck-model";
import { countedOf, type ListGroup } from "./a1-list";

// Οι ομάδες της Σήμερα ως κάρτες-κάδρα, όπως τα «Χρήματα»: διαλέγεις κάρτα, η λίστα της ανοίγει από κάτω (?g=).

const TONE_OF: Readonly<Partial<Record<ListGroup["id"], string>>> = {
  time: "yellow",
  company: "text",
};

const HINT_OF: Readonly<Record<ListGroup["id"], string>> = {
  time: "γυρίσματα σήμερα και αύριο",
  client: "απάντησε, ενέκρινε, δες",
  mine: "εργασίες και παραδοτέα",
  externals: "συνεργάτες και εκκρεμότητες",
  money: "τιμολόγησε, κυνήγησε",
  keep: "επόμενα βήματα και Συμφωνίες",
  company: "ό,τι δεν λειτουργεί",
};

function GroupReel({
  group,
  index,
  isActive,
}: {
  group: ListGroup;
  index: number;
  isActive: boolean;
}) {
  const isUrgent = isUrgentGroup(group);
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
        <span>{String(index + 1).padStart(2, "0")}</span>
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
        <small>{HINT_OF[group.id]}</small>
      </span>
    </Link>
  );
}

export function TodayDeck({
  groups,
  activeId,
}: {
  groups: readonly ListGroup[];
  activeId: string | null;
}) {
  return (
    <>
      <div className="ml-head">
        <p>Διάλεξε κάρτα. Ό,τι καίει, βγαίνει πρώτο μέσα της.</p>
      </div>
      <nav className="money-deck today-deck" aria-label="Οι ομάδες της Σήμερα">
        {groups.map((group, index) => (
          <GroupReel
            key={group.id}
            group={group}
            index={index}
            isActive={group.id === activeId}
          />
        ))}
      </nav>
    </>
  );
}
