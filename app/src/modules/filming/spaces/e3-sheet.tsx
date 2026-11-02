"use client";

import Link from "next/link";
import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { issueSheet, saveSheet } from "../actions-sheet";
import { formatDateTime } from "../helpers-time";
import { addShot, moveShot, removeShot } from "../sheet-model";
import type { SheetShot, SheetView } from "../sheet-types";
import { useRun } from "./e3-run";
import { LastDone } from "./e3-ui";

interface E3SheetProps {
  filmingId: string;
  sheet: SheetView;
  internalNote: string | null;
}

// Η λίστα λήψεων: με Δικαίωμα επεξεργασίας κάθε αλλαγή αποθηκεύεται αμέσως (όπως στο prototype)· αλλιώς της τελευταίας έκδοσης.
function ShotList({
  items,
  canEdit,
  isPending,
  onChange,
}: {
  items: readonly SheetShot[];
  canEdit: boolean;
  isPending: boolean;
  onChange: (next: SheetShot[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    onChange(addShot(items, draft, crypto.randomUUID()));
    setDraft("");
  };
  return (
    <>
      <h3>Shot list</h3>
      {items.length === 0 && <p className="muted">Κενή.</p>}
      <RowList>
        {items.map((item, index) => (
          <ListRow
            key={item.id}
            lead={String(index + 1)}
            title={item.text}
            aside={
              canEdit && (
                <>
                  <button
                    type="button"
                    className="button"
                    aria-label="Μετακίνηση πάνω"
                    disabled={index === 0 || isPending}
                    onClick={() => onChange(moveShot(items, item.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button"
                    aria-label="Μετακίνηση κάτω"
                    disabled={index === items.length - 1 || isPending}
                    onClick={() => onChange(moveShot(items, item.id, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={isPending}
                    onClick={() => onChange(removeShot(items, item.id))}
                  >
                    Αφαίρεση
                  </button>
                </>
              )
            }
          />
        ))}
      </RowList>
      {canEdit && (
        <div className="e3-inline">
          <input
            className="input"
            aria-label="Νέο πλάνο"
            placeholder="Νέο πλάνο…"
            maxLength={300}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              add();
            }}
          />
          <button
            type="button"
            className="button"
            disabled={!draft.trim() || isPending}
            onClick={add}
          >
            Προσθήκη
          </button>
        </div>
      )}
    </>
  );
}

// Δελτίο γυρίσματος (prototype `screens/e3-sheet.tsx`): εκδόσεις, αποστολή/νέα έκδοση, shot list, σημειώσεις.
// Όλα πάνω στα πραγματικά saveSheet / issueSheet· η βάση αποφασίζει ποιος επεξεργάζεται και ποιος εκδίδει.
export function E3Sheet({ filmingId, sheet, internalNote }: E3SheetProps) {
  const [shots, setShots] = useState<SheetShot[]>([...sheet.shots]);
  const [crewNote, setCrewNote] = useState(sheet.crewNote ?? "");
  const [change, setChange] = useState("");
  const { run, isPending, result } = useRun();
  const current = sheet.current;
  const isFirst = current === null;
  const save = (next: SheetShot[], note = crewNote) => {
    setShots(next);
    run(saveSheet, { filmingId, shots: JSON.stringify(next), crewNote: note });
  };
  const send = () =>
    run(issueSheet, { filmingId, change: change.trim() }, () => setChange(""));
  const shownShots = sheet.canEdit
    ? shots
    : (sheet.latest?.shots ?? sheet.shots);
  const shownNote = sheet.canEdit
    ? null
    : (sheet.latest?.crewNote ?? sheet.crewNote);

  return (
    <Panel
      label="Δελτίο γυρίσματος"
      aside={
        <Link className="button" href={hrefOf("E6")}>
          Όψη μέλους
        </Link>
      }
    >
      {isFirst && <p className="muted">Δεν έχει σταλεί ακόμα Δελτίο.</p>}
      <RowList>
        {sheet.versions.map((version) => (
          <ListRow
            key={version.version}
            lead={`v${version.version}`}
            title={`Έκδοση ${version.version}`}
            sub={`${formatDateTime(version.issuedAt)} · ${version.issuedByName ?? "Αυτόματα"} · ${version.change ?? "Πρώτη αποστολή"}`}
          />
        ))}
      </RowList>
      {sheet.hasChanges && current && (
        <p className="e3-warn">
          Άλλαξαν στοιχεία μετά την έκδοση {current.version}. Αν ισχύει ο
          Κανόνας «Η αλλαγή μηδενίζει τις επιβεβαιώσεις», η νέα έκδοση τις
          μηδενίζει.
        </p>
      )}
      {sheet.canIssue && (isFirst || sheet.hasChanges) && (
        <div className="stack e3-form">
          {!isFirst && (
            <label>
              Τι άλλαξε (υποχρεωτικό)
              <input
                className="input"
                maxLength={300}
                value={change}
                onChange={(event) => setChange(event.target.value)}
              />
            </label>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              disabled={isPending || (!isFirst && !change.trim())}
              onClick={send}
            >
              {isFirst ? "Αποστολή Δελτίου" : "Νέα έκδοση"}
            </button>
          </div>
        </div>
      )}
      <ShotList
        items={shownShots}
        canEdit={sheet.canEdit}
        isPending={isPending}
        onChange={(next) => save(next)}
      />
      <h3>Σημείωση για το Συνεργείο</h3>
      {sheet.canEdit ? (
        <div className="stack e3-form">
          <textarea
            className="input"
            rows={3}
            maxLength={2000}
            aria-label="Σημείωση για το Συνεργείο"
            value={crewNote}
            onChange={(event) => setCrewNote(event.target.value)}
          />
          <div className="btn-row">
            <button
              type="button"
              className="button"
              disabled={isPending || crewNote === (sheet.crewNote ?? "")}
              onClick={() => save(shots, crewNote)}
            >
              Αποθήκευση σημείωσης
            </button>
          </div>
        </div>
      ) : (
        <p>{shownNote ?? <span className="muted">Καμία.</span>}</p>
      )}
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      <E3InternalNote note={internalNote} />
    </Panel>
  );
}

// Η εσωτερική σημείωση: μόνο για την ομάδα (η βάση τη δίνει μόνο όπου επιτρέπεται).
export function E3InternalNote({ note }: { note: string | null }) {
  return (
    <>
      <h3>Εσωτερική σημείωση</h3>
      <p>{note ?? <span className="muted">Καμία.</span>}</p>
      <p className="muted">
        Μόνο για την ομάδα. Ο πελάτης δεν βλέπει το Δελτίο ούτε τη σημείωση.
      </p>
    </>
  );
}
