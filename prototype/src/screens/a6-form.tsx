"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { TEAM_MEMBERS, memberName } from "@/data/calendar";
import type { BlockedTime } from "@/data/filming";
import { clientNameOf, endTime } from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import {
  blockedFromDraft,
  draftOf,
  filmingConflicts,
  validateDraft,
  type Draft,
} from "@/screens/a6-model";
import { screenHref } from "@/screens/shared";

import "./a6.css";

interface A6FormProps {
  role: RoleId;
  me: string;
  canPickPerson: boolean;
  editing: BlockedTime | null;
  newId: string;
  onSave: (saved: BlockedTime) => void;
  onCancel: () => void;
}

function ConflictWarning({
  role,
  preview,
}: {
  role: RoleId;
  preview: BlockedTime;
}) {
  const conflicts = filmingConflicts(preview);
  if (conflicts.length === 0) return null;
  return (
    <div className="a6-warn" role="status">
      {conflicts.map((filming) => (
        <p key={filming.id}>
          Είσαι στο Συνεργείο του Γυρίσματος {clientNameOf(filming)}{" "}
          {filming.start}–{endTime(filming)}. Ο Κλεισμένος χρόνος δεν σε βγάζει
          από το Συνεργείο· αν δεν μπορείς, δήλωσε «δεν μπορώ» στο Δελτίο.{" "}
          <Link href={screenHref(role, "E6", { id: filming.id })}>
            Άνοιγμα Δελτίου
          </Link>
        </p>
      ))}
    </div>
  );
}

function PersonField({
  draft,
  canPick,
  onChange,
}: {
  draft: Draft;
  canPick: boolean;
  onChange: (personId: string) => void;
}) {
  return (
    <label className="a6-field">
      Άτομο
      {canPick ? (
        <select
          className="select"
          value={draft.personId}
          onChange={(e) => onChange(e.target.value)}
        >
          {TEAM_MEMBERS.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      ) : (
        <input className="input" value={memberName(draft.personId)} readOnly />
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
      <label className="a6-check">
        <input
          type="checkbox"
          checked={draft.allDay}
          onChange={(e) => update({ allDay: e.target.checked })}
        />
        Ολοήμερο
      </label>
      <div className="a6-times">
        <label className="a6-field">
          Μέρα
          <input
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </label>
        {draft.allDay ? (
          <label className="a6-field">
            Έως μέρα (για άδεια)
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

export function A6Form({
  role,
  me,
  canPickPerson,
  editing,
  newId,
  onSave,
  onCancel,
}: A6FormProps) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(editing, me));
  const [error, setError] = useState<string | null>(null);
  const update = (change: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...change }));
  const id = editing?.id ?? newId;
  const build = () => blockedFromDraft(draft, id, me, editing ?? undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateDraft(draft);
    setError(problem);
    if (!problem) onSave(build());
  };

  return (
    <form className="card a6-form" onSubmit={handleSubmit} noValidate>
      <h2 className="card-title">
        {editing ? "Επεξεργασία Κλεισμένου χρόνου" : "Νέος Κλεισμένος χρόνος"}
      </h2>
      <PersonField
        draft={draft}
        canPick={canPickPerson}
        onChange={(personId) => update({ personId })}
      />
      <WhenFields draft={draft} update={update} />
      <label className="a6-field">
        Τίτλος
        <input
          className="input"
          value={draft.label}
          onChange={(e) => update({ label: e.target.value })}
        />
        <span className="muted">
          Τον βλέπουν μόνο εσύ, ο Ιδιοκτήτης και η Διαχείριση. Οι υπόλοιποι
          βλέπουν «Απασχολημένος». Μη γράφεις κάτι ευαίσθητο, π.χ. γράψε
          «Προσωπικό».
        </span>
      </label>
      <p className="note">
        Χωρίς επανάληψη στο v1: κάθε Κλεισμένος χρόνος μπαίνει μία φορά.
      </p>
      <ConflictWarning role={role} preview={build()} />
      {error && (
        <p className="a6-error" role="alert">
          {error}
        </p>
      )}
      <div className="a6-actions">
        <button className="button" type="submit" data-primary="true">
          Αποθήκευση
        </button>
        <button className="button" type="button" onClick={onCancel}>
          Άκυρο
        </button>
        <span className="muted">(prototype: δεν αποθηκεύεται)</span>
      </div>
    </form>
  );
}
