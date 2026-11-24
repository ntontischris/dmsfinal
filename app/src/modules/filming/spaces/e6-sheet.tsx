"use client";

import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { respondToCrew } from "../actions-crew";
import type { E6Sheet as SheetView } from "./e6-adapter";
import { useRun } from "./e3-run";
import { responseTone } from "./e3-model";
import { LastDone, StatusBadge } from "./e3-ui";
import { Line, Lines } from "./ml-parts";

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
    <section className="fl-sheet">
      <header className="fl-sheet-head">
        <h2 className="ml-box-title">{`${sheet.clientName} · ${sheet.when}`}</h2>
        <span className="e1-signals">
          <StatusBadge look={sheet.state} />
          <Badge tone="strong">Δελτίο έκδοση {sheet.version}</Badge>
        </span>
      </header>
      {sheet.awaitsAnswer && (
        <ul className="e6-warnings" aria-label="Προειδοποιήσεις">
          <li>
            <span aria-hidden="true">⚠</span> Νέα έκδοση Δελτίου: περιμένει την
            απάντησή σου.
          </li>
        </ul>
      )}
      <small>
        Έκδοση {sheet.version} ({sheet.sentAt})
        {sheet.change ? `: ${sheet.change}` : ""}.
      </small>
      <dl className="ml-kv">
        <dt>Πού</dt>
        <dd>{sheet.where}</dd>
        <dt>Πότε</dt>
        <dd>{sheet.when}</dd>
        <dt>Συνεργείο (ποιοι πάμε)</dt>
        <dd>
          <Lines>
            {sheet.crew.map((person) => (
              <Line
                key={person.name}
                thumb={person.name}
                title={person.name}
                aside={person.isMe && <Badge tone="strong">εσύ</Badge>}
                isCurrent={person.isMe}
              />
            ))}
          </Lines>
        </dd>
        <dt>Εξοπλισμός</dt>
        <dd>
          {sheet.equipment.length === 0 ? (
            "—"
          ) : (
            <Lines>
              {sheet.equipment.map((name) => (
                <Line key={name} title={name} />
              ))}
            </Lines>
          )}
        </dd>
        <dt>Shot list</dt>
        <dd>
          {sheet.shotList.length === 0 ? (
            "—"
          ) : (
            <Lines>
              {sheet.shotList.map((shot, index) => (
                <Line
                  key={`${index}-${shot}`}
                  lead={String(index + 1)}
                  title={shot}
                />
              ))}
            </Lines>
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
      <div className="ml-quick fl-row">
        <button
          type="button"
          data-primary="true"
          onClick={() => respond("confirmed")}
          disabled={isPending || isConfirmed}
        >
          Επιβεβαιώνω
        </button>
        <button
          type="button"
          data-danger="true"
          onClick={() => setIsAsking(true)}
        >
          Δεν μπορώ
        </button>
      </div>
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {isAsking && (
        <div className="ml-fields">
          <label className="ml-field" data-wide>
            <span>Λόγος (υποχρεωτικός)</span>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="ml-actions">
            <button
              type="button"
              data-danger="true"
              disabled={!reason.trim() || isPending}
              onClick={() => respond("declined", reason.trim())}
            >
              Στέλνω «δεν μπορώ»
            </button>
            <button type="button" onClick={() => setIsAsking(false)}>
              Άκυρο
            </button>
          </div>
        </div>
      )}
      <p className="fl-note">
        Το «δεν μπορώ» ειδοποιεί την ομάδα, για να βρεθεί αντικαταστάτης.{" "}
        <strong>Δεν αλλάζει το Γύρισμα</strong>: ο πελάτης δεν ενημερώνεται και
        το Γύρισμα μένει προγραμματισμένο.
      </p>
    </section>
  );
}
