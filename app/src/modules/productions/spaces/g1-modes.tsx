import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { listProductionStages, listWorkload } from "../queries";
import type { ProductionCard } from "../types";
import { boardColumnsOf, type G1Mode } from "./board-model";
import { G1Board } from "./g1-board";
import { G1Stages } from "./g1-stages";

// Οι δύο επιπλέον λειτουργίες του G1: ο πίνακας Σταδίων και ο φόρτος ανά άτομο. Η λίστα μένει η προεπιλογή.

const MODES: readonly { id: G1Mode; label: string }[] = [
  { id: "list", label: "Λίστα" },
  { id: "board", label: "Πίνακας Σταδίων" },
  { id: "load", label: "Φόρτος ανά άτομο" },
];

export function G1ModeSwitch({
  active,
  canSeeLoad,
  clientId,
}: {
  active: G1Mode;
  canSeeLoad: boolean;
  clientId: string | undefined;
}) {
  return (
    <nav className="page-filters g1-modes" aria-label="Λειτουργία">
      {MODES.filter((mode) => mode.id !== "load" || canSeeLoad).map((mode) => (
        <Link
          key={mode.id}
          scroll={false}
          aria-current={mode.id === active ? "page" : undefined}
          href={hrefOf("G1", {
            mode: mode.id === "list" ? undefined : mode.id,
            client: clientId,
          })}
        >
          {mode.label}
        </Link>
      ))}
    </nav>
  );
}

// Ο πίνακας: μόνο οι ανοιχτές Παραγωγές (οι παραδομένες δεν έχουν πια Στάδιο να προχωρήσουν).
export async function G1BoardSection({
  cards,
  canMove,
}: {
  cards: readonly ProductionCard[];
  canMove: boolean;
}) {
  const stages = await listProductionStages();
  if (!stages.ok) return <ErrorNotice what="τα Στάδια" />;
  const open = cards.filter((card) => card.state === "open");
  return (
    <>
      <G1Board
        columns={boardColumnsOf(open, stages.data.stages)}
        stages={stages.data.stages}
        canMove={canMove}
      />
      {stages.data.canEdit && <G1Stages stages={stages.data.stages} />}
    </>
  );
}

// Φόρτος: ποιος έχει πόσα ανοιχτά, για να μοιραστεί η δουλειά δίκαια.
export async function G1WorkloadSection() {
  const read = await listWorkload();
  if (!read.ok) return <ErrorNotice what="ο φόρτος" />;
  if (read.data.length === 0)
    return (
      <p className="ml-empty">
        Δεν υπάρχουν ενεργοί Χρήστες ομάδας: ο φόρτος μετριέται για όσους είναι
        ενεργοί στην Ομάδα.
      </p>
    );
  return (
    <table className="ml-table ml-list" aria-label="Φόρτος ανά άτομο">
      <thead>
        <tr>
          <th>Αρχικά</th>
          <th>Άτομο · Ανοιχτά</th>
          <th>Γυρίσματα 7 ημερών</th>
        </tr>
      </thead>
      <tbody>
        {read.data.map((row) => (
          <tr
            key={row.userId}
            className="ml-line"
            data-urgent={row.lateTasks > 0 ? "" : undefined}
          >
            <td className="ml-thumb" aria-hidden="true">
              {initialsOf(row.name)}
            </td>
            <td className="ml-main">
              {row.lateTasks > 0 && (
                <span className="ml-tag">{`${row.lateTasks} εκπρόθεσμες`}</span>
              )}
              <strong>{row.name}</strong>
              <small>
                {row.productions} Παραγωγές · {row.tasks} Εργασίες ·{" "}
                {row.deliverables} Παραδοτέα
              </small>
            </td>
            <td className="ml-amount">
              {row.filmings}
              <small>Γυρίσματα 7 ημερών</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
