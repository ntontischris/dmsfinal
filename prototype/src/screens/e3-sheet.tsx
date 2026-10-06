"use client";

import Link from "next/link";
import { useState } from "react";

import { FILMING_RULES } from "@/data/filming";
import type { FilmingCaps } from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import {
  TODAY,
  snapshotOf,
  withFilming,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/e3-model";
import { screenHref } from "@/screens/shared";

interface PanelProps {
  role: RoleId;
  caps: FilmingCaps;
  live: Live;
  update: UpdateLive;
}

export function E3Sheet({ role, caps, live, update }: PanelProps) {
  const f = live.filming;
  const [shot, setShot] = useState("");
  const isOpen =
    f.state === "προγραμματισμένο" || f.state === "αναμένει έγκριση";
  const isFirst = f.sheet.length === 0;
  const isStale =
    live.sentSnapshot !== null && live.sentSnapshot !== snapshotOf(f);
  const resets = FILMING_RULES.changeResetsConfirmations;

  const send = () =>
    update((l) => {
      const version = l.filming.sheet.length + 1;
      const change =
        l.filming.sheet.length === 0
          ? "Πρώτη αποστολή"
          : "Αλλαγή σε πού, πότε ή ποιοι";
      const reset = !isFirst && resets;
      const crew = reset
        ? l.filming.crew.map((slot) => ({
            personId: slot.personId,
            response: "αναμένει" as const,
          }))
        : l.filming.crew;
      const next = withFilming(l, {
        crew,
        sheet: [...l.filming.sheet, { version, sentAt: TODAY, change }],
      });
      return withLog(
        { ...next, sentSnapshot: snapshotOf(next.filming) },
        `Στάλθηκε Δελτίο, έκδοση ${version}.${reset ? " Οι επιβεβαιώσεις μηδενίστηκαν (αναμένει)." : ""}`,
      );
    });
  const addShot = () => {
    const text = shot.trim();
    if (!text) return;
    update((l) =>
      withLog(
        withFilming(l, { shotList: [...l.filming.shotList, text] }),
        `Shot list: προστέθηκε «${text}».`,
      ),
    );
    setShot("");
  };
  const removeShot = (item: string) =>
    update((l) =>
      withFilming(l, {
        shotList: l.filming.shotList.filter((s) => s !== item),
      }),
    );

  return (
    <section className="card">
      <div className="card-title">
        <h2>Δελτίο γυρίσματος</h2>
        <Link className="button" href={screenHref(role, "E6", { id: f.id })}>
          Όψη μέλους (E6)
        </Link>
      </div>
      {f.sheet.length === 0 && (
        <p className="muted">Δεν έχει σταλεί ακόμα Δελτίο.</p>
      )}
      <ul className="list">
        {f.sheet.map((version) => (
          <li key={version.version}>
            Έκδοση {version.version} · {version.sentAt} · {version.change}
          </li>
        ))}
      </ul>
      {isStale && (
        <p className="e3-warn">
          Άλλαξε το πού, το πότε ή το ποιοι μετά την αποστολή.
          {resets && " Η νέα έκδοση μηδενίζει τις επιβεβαιώσεις."}
        </p>
      )}
      {caps.canManageCrew && isOpen && (isFirst || isStale) && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={send}
          >
            {isFirst ? "Αποστολή Δελτίου" : "Νέα έκδοση"}
          </button>
        </div>
      )}
      <h3>Shot list</h3>
      {f.shotList.length === 0 && <p className="muted">Κενή.</p>}
      <ul className="list">
        {f.shotList.map((item) => (
          <li key={item} className="row">
            <span>{item}</span>
            {caps.canManageCrew && isOpen && (
              <button
                type="button"
                className="button"
                onClick={() => removeShot(item)}
              >
                Αφαίρεση
              </button>
            )}
          </li>
        ))}
      </ul>
      {caps.canManageCrew && isOpen && (
        <div className="e3-inline">
          <input
            className="input"
            aria-label="Νέο πλάνο"
            placeholder="Νέο πλάνο…"
            value={shot}
            onChange={(event) => setShot(event.target.value)}
          />
          <button type="button" className="button" onClick={addShot}>
            Προσθήκη
          </button>
        </div>
      )}
      <h3>Εσωτερική σημείωση</h3>
      <p>{f.internalNote ?? <span className="muted">Καμία.</span>}</p>
      <p className="muted">
        Μόνο για την ομάδα. Ο πελάτης δεν βλέπει το Δελτίο ούτε τη σημείωση.
      </p>
    </section>
  );
}

const GOOGLE_NOTE: Readonly<Record<string, string>> = {
  "αναμένει έγκριση":
    "Δεσμεύει την ώρα στο Εταιρικό ημερολόγιο Google ως προσωρινό.",
  προγραμματισμένο:
    "Είναι στο Εταιρικό ημερολόγιο Google με την κατάσταση στον τίτλο.",
  έγινε:
    "Μένει στο Εταιρικό ημερολόγιο Google ως ιστορικό, με την κατάσταση «έγινε» στον τίτλο.",
  "δεν έγινε":
    "Μένει στο Εταιρικό ημερολόγιο Google ως ιστορικό, με την κατάσταση «δεν έγινε» στον τίτλο.",
  ακυρώθηκε: "Σβήστηκε από το Εταιρικό ημερολόγιο Google: δεν θα γίνει ποτέ.",
  απορρίφθηκε: "Σβήστηκε από το Εταιρικό ημερολόγιο Google: δεν θα γίνει ποτέ.",
};

export function E3History({ live }: { live: Live }) {
  const f = live.filming;
  const derived: readonly string[] = [
    `${f.createdAt} · Δημιουργήθηκε από ${f.createdBy} (${f.origin}).`,
    ...(f.approval
      ? [`${f.approval.when} · Εγκρίθηκε από ${f.approval.by}.`]
      : []),
    ...(f.rejection
      ? [
          `${f.rejection.when} · Απορρίφθηκε από ${f.rejection.by}: ${f.rejection.reason}`,
        ]
      : []),
    ...f.sheet.map(
      (v) => `${v.sentAt} · Δελτίο, έκδοση ${v.version}: ${v.change}.`,
    ),
    ...(f.cancellation
      ? [
          `${f.cancellation.when} · Ακυρώθηκε (${f.cancellation.side}) από ${f.cancellation.by}: ${f.cancellation.reason}`,
        ]
      : []),
    ...(f.cancelRequest
      ? [
          `${f.cancelRequest.when} · Αίτημα ακύρωσης από ${f.cancelRequest.by}: ${f.cancelRequest.reason}`,
        ]
      : []),
    ...(f.outcome
      ? [`${f.outcome.when} · Σημειώθηκε «${f.state}» από ${f.outcome.by}.`]
      : []),
  ];
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ιστορικό</h2>
      </div>
      <ul className="list">
        {derived.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {live.log.map((line, index) => (
          <li key={`${index}-${line}`}>
            {TODAY} · {line} <span className="muted">(αυτή η συνεδρία)</span>
          </li>
        ))}
      </ul>
      <p className="note">{GOOGLE_NOTE[f.state]}</p>
    </section>
  );
}
