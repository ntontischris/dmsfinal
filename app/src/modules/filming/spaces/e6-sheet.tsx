"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { respondToCrew } from "../actions-crew";
import type { E6Sheet as SheetView } from "./e6-adapter";
import { useRun } from "./e3-run";
import { responseTone } from "./e3-model";
import { LastDone, StatusBadge } from "./e3-ui";

// Η όψη του μέλους (prototype `screens/e6-sheet.tsx`): απαντά «επιβεβαιώνω» ή «δεν μπορώ» (με λόγο) στο πραγματικό
// filming_crew_respond. Το «δεν μπορώ» δεν αλλάζει το Γύρισμα.
export function E6Sheet({ sheet }: { sheet: SheetView }) {
  const [reason, setReason] = useState(sheet.myReason ?? "");
  const [isAsking, setIsAsking] = useState(false);
  const { run, isPending, result } = useRun();
  const respond = (response: "confirmed" | "declined", why = "") =>
    run(
      respondToCrew,
      { filmingId: sheet.filmingId, response, reason: why },
      () => setIsAsking(false),
    );
  const isConfirmed = sheet.myResponse === "επιβεβαιώνω" && !sheet.awaitsAnswer;

  return (
    <Panel
      label={`${sheet.clientName} · ${sheet.when}`}
      aside={
        <span className="e1-signals">
          <StatusBadge look={sheet.state} />
          <Badge tone="strong">Δελτίο έκδοση {sheet.version}</Badge>
        </span>
      }
    >
      {sheet.awaitsAnswer && (
        <ul className="e6-warnings" aria-label="Προειδοποιήσεις">
          <li>
            <span aria-hidden="true">⚠</span> Νέα έκδοση Δελτίου: περιμένει την
            απάντησή σου.
          </li>
        </ul>
      )}
      <p className="note">
        Έκδοση {sheet.version} ({sheet.sentAt})
        {sheet.change ? `: ${sheet.change}` : ""}.
      </p>
      <dl className="dl">
        <dt>Πού</dt>
        <dd>{sheet.where}</dd>
        <dt>Πότε</dt>
        <dd>{sheet.when}</dd>
        <dt>Συνεργείο (ποιοι πάμε)</dt>
        <dd>
          <RowList>
            {sheet.crew.map((person) => (
              <ListRow
                key={person.name}
                lead={<Avatar name={person.name} size={32} />}
                title={person.name}
                aside={person.isMe && <Badge tone="strong">εσύ</Badge>}
                isHighlighted={person.isMe}
              />
            ))}
          </RowList>
        </dd>
        <dt>Εξοπλισμός</dt>
        <dd>
          {sheet.equipment.length === 0 ? (
            "—"
          ) : (
            <RowList>
              {sheet.equipment.map((name) => (
                <ListRow key={name} title={name} />
              ))}
            </RowList>
          )}
        </dd>
        <dt>Shot list</dt>
        <dd>
          {sheet.shotList.length === 0 ? (
            "—"
          ) : (
            <RowList>
              {sheet.shotList.map((shot, index) => (
                <ListRow
                  key={`${index}-${shot}`}
                  lead={String(index + 1)}
                  title={shot}
                />
              ))}
            </RowList>
          )}
        </dd>
        {sheet.crewNote && (
          <>
            <dt>Σημείωση για το Συνεργείο</dt>
            <dd>{sheet.crewNote}</dd>
          </>
        )}
      </dl>

      <h3>Η απάντησή σου</h3>
      <p>
        <Badge tone={responseTone(sheet.myResponse)}>{sheet.myResponse}</Badge>
        {sheet.myResponse === "δεν μπορώ" && sheet.myReason
          ? ` «${sheet.myReason}»`
          : null}
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() => respond("confirmed")}
          disabled={isPending || isConfirmed}
        >
          Επιβεβαιώνω
        </button>
        <button
          type="button"
          className="button"
          data-danger="true"
          onClick={() => setIsAsking(true)}
        >
          Δεν μπορώ
        </button>
      </div>
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {isAsking && (
        <div className="stack">
          <label className="stack">
            Λόγος (υποχρεωτικός)
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger="true"
              disabled={!reason.trim() || isPending}
              onClick={() => respond("declined", reason.trim())}
            >
              Στέλνω «δεν μπορώ»
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsAsking(false)}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
      <p className="note">
        Το «δεν μπορώ» ειδοποιεί την ομάδα, για να βρεθεί αντικαταστάτης.{" "}
        <strong>Δεν αλλάζει το Γύρισμα</strong>: ο πελάτης δεν ενημερώνεται και
        το Γύρισμα μένει προγραμματισμένο.
      </p>
    </Panel>
  );
}
