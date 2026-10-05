"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface BoardCard {
  id: string;
  href: string;
  title: string;
  clientName: string;
  owner: string;
  source: string;
  stage: string;
  outcome: "Ανοιχτή" | "Κερδισμένη" | "Χαμένη";
  lostReason?: string;
  nextStep: string | null;
  isForgotten: boolean;
  amount: string | null;
}

interface BoardProps {
  cards: readonly BoardCard[];
  stages: readonly string[];
  lossReasons: readonly string[];
  canManage: boolean;
}

export function PipelineBoard({
  cards: initial,
  stages,
  lossReasons,
  canManage,
}: BoardProps) {
  const [cards, setCards] = useState(initial);
  const [onlyForgotten, setOnlyForgotten] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  const update = (id: string, patch: Partial<BoardCard>) =>
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, ...patch } : card)),
    );

  const open = cards.filter(
    (card) =>
      card.outcome === "Ανοιχτή" && (!onlyForgotten || card.isForgotten),
  );
  const closed = cards.filter((card) => card.outcome !== "Ανοιχτή");

  const renderCard = (card: BoardCard) => (
    <div key={card.id} className="kcard" data-forgotten={card.isForgotten}>
      <Link href={card.href}>
        <strong>{card.title}</strong>
      </Link>
      <p className="muted">{card.clientName}</p>
      <p>
        {card.owner} · {card.source}
        {card.amount && ` · ${card.amount}`}
      </p>
      {card.nextStep && (
        <p>
          Επόμενο βήμα: {card.nextStep}{" "}
          {card.isForgotten && <Badge tone="attention">Ξεχασμένη</Badge>}
        </p>
      )}
      {card.outcome === "Ανοιχτή" && canManage && (
        <>
          <select
            className="select"
            aria-label="Μετακίνηση σε Στάδιο"
            value={card.stage}
            onChange={(event) => update(card.id, { stage: event.target.value })}
          >
            {stages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>{" "}
          {closing === card.id ? (
            <select
              className="select"
              aria-label="Λόγος απώλειας"
              defaultValue=""
              onChange={(event) => {
                update(card.id, {
                  outcome: "Χαμένη",
                  lostReason: event.target.value,
                });
                setClosing(null);
              }}
            >
              <option value="" disabled>
                Λόγος απώλειας (υποχρεωτικός)
              </option>
              {lossReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => setClosing(card.id)}
            >
              Κλείσιμο ως χαμένη
            </button>
          )}
        </>
      )}
      {card.outcome === "Χαμένη" && (
        <Badge>Λόγος απώλειας: {card.lostReason}</Badge>
      )}
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <label>
          <input
            type="checkbox"
            checked={onlyForgotten}
            onChange={(event) => setOnlyForgotten(event.target.checked)}
          />{" "}
          Μόνο ξεχασμένες (πέρασε το Επόμενο βήμα)
        </label>
      </div>
      <div className="kanban">
        {stages.map((stage) => {
          const inStage = open.filter((card) => card.stage === stage);
          return (
            <section key={stage} className="kcol" aria-label={stage}>
              <h3>
                <span>{stage}</span>
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
      <p className="note">
        «Κερδισμένη» δεν μπαίνει με το χέρι: γίνεται μόνη της όταν υπογράψει ο
        Υπογράφων. Το Στάδιο και η Έκβαση είναι ξεχωριστά.
      </p>
      <h2>Κλεισμένες</h2>
      {closed.length === 0 ? (
        <p className="muted">Καμία κλεισμένη Ευκαιρία.</p>
      ) : (
        <div className="grid2">{closed.map(renderCard)}</div>
      )}
    </>
  );
}
