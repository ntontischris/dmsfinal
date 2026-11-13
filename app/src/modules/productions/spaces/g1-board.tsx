"use client";

import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { setProductionStage } from "../actions-stages";
import type { ProductionCard, ProductionStage } from "../types";
import type { BoardColumn } from "./board-model";
import { RunResult, useRun } from "./g2-ui";

// Μία κάρτα του πίνακα: τίτλος, Πελάτης, Υπεύθυνος και επιλογή Σταδίου για όποιον μπορεί να τη μετακινήσει.
function BoardCard({
  card,
  stages,
  canMove,
}: {
  card: ProductionCard;
  stages: readonly ProductionStage[];
  canMove: boolean;
}) {
  const move = useRun(setProductionStage);
  return (
    <li className="g1-board-card" data-production={card.id}>
      <Link className="part-title" href={hrefOf("G2", { id: card.id })}>
        {card.title}
      </Link>
      <span className="part-sub">
        {card.client?.name ?? "Εσωτερική"} · {card.owner?.name ?? "Χωρίς υπεύθυνο"}
      </span>
      {canMove && (
        <select
          className="select"
          aria-label={`Στάδιο: ${card.title}`}
          value={card.stage?.id ?? ""}
          disabled={move.isPending}
          onChange={(event) =>
            move.run({ productionId: card.id, stageId: event.target.value })
          }
        >
          <option value="">Χωρίς στάδιο</option>
          {stages
            .filter((stage) => stage.isActive)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
        </select>
      )}
      {move.result.error && <RunResult result={move.result} />}
    </li>
  );
}

// Ο πίνακας Σταδίων: οι ανοιχτές Παραγωγές σε στήλες. Η μετακίνηση γίνεται από την επιλογή της κάρτας.
export function G1Board({
  columns,
  stages,
  canMove,
}: {
  columns: readonly BoardColumn[];
  stages: readonly ProductionStage[];
  canMove: boolean;
}) {
  return (
    <div className="g1-board" role="list" aria-label="Πίνακας Σταδίων">
      {columns.map((column) => (
        <section
          key={column.stageId ?? "none"}
          className="g1-board-col"
          role="listitem"
          aria-label={column.label}
        >
          <h2 className="g1-board-head">
            {column.label} <span className="part-sub">{column.cards.length}</span>
          </h2>
          <ul className="g1-board-cards">
            {column.cards.map((card) => (
              <BoardCard
                key={card.id}
                card={card}
                stages={stages}
                canMove={canMove}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
