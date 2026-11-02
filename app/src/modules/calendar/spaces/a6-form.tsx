"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { saveBlockedTime } from "../actions-blocked";
import type { BlockedTimeValues } from "../components/blocked-time-form";
import type { CalendarMember } from "../types";
import { draftOf, formFieldsOf, validateDraft, type Draft } from "./a6-model";

// Η φόρμα του prototype (`screens/a6-form.tsx`) με την πραγματική αποθήκευση (saveBlockedTime). Μετά την επιτυχία
// ο server γυρνά στην εβδομάδα της μέρας. Η προειδοποίηση «είσαι στο Συνεργείο» του prototype λείπει: η οθόνη δεν
// έχει τα Συνεργεία στα χέρια της.

interface A6FormProps {
  id: string | null;
  values: BlockedTimeValues;
  people: readonly CalendarMember[];
  personName: string | null;
  canPickPerson: boolean;
  cancelHref: string;
}

function PersonField({
  draft,
  people,
  personName,
  canPick,
  onChange,
}: {
  draft: Draft;
  people: readonly CalendarMember[];
  personName: string | null;
  canPick: boolean;
  onChange: (personId: string) => void;
}) {
  if (!canPick && !personName) return null;
  return (
    <label className="a6-field">
      Άτομο
      {canPick ? (
        <select
          className="select"
          value={draft.personId}
          onChange={(e) => onChange(e.target.value)}
        >
          {people.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      ) : (
        <input className="input" value={personName ?? ""} readOnly />
      )}
    </label>
  );
}

function WhenFields({
  draft,
  update,
}: {
  draft: Draft;
  update: (change: Partial<Draft>) => void;
}) {
  return (
    <>
      <fieldset className="a6-kind">
        <legend>Πόσο διαρκεί;</legend>
        <label className="a6-check">
          <input
            type="radio"
            name="a6-kind"
            checked={draft.allDay}
            onChange={() => update({ allDay: true })}
          />
          Μία ή περισσότερες ολόκληρες μέρες (π.χ. άδεια)
        </label>
        <label className="a6-check">
          <input
            type="radio"
            name="a6-kind"
            checked={!draft.allDay}
            onChange={() => update({ allDay: false })}
          />
          Μερικές ώρες (π.χ. γιατρός)
        </label>
      </fieldset>
      <div className="a6-times">
        <label className="a6-field">
          {draft.allDay ? "Από μέρα" : "Μέρα"}
          <input
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </label>
        {draft.allDay ? (
          <label className="a6-field">
            Έως μέρα (κενό αν είναι μία)
            <input
              className="input"
              type="date"
              value={draft.untilDate}
              onChange={(e) => update({ untilDate: e.target.value })}
            />
          </label>
        ) : (
          <>
            <label className="a6-field">
              Από
              <input
                className="input"
                type="time"
                value={draft.from}
                onChange={(e) => update({ from: e.target.value })}
              />
            </label>
            <label className="a6-field">
              Έως
              <input
                className="input"
                type="time"
                value={draft.to}
                onChange={(e) => update({ to: e.target.value })}
              />
            </label>
          </>
        )}
      </div>
    </>
  );
}

export function A6Form(props: A6FormProps) {
  const { id, canPickPerson } = props;
  const [draft, setDraft] = useState<Draft>(() => draftOf(props.values));
  const [problem, setProblem] = useState<string | null>(null);
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveBlockedTime);
  const update = (change: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...change }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const found = validateDraft(draft);
    setProblem(found);
    if (found) return event.preventDefault();
    onSubmit(event);
  };
  const error = problem ?? state.error ?? null;

  return (
    <form
      ref={formRef}
      className="card a6-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {id && <input type="hidden" name="id" value={id} />}
      {Object.entries(formFieldsOf(draft, canPickPerson)).map(
        ([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ),
      )}
      <h2 className="card-title">
        {id
          ? "Αλλαγή ρεπό / άδειας"
          : canPickPerson
            ? "Ρεπό / Άδεια / Μη διαθέσιμος"
            : "Ρεπό / Άδεια / Δεν είμαι διαθέσιμος"}
      </h2>
      <p className="muted a6-intro">
        Ρεπό, άδεια, γιατρός ή ραντεβού: ό,τι σε κρατά μακριά από τη δουλειά.
        Όποιος φτιάχνει Συνεργείο βλέπει ότι το άτομο δεν είναι διαθέσιμο. Για
        υπενθύμιση σε πελάτη, βάλε Επόμενο βήμα στην Ευκαιρία του.
      </p>
      <PersonField
        draft={draft}
        people={props.people}
        personName={props.personName}
        canPick={canPickPerson}
        onChange={(personId) => update({ personId })}
      />
      <WhenFields draft={draft} update={update} />
      <label className="a6-field">
        Τίτλος
        <input
          className="input"
          maxLength={120}
          value={draft.label}
          onChange={(e) => update({ label: e.target.value })}
        />
        <span className="muted">
          Φαίνεται μόνο σε εσένα και σε όσους κλείνουν χρόνο άλλων. Οι υπόλοιποι
          βλέπουν «Απασχολημένος». Μη γράφεις κάτι ευαίσθητο, π.χ. γράψε
          «Προσωπικό».
        </span>
      </label>
      <p className="note">
        Κάθε ρεπό ή άδεια μπαίνει μία φορά· δεν επαναλαμβάνεται μόνο του.
      </p>
      {error && (
        <p className="a6-error" role="alert">
          {error}
        </p>
      )}
      <div className="a6-actions">
        <button
          className="button"
          type="submit"
          data-primary="true"
          disabled={isPending}
        >
          {isPending ? "Αποθήκευση…" : "Αποθήκευση"}
        </button>
        <Link className="button" href={props.cancelHref}>
          Άκυρο
        </Link>
      </div>
    </form>
  );
}
