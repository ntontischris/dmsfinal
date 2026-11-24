"use client";

import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { applyCrewTemplate, setFilmingCrew } from "../actions-crew";
import type { CrewMember, CrewTemplate, FilmingCard, NamedRef } from "../types";
import { countLabel } from "./e1-format";
import { RESPONSE_WORDS, emptyCrewNote, isOpenState } from "./e3-model";
import { useRun } from "./e3-run";
import { responseTone } from "./e3-model";
import { LastDone, Warning } from "./e3-ui";
import { Box, Line, Lines } from "./ml-parts";

// Το Συνεργείο του Γυρίσματος (prototype `screens/e3-crew.tsx`). Η βάση ορίζει το Συνεργείο ολόκληρο (filming_crew_set)·
// «Προσθήκη» και «Αφαίρεση» στέλνουν τη νέα λίστα. Την απάντηση τη γράφει μόνο το ίδιο το μέλος (E6).

interface E3CrewProps {
  card: FilmingCard;
  candidates: readonly NamedRef[];
  templates: readonly CrewTemplate[];
  // Όσοι έχουν Κλεισμένο χρόνο που τέμνει το Γύρισμα (μόνο προειδοποίηση).
  blockedIds: readonly string[];
  canApprove: boolean;
}

function SlotRow({
  slot,
  isEditable,
  isPending,
  onRemove,
}: {
  slot: CrewMember;
  isEditable: boolean;
  isPending: boolean;
  onRemove: () => void;
}) {
  const word = RESPONSE_WORDS[slot.response];
  return (
    <>
      <Line
        thumb={slot.name}
        title={slot.name}
        tag={<Badge tone={responseTone(word)}>Απάντηση: {word}</Badge>}
        aside={
          isEditable && (
            <button
              type="button"
              aria-label={`Αφαίρεση: ${slot.name}`}
              disabled={isPending}
              onClick={onRemove}
            >
              Αφαίρεση
            </button>
          )
        }
      />
      {(slot.reason || slot.isBlocked) && (
        <li className="e3-slot">
          {slot.reason && <span className="muted">Λόγος: {slot.reason}</span>}
          {slot.isBlocked && (
            <Warning>
              Προσοχή: έχει Κλεισμένο χρόνο που πέφτει πάνω στο Γύρισμα.
              Επιτρέπεται, το αποφασίζει η ομάδα.
            </Warning>
          )}
        </li>
      )}
    </>
  );
}

export function E3Crew({
  card,
  candidates,
  templates,
  blockedIds,
  canApprove,
}: E3CrewProps) {
  const [picked, setPicked] = useState("");
  const { run, isPending, result } = useRun();
  const crewIds = card.crew.map((slot) => slot.userId);
  const inCrew = new Set(crewIds);
  const blocked = new Set(blockedIds);
  const isEditable = card.viewerCan.crew && isOpenState(card.state);
  const setCrew = (userIds: readonly string[]) =>
    run(setFilmingCrew, { filmingId: card.id, userId: userIds });
  const candidate = picked && !inCrew.has(picked) ? picked : "";

  return (
    <Box
      title="Συνεργείο"
      hint={countLabel(card.crew.length, "άτομο", "άτομα")}
    >
      {card.crew.length === 0 && (
        <p className="muted">{emptyCrewNote(card.state, canApprove)}</p>
      )}
      <Lines label="Συνεργείο">
        {card.crew.map((slot) => (
          <SlotRow
            key={slot.userId}
            slot={slot}
            isEditable={isEditable}
            isPending={isPending}
            onRemove={() => setCrew(crewIds.filter((id) => id !== slot.userId))}
          />
        ))}
      </Lines>
      {card.vacancies.map((vacancy) => (
        <Warning key={vacancy.userId}>
          Άδειασε θέση: {vacancy.name} απενεργοποιήθηκε. Βάλε κάποιον άλλο.
        </Warning>
      ))}
      {isEditable && (
        <div className="fl-box-body">
          <div className="ml-quick fl-row e3-inline">
            <select
              className="input"
              aria-label="Άτομο"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Πρόσθεσε άτομο…</option>
              {candidates
                .filter((person) => !inCrew.has(person.id))
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {blocked.has(person.id) ? " · Κλεισμένος χρόνος" : ""}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!candidate || isPending}
              onClick={() => {
                setCrew([...crewIds, candidate]);
                setPicked("");
              }}
            >
              Προσθήκη
            </button>
          </div>
          {candidate && blocked.has(candidate) && (
            <Warning>
              Προσοχή: έχει Κλεισμένο χρόνο που πέφτει πάνω στο Γύρισμα.
              Επιτρέπεται, το αποφασίζει η ομάδα.
            </Warning>
          )}
          {templates.length > 0 && (
            <div className="ml-quick fl-row e3-inline">
              <span className="muted">Πρότυπο συνεργείου:</span>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(applyCrewTemplate, {
                      filmingId: card.id,
                      templateId: template.id,
                    })
                  }
                >
                  {template.name}
                </button>
              ))}
            </div>
          )}
          <p className="muted">
            Ίδιο άτομο σε άλλο ανοιχτό Γύρισμα την ίδια ώρα μπλοκάρεται· ο
            Κλεισμένος χρόνος μόνο προειδοποιεί. Στα πρότυπα, όσοι μπλοκάρονται
            παραλείπονται.
          </p>
        </div>
      )}
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {!card.viewerCan.crew && (
        <p className="muted">
          Μόνο ανάγνωση: το Συνεργείο το διαχειρίζεται ο Υπεύθυνος.
        </p>
      )}
      {card.viewerCan.crew && !isEditable && (
        <p className="muted">
          Το Γύρισμα έκλεισε· το Συνεργείο δεν αλλάζει πια.
        </p>
      )}
    </Box>
  );
}
