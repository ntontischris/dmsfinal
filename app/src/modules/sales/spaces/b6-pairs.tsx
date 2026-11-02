"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { mergeClients, resolveDuplicate } from "../actions-queue";
import { DUPLICATE_REASON_LABELS, NO_MANAGER_LABEL } from "../labels";
import type { DuplicatePair, DuplicateSide } from "../types";
import { RowForm, useDoneNotes } from "./b5-forms";
import { ItemRows } from "./lane-rows";

const fieldsOf = (side: DuplicateSide): readonly [string, string][] => [
  ["Επωνυμία", side.legalName || "—"],
  ["ΑΦΜ", side.afm ?? "—"],
  ["Τηλέφωνο", side.contactPhone || "—"],
  ["Email", side.contactEmail || "—"],
  ["Κύριο πρόσωπο", side.contactName || "—"],
  ["Υπεύθυνος", side.managerName ?? NO_MANAGER_LABEL],
  ["Ευκαιρίες", String(side.opportunities)],
];

function Side({ side, title }: { side: DuplicateSide; title: string }) {
  return (
    <Panel label={side.name} aside={<Badge>{title}</Badge>}>
      <ItemRows
        items={fieldsOf(side).map(([label, value]) => ({
          id: label,
          title: value,
          sub: label,
        }))}
      />
    </Panel>
  );
}

function Pair({
  pair,
  onDone,
}: {
  pair: DuplicatePair;
  onDone: (text: string) => void;
}) {
  const [survivorId, setSurvivorId] = useState(pair.existing.id);
  const absorbedId =
    survivorId === pair.existing.id ? pair.candidate.id : pair.existing.id;
  const survivorName =
    survivorId === pair.candidate.id ? pair.candidate.name : pair.existing.name;
  return (
    <section>
      <p className="note">
        Πιθανό διπλό: {DUPLICATE_REASON_LABELS[pair.reason]}.
      </p>
      <div className="compare">
        <Side side={pair.candidate} title="Νέος, με σήμα «Πιθανό διπλό»" />
        <Side side={pair.existing} title="Υπάρχων" />
      </div>
      <div className="toolbar">
        <label>
          Ο Πελάτης που μένει:{" "}
          <select
            className="select"
            value={survivorId}
            onChange={(event) => setSurvivorId(event.target.value)}
          >
            <option value={pair.existing.id}>{pair.existing.name}</option>
            <option value={pair.candidate.id}>{pair.candidate.name}</option>
          </select>
        </label>
        <RowForm
          action={mergeClients}
          submitLabel="Συγχώνευση"
          isPrimary
          onDone={() =>
            onDone(
              `Συγχωνεύθηκαν: ο ενιαίος Πελάτης είναι «${survivorName}», με όλες τις Ευκαιρίες και το ιστορικό και των δύο.`,
            )
          }
        >
          <input type="hidden" name="survivorId" value={survivorId} />
          <input type="hidden" name="absorbedId" value={absorbedId} />
        </RowForm>
        <RowForm
          action={resolveDuplicate}
          submitLabel="Είναι άλλος"
          onDone={() =>
            onDone(
              `«${pair.candidate.name}»: σημειώθηκε «είναι άλλος». Το σήμα έκλεισε, οι Πελάτες μένουν χωριστοί.`,
            )
          }
        >
          <input type="hidden" name="flagId" value={pair.flagId} />
        </RowForm>
      </div>
      <p className="muted">
        Η Συγχώνευση ενώνει τους δύο Πελάτες σε έναν, με όλες τις Ευκαιρίες,
        Συμφωνίες και το ιστορικό τους. Το «είναι άλλος» κλείνει το σήμα χωρίς
        ένωση.
      </p>
    </section>
  );
}

// Πιθανά διπλά και Συγχώνευση (prototype `screens/b6-pairs.tsx`) με τις πραγματικές ενέργειες.
// Η γραμμή «Συμφωνίες» ανά πλευρά λείπει: η ανάγνωση των ζευγαριών δεν τη δίνει.
export function DuplicatePairs({ pairs }: { pairs: readonly DuplicatePair[] }) {
  const notes = useDoneNotes();
  const pending = pairs.filter((pair) => !notes.isDone(pair.flagId));
  return (
    <>
      {notes.view}
      {pending.length === 0 ? (
        <section className="card notice" role="status">
          <h2>Δεν έμειναν Πιθανά διπλά</h2>
          <p className="muted">
            Όταν μια φόρμα μοιάζει με υπάρχοντα Πελάτη χωρίς ακριβές ταίριασμα,
            θα εμφανιστεί εδώ.
          </p>
        </section>
      ) : (
        pending.map((pair) => (
          <Pair
            key={pair.flagId}
            pair={pair}
            onDone={(text) => notes.add(pair.flagId, text)}
          />
        ))
      )}
    </>
  );
}
