"use client";

import { useState, type ReactNode } from "react";

import type { ListItem } from "../types";
import type { BoardCard } from "./b3-adapter";
import { CallList } from "./b3-call-list";
import { useStageDrag } from "./b3-drag";
import { BoardCardLine } from "./b3-card";
import { QUIET_DAYS, cardMatches, type BoardFilter } from "./b3-filters";

import "./b3.css";
import "./b3-lines.css";

interface BoardProps {
  today: string;
  cards: readonly BoardCard[];
  stages: readonly ListItem[];
  lossReasons: readonly ListItem[];
}

const FILTERS: readonly { id: BoardFilter; label: string }[] = [
  { id: "all", label: "Όλες" },
  { id: "week", label: "Επόμενο βήμα αυτή την εβδομάδα" },
  { id: "forgotten", label: "Ξεχασμένες" },
  { id: "quiet", label: `Χωρίς επαφή πάνω από ${QUIET_DAYS} μέρες` },
];

const plural = (n: number, one: string, many: string): string =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

function FilterPills(props: {
  filter: BoardFilter;
  countOf: (id: BoardFilter) => number;
  onPick: (id: BoardFilter) => void;
}) {
  return (
    <div
      className="choice-row ml-quick"
      role="group"
      aria-label="Ποιες Ευκαιρίες"
    >
      {FILTERS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={props.filter === item.id}
          onClick={() => props.onPick(item.id)}
        >
          {item.label}
          {item.id !== "all" && ` (${props.countOf(item.id)})`}
        </button>
      ))}
    </div>
  );
}

// Στήλες ανά Στάδιο· κάθε κάρτα μια γραμμή-κάρτα.
function StageColumns(props: {
  columns: readonly ListItem[];
  open: readonly BoardCard[];
  renderCard: (card: BoardCard) => ReactNode;
  drag: ReturnType<typeof useStageDrag>;
}) {
  return (
    <div className="b3-kanban">
      {props.columns.map((stage) => {
        const inStage = props.open.filter(
          (card) => props.drag.stageOf(card) === stage.id,
        );
        return (
          <section
            key={stage.id}
            className="kcol"
            aria-label={stage.label}
            {...props.drag.columnProps(stage.id)}
          >
            <h3>
              <span>{stage.label}</span>
              <span className="muted">{inStage.length}</span>
            </h3>
            {inStage.length === 0 ? (
              <p className="muted">Καμία Ευκαιρία.</p>
            ) : (
              inStage.map(props.renderCard)
            )}
          </section>
        );
      })}
    </div>
  );
}

// Οι κλεισμένες σε κλειστό κουτί κάτω από τις Στήλες.
function ClosedBox(props: {
  closed: readonly BoardCard[];
  renderCard: (card: BoardCard) => ReactNode;
}) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Κλεισμένες ({props.closed.length})</h2>
          <small>Κερδισμένες και χαμένες, με τον λόγο απώλειας</small>
        </summary>
        {props.closed.length === 0 ? (
          <p className="muted">Καμία κλεισμένη Ευκαιρία.</p>
        ) : (
          <div className="grid2 b3-closed">
            {props.closed.map(props.renderCard)}
          </div>
        )}
      </details>
    </section>
  );
}

// Το Pipeline (prototype `screens/b3-board.tsx`): Στήλες ανά Στάδιο, φίλτρα «ποιον παίρνω», κλεισμένες από κάτω.
export function PipelineBoard({
  today,
  cards,
  stages,
  lossReasons,
}: BoardProps) {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const drag = useStageDrag();
  const allOpen = cards.filter((card) => card.outcome === "open");
  const open = allOpen.filter((card) => cardMatches(card, filter, today));
  const closed = cards.filter((card) => card.outcome !== "open");
  const countOf = (id: BoardFilter): number =>
    allOpen.filter((card) => cardMatches(card, id, today)).length;
  const columns = stages
    .filter((stage) => !stage.isRetired)
    .toSorted((a, b) => a.sort - b.sort);
  const renderCard = (card: BoardCard) => (
    <BoardCardLine
      key={card.id}
      card={{ ...card, stageId: drag.stageOf(card) }}
      today={today}
      stages={stages}
      lossReasons={lossReasons}
      dragProps={drag.cardProps(card)}
    />
  );
  return (
    <>
      <p className="b3-counts" aria-live="polite">
        <strong>
          {plural(allOpen.length, "ανοιχτή Ευκαιρία", "ανοιχτές Ευκαιρίες")}
        </strong>
        {" · "}
        {plural(countOf("forgotten"), "ξεχασμένη", "ξεχασμένες")}
        {" · "}
        {plural(closed.length, "κλεισμένη", "κλεισμένες")}
      </p>
      <FilterPills filter={filter} countOf={countOf} onPick={setFilter} />
      {filter !== "all" ? (
        <CallList cards={open} filter={filter} today={today} />
      ) : (
        <StageColumns
          columns={columns}
          open={open}
          renderCard={renderCard}
          drag={drag}
        />
      )}
      {drag.error && (
        <p className="note" role="alert">
          {drag.error}
        </p>
      )}
      <p className="note">
        «Κερδισμένη» δεν μπαίνει με το χέρι: γίνεται μόνη της όταν υπογράψει ο
        Υπογράφων. Το Στάδιο και η Έκβαση είναι ξεχωριστά.
      </p>
      <ClosedBox closed={closed} renderCard={renderCard} />
    </>
  );
}
