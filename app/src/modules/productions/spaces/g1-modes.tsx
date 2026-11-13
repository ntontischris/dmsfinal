import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Person } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

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
    <p className="g1-filter" aria-label="Λειτουργία">
      {MODES.filter((mode) => mode.id !== "load" || canSeeLoad).map((mode) => (
        <Link
          key={mode.id}
          aria-current={mode.id === active ? "page" : undefined}
          href={hrefOf("G1", {
            mode: mode.id === "list" ? undefined : mode.id,
            client: clientId,
          })}
        >
          {mode.label}
        </Link>
      ))}
    </p>
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
      <StateNotice kind="empty" title="Δεν υπάρχουν ενεργοί Χρήστες ομάδας.">
        <p>Ο φόρτος μετριέται για όσους είναι ενεργοί στην Ομάδα.</p>
      </StateNotice>
    );
  return (
    <table className="rtable" aria-label="Φόρτος ανά άτομο">
      <thead>
        <tr>
          <th>Άτομο</th>
          <th>Ανοιχτές Παραγωγές</th>
          <th>Ανοιχτές Εργασίες</th>
          <th>Ανοιχτά Παραδοτέα</th>
          <th>Γυρίσματα 7 ημερών</th>
        </tr>
      </thead>
      <tbody>
        {read.data.map((row) => (
          <tr key={row.userId}>
            <td data-label="Άτομο">
              <Person name={row.name} />
            </td>
            <td data-label="Ανοιχτές Παραγωγές">{row.productions}</td>
            <td data-label="Ανοιχτές Εργασίες">
              {row.tasks}{" "}
              {row.lateTasks > 0 && (
                <Badge tone="attention">{`${row.lateTasks} εκπρόθεσμες`}</Badge>
              )}
            </td>
            <td data-label="Ανοιχτά Παραδοτέα">{row.deliverables}</td>
            <td data-label="Γυρίσματα 7 ημερών">{row.filmings}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
