"use client";

import { useState } from "react";

import {
  CREW_PEOPLE,
  CREW_TEMPLATES,
  personName,
  type CrewResponse,
  type CrewSlot,
  type Filming,
} from "@/data/filming";
import {
  blockedTimeOf,
  clientNameOf,
  personBusyWith,
  productionOf,
  type FilmingCaps,
} from "@/data/filming-access";
import {
  withFilming,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/e3-model";
import { Warning } from "@/screens/e3-ui";

interface PanelProps {
  caps: FilmingCaps;
  live: Live;
  update: UpdateLive;
}

const RESPONSES: readonly CrewResponse[] = [
  "αναμένει",
  "επιβεβαιώνω",
  "δεν μπορώ",
];

const label = (other: Filming): string =>
  `${clientNameOf(other)} (${other.date.slice(8)}/${other.date.slice(5, 7)} ${other.start})`;

function SlotNotes({
  filming,
  personId,
}: {
  filming: Filming;
  personId: string;
}) {
  const busy = personBusyWith(filming, personId);
  const blocked = blockedTimeOf(filming, personId);
  return (
    <>
      {busy.length > 0 && (
        <p className="e3-block">Συγκρούεται με {busy.map(label).join(", ")}.</p>
      )}
      {blocked && (
        <Warning>
          Προσοχή: Κλεισμένος χρόνος «{blocked.label}» {blocked.from}–
          {blocked.to}. Επιτρέπεται, το αποφασίζει η ομάδα.
        </Warning>
      )}
    </>
  );
}

function SlotRow({
  slot,
  filming,
  caps,
  update,
}: { slot: CrewSlot; filming: Filming } & Omit<PanelProps, "live">) {
  const [reason, setReason] = useState(slot.reason ?? "");
  const owner = productionOf(filming)?.ownerId ?? "";
  const respond = (response: CrewResponse, why?: string) =>
    update((l) =>
      withLog(
        withFilming(l, {
          crew: l.filming.crew.map((s) =>
            s.personId === slot.personId ? { ...s, response, reason: why } : s,
          ),
        }),
        response === "δεν μπορώ"
          ? `${personName(slot.personId)}: «δεν μπορώ» (${why}). Ειδοποιήθηκε ο Υπεύθυνος της Παραγωγής, ${personName(owner)}. Το Γύρισμα δεν άλλαξε.`
          : `${personName(slot.personId)}: ${response}.`,
      ),
    );
  const remove = () =>
    update((l) =>
      withLog(
        withFilming(l, {
          crew: l.filming.crew.filter((s) => s.personId !== slot.personId),
        }),
        `Αφαιρέθηκε από το Συνεργείο: ${personName(slot.personId)}.`,
      ),
    );
  return (
    <li className="e3-slot">
      <div className="row">
        <strong>{personName(slot.personId)}</strong>
        <span className="e3-inline">
          <span className="badge">{slot.response}</span>
          {caps.canManageCrew && (
            <button type="button" className="button" onClick={remove}>
              Αφαίρεση
            </button>
          )}
        </span>
      </div>
      {slot.reason && <span className="muted">Λόγος: {slot.reason}</span>}
      <SlotNotes filming={filming} personId={slot.personId} />
      {caps.canManageCrew && (
        <div className="e3-inline">
          <span className="muted">Απάντηση μέλους (προσομοίωση):</span>
          {RESPONSES.filter((r) => r !== "δεν μπορώ").map((r) => (
            <button
              key={r}
              type="button"
              className="button"
              onClick={() => respond(r)}
            >
              {r}
            </button>
          ))}
          <input
            className="input"
            placeholder="λόγος για «δεν μπορώ»"
            aria-label="Λόγος για «δεν μπορώ»"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            type="button"
            className="button"
            disabled={reason.trim() === ""}
            onClick={() => respond("δεν μπορώ", reason.trim())}
          >
            δεν μπορώ
          </button>
        </div>
      )}
    </li>
  );
}

export function E3Crew({ caps, live, update }: PanelProps) {
  const f = live.filming;
  const [picked, setPicked] = useState("");
  const inCrew = new Set(f.crew.map((slot) => slot.personId));
  const isBlocked = (id: string): boolean => personBusyWith(f, id).length > 0;
  const isEditable =
    caps.canManageCrew &&
    (f.state === "προγραμματισμένο" || f.state === "αναμένει έγκριση");
  const addPeople = (ids: readonly string[], why: string) => {
    const allowed = ids.filter((id) => !inCrew.has(id) && !isBlocked(id));
    if (allowed.length === 0) return;
    update((l) =>
      withLog(
        withFilming(l, {
          crew: [
            ...l.filming.crew,
            ...allowed.map((personId) => ({
              personId,
              response: "αναμένει" as const,
            })),
          ],
        }),
        `${why}: ${allowed.map(personName).join(", ")}.`,
      ),
    );
  };
  const candidate = picked && !inCrew.has(picked) ? picked : "";

  return (
    <section className="card">
      <div className="card-title">
        <h2>Συνεργείο</h2>
        <span className="muted">{f.crew.length} άτομα</span>
      </div>
      {f.crew.length === 0 && (
        <p className="muted">Δεν έχει οριστεί Συνεργείο.</p>
      )}
      <ul className="list">
        {f.crew.map((slot) => (
          <SlotRow
            key={slot.personId}
            slot={slot}
            filming={f}
            caps={caps}
            update={update}
          />
        ))}
      </ul>
      {isEditable && (
        <div className="stack">
          <div className="e3-inline">
            <select
              className="select"
              aria-label="Άτομο"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Πρόσθεσε άτομο…</option>
              {CREW_PEOPLE.filter((p) => !inCrew.has(p.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.skill})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button"
              disabled={!candidate || isBlocked(candidate)}
              onClick={() => addPeople([candidate], "Προστέθηκε στο Συνεργείο")}
            >
              Προσθήκη
            </button>
          </div>
          {candidate && <SlotNotes filming={f} personId={candidate} />}
          <div className="e3-inline">
            <span className="muted">Πρότυπο συνεργείου:</span>
            {CREW_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="button"
                onClick={() =>
                  addPeople(template.personIds, `Πρότυπο «${template.name}»`)
                }
              >
                {template.name}
              </button>
            ))}
          </div>
          <p className="muted">
            Ίδιο άτομο σε άλλο ανοιχτό Γύρισμα την ίδια ώρα μπλοκάρεται· ο
            Κλεισμένος χρόνος μόνο προειδοποιεί. Στα πρότυπα, όσοι μπλοκάρονται
            παραλείπονται.
          </p>
        </div>
      )}
      {!caps.canManageCrew && (
        <p className="muted">Μόνο ανάγνωση: δεν διαχειρίζεσαι το Συνεργείο.</p>
      )}
    </section>
  );
}
