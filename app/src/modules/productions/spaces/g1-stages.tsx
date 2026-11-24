"use client";

import { useState } from "react";

import {
  moveProductionStage,
  saveProductionStage,
  setProductionStageActive,
} from "../actions-stages";
import type { ProductionStage } from "../types";
import { RunResult, useRun } from "./g2-ui";

function StageLine({
  stage,
  isFirst,
  isLast,
}: {
  stage: ProductionStage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [label, setLabel] = useState(stage.label);
  const save = useRun(saveProductionStage);
  const move = useRun(moveProductionStage);
  const active = useRun(setProductionStageActive);
  const result = [save, move, active].find((run) => run.result.error)?.result;
  return (
    <li className="g1-stage" data-active={stage.isActive}>
      <input
        className="input"
        aria-label={`Όνομα Σταδίου ${stage.label}`}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <span className="ml-quick">
      {label.trim() !== stage.label && (
        <button
          type="button"
            disabled={save.isPending || label.trim() === ""}
          onClick={() => save.run({ stageId: stage.id, label })}
        >
          Αποθήκευση
        </button>
      )}
      {stage.isActive && (
        <>
          <button
            type="button"
                aria-label={`Πιο πάνω: ${stage.label}`}
            disabled={isFirst || move.isPending}
            onClick={() => move.run({ stageId: stage.id, step: "-1" })}
          >
            ↑
          </button>
          <button
            type="button"
                aria-label={`Πιο κάτω: ${stage.label}`}
            disabled={isLast || move.isPending}
            onClick={() => move.run({ stageId: stage.id, step: "1" })}
          >
            ↓
          </button>
        </>
      )}
      <button
        type="button"
        disabled={active.isPending}
        onClick={() =>
          active.run({ stageId: stage.id, active: String(!stage.isActive) })
        }
      >
        {stage.isActive ? "Απόσυρση" : "Επαναφορά"}
      </button>
      </span>
      {result && <RunResult result={result} />}
    </li>
  );
}

function AddStage() {
  const [label, setLabel] = useState("");
  const add = useRun(saveProductionStage);
  return (
    <div className="g1-stage">
      <input
        className="input"
        aria-label="Νέο Στάδιο"
        placeholder="Νέο Στάδιο"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <span className="ml-quick">
      <button
        type="button"
        disabled={add.isPending || label.trim() === ""}
        onClick={() =>
          add.run({ stageId: "", label }, (state) => {
            if (!state.error) setLabel("");
          })
        }
      >
        Προσθήκη Σταδίου
      </button>
      </span>
      <RunResult result={add.result} />
    </div>
  );
}

// Η λίστα Σταδίων του πίνακα, μέσα στη σελίδα: μετονομασία, σειρά, απόσυρση. Η απόσυρση δεν σβήνει τίποτα·
// οι Παραγωγές του Σταδίου φαίνονται στο «Χωρίς στάδιο» μέχρι να επανέλθει.
export function G1Stages({ stages }: { stages: readonly ProductionStage[] }) {
  const active = stages.filter((stage) => stage.isActive);
  return (
    <details className="ml-box g1-stages">
      <summary>
        <h2 className="ml-box-title">Επεξεργασία Σταδίων</h2>
        <small>Στάδια του πίνακα · {active.length} ενεργά</small>
      </summary>
      <div>
        <ul className="g1-stage-list">
          {stages.map((stage) => (
            <StageLine
              key={`${stage.id}-${stage.label}`}
              stage={stage}
              isFirst={active[0]?.id === stage.id}
              isLast={active.at(-1)?.id === stage.id}
            />
          ))}
        </ul>
        <AddStage />
      </div>
    </details>
  );
}
