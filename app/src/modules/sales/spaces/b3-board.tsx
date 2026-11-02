"use client";

import Link from "next/link";
import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";
import { Due, ListRow, Person, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  closeOpportunityLost,
  moveOpportunityStage,
} from "../actions-opportunities";
import type { ListItem } from "../types";
import type { BoardCard } from "./b3-adapter";
import {
  QUIET_DAYS,
  cardMatches,
  daysSince,
  type BoardFilter,
} from "./b3-filters";

import "./b3.css";

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

const lastContactText = (card: BoardCard, today: string): string => {
  if (!card.lastContact) return "Καμία επαφή ακόμα";
  const days = daysSince(card.lastContact, today);
  const ago =
    days === 0 ? "σήμερα" : days === 1 ? "χθες" : `πριν από ${days} μέρες`;
  return `Τελευταία επαφή: ${fmtDate(card.lastContact)} (${ago})`;
};

// Μετακίνηση σε Στάδιο με την πραγματική ενέργεια: η αλλαγή στη λίστα στέλνει αμέσως.
function MoveStage({
  card,
  stages,
}: {
  card: BoardCard;
  stages: readonly ListItem[];
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(moveOpportunityStage);
  const selectable = stages.filter(
    (stage) => !stage.isRetired || stage.id === card.stageId,
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "contents" }}>
      <input type="hidden" name="opportunityId" value={card.id} />
      <select
        className="select"
        aria-label="Μετακίνηση σε Στάδιο"
        name="stageId"
        defaultValue={card.stageId}
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {selectable.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.label}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function CloseLost({
  card,
  reasons,
}: {
  card: BoardCard;
  reasons: readonly ListItem[];
}) {
  const [isClosing, setIsClosing] = useState(false);
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(closeOpportunityLost);
  if (!isClosing)
    return (
      <button
        type="button"
        className="button"
        onClick={() => setIsClosing(true)}
      >
        Κλείσιμο ως χαμένη
      </button>
    );
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "contents" }}>
      <input type="hidden" name="opportunityId" value={card.id} />
      <select
        className="select"
        aria-label="Λόγος απώλειας"
        name="lossReasonId"
        defaultValue=""
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>
          Λόγος απώλειας (υποχρεωτικός)
        </option>
        {reasons
          .filter((reason) => !reason.isRetired)
          .map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function Card({
  card,
  today,
  stages,
  lossReasons,
}: {
  card: BoardCard;
  today: string;
  stages: readonly ListItem[];
  lossReasons: readonly ListItem[];
}) {
  return (
    <div className="kcard b3-card" data-forgotten={card.isForgotten}>
      <Link href={card.href} className="b3-title">
        {card.title}
      </Link>
      {card.amount && <span className="b3-amount">{card.amount}</span>}
      <span className="part-sub b3-client">{card.clientName}</span>
      {card.nextStep && card.outcome === "open" && (
        <p className="b3-step">
          Επόμενο βήμα: {card.nextStep}{" "}
          {card.isForgotten && <Badge tone="attention">Ξεχασμένη</Badge>}
        </p>
      )}
      {card.outcome === "open" && (
        <p className="part-sub b3-contact">{lastContactText(card, today)}</p>
      )}
      <div className="b3-foot">
        <Person name={card.owner} />
        <span className="part-sub b3-source">{card.source}</span>
        {card.nextStepDue && (
          <Due isLate={card.isForgotten}>
            {card.isForgotten ? "έληξε" : "→"} {fmtDate(card.nextStepDue)}
          </Due>
        )}
      </div>
      {card.canWork && (
        <>
          <MoveStage card={card} stages={stages} />{" "}
          <CloseLost card={card} reasons={lossReasons} />
        </>
      )}
      {card.outcome === "lost" && card.lostReason && (
        <Badge>Λόγος απώλειας: {card.lostReason}</Badge>
      )}
      {card.outcome === "won" && <Badge tone="ok">Κερδισμένη</Badge>}
    </div>
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
  const allOpen = cards.filter((card) => card.outcome === "open");
  const open = allOpen.filter((card) => cardMatches(card, filter, today));
  const closed = cards.filter((card) => card.outcome !== "open");
  const countOf = (id: BoardFilter): number =>
    allOpen.filter((card) => cardMatches(card, id, today)).length;
  const forgottenCount = countOf("forgotten");
  const columns = stages
    .filter((stage) => !stage.isRetired)
    .toSorted((a, b) => a.sort - b.sort);
  const renderCard = (card: BoardCard) => (
    <Card
      key={card.id}
      card={card}
      today={today}
      stages={stages}
      lossReasons={lossReasons}
    />
  );

  return (
    <>
      <div className="toolbar">
        <p className="grow" aria-live="polite">
          <strong>
            {allOpen.length === 1
              ? "1 ανοιχτή Ευκαιρία"
              : `${allOpen.length} ανοιχτές Ευκαιρίες`}
          </strong>
          {" · "}
          {forgottenCount === 1
            ? "1 ξεχασμένη"
            : `${forgottenCount} ξεχασμένες`}
          {" · "}
          {closed.length === 1 ? "1 κλεισμένη" : `${closed.length} κλεισμένες`}
        </p>
      </div>
      <div className="choice-row" role="group" aria-label="Ποιες Ευκαιρίες">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            {item.id !== "all" && ` (${countOf(item.id)})`}
          </button>
        ))}
      </div>
      {filter !== "all" ? (
        <CallList cards={open} filter={filter} today={today} />
      ) : (
        <div className="kanban">
          {columns.map((stage) => {
            const inStage = open.filter((card) => card.stageId === stage.id);
            return (
              <section key={stage.id} className="kcol" aria-label={stage.label}>
                <h3>
                  <span>{stage.label}</span>
                  <span className="muted">{inStage.length}</span>
                </h3>
                {inStage.length === 0 ? (
                  <p className="muted">Καμία Ευκαιρία.</p>
                ) : (
                  inStage.map(renderCard)
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="note">
        «Κερδισμένη» δεν μπαίνει με το χέρι: γίνεται μόνη της όταν υπογράψει ο
        Υπογράφων. Το Στάδιο και η Έκβαση είναι ξεχωριστά.
      </p>
      <h2>Κλεισμένες ({closed.length})</h2>
      {closed.length === 0 ? (
        <p className="muted">Καμία κλεισμένη Ευκαιρία.</p>
      ) : (
        <div className="grid2">{closed.map(renderCard)}</div>
      )}
    </>
  );
}

const EMPTY_TEXT: Readonly<Record<Exclude<BoardFilter, "all">, string>> = {
  week: "Κανένα Επόμενο βήμα μέσα στις επόμενες 7 μέρες.",
  forgotten: "Κανένα τηλέφωνο δεν χρωστάς. Όλα στην ώρα τους.",
  quiet: "Με όλες τις ανοιχτές Ευκαιρίες μίλησες πρόσφατα.",
};

// Με φίλτρο: λίστα αντί για στήλες (και στο κινητό), ώστε να ξέρεις ποιον παίρνεις πρώτο. Το τηλέφωνο του Πελάτη
// δεν έρχεται με το Pipeline· η Ευκαιρία ανοίγει με ένα πάτημα.
function CallList({
  cards,
  filter,
  today,
}: {
  cards: readonly BoardCard[];
  filter: Exclude<BoardFilter, "all">;
  today: string;
}) {
  if (cards.length === 0) return <p className="muted">{EMPTY_TEXT[filter]}</p>;
  const sorted = cards.toSorted((a, b) =>
    (a.nextStepDue ?? "9999").localeCompare(b.nextStepDue ?? "9999"),
  );
  return (
    <Panel label="Πάρε τηλέφωνο" isFlush>
      <RowList>
        {sorted.map((card) => (
          <ListRow
            key={card.id}
            isHighlighted={card.isForgotten}
            title={card.clientName}
            sub={
              <>
                <Link href={card.href}>{card.title}</Link>
                <br />
                {card.nextStep ?? "Χωρίς Επόμενο βήμα"}
                {card.overdue && ` · έπρεπε ${card.overdue}`}
                {" · "}
                {lastContactText(card, today)}
              </>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}
