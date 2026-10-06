"use client";

import { useState } from "react";

import type { RoleId } from "@/data/roles";
import type { G1Row } from "@/screens/g1-rows";
import { G1Table } from "@/screens/g1-table";

import "./g1.css";

export interface G1Person {
  id: string;
  name: string;
}

interface G1TeamProps {
  role: RoleId;
  rows: readonly G1Row[];
  people: readonly G1Person[];
  defaultOwnerId: string;
  canCreate: boolean;
  canManageCost: boolean;
  showCreated: boolean;
  emptyText: string;
}

const estimateLabel = (shoot: string, edit: string): string => {
  const parts = [
    shoot.trim() && `γύρισμα ${shoot.trim()} ώρες`,
    edit.trim() && `μοντάζ ${edit.trim()} ώρες`,
  ].filter(Boolean);
  return parts.length > 0 ? ` (εκτίμηση: ${parts.join(", ")})` : "";
};

const newRow = (id: string, title: string, owner: string): G1Row => ({
  id,
  title,
  client: "Εσωτερική",
  period: "εσωτερική",
  owner,
  deliverables: "—",
  nextFilming: "—",
  state: "ανοιχτή",
  late: 0,
  inReview: 0,
  needsHours: false,
  overrun: false,
});

export function G1Team(props: G1TeamProps) {
  const { role, rows, people, canCreate, canManageCost } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState(props.defaultOwnerId);
  const [shoot, setShoot] = useState("");
  const [edit, setEdit] = useState("");
  const [created, setCreated] = useState<readonly G1Row[]>([]);
  const [lastNote, setLastNote] = useState("");
  const [hasError, setHasError] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") {
      setHasError(true);
      return;
    }
    const owner = people.find((p) => p.id === ownerId)?.name ?? "—";
    const estimate = canManageCost ? estimateLabel(shoot, edit) : "";
    setCreated([
      newRow(`new-${created.length + 1}`, title.trim(), owner),
      ...created,
    ]);
    setLastNote(`«${title.trim()}»${estimate}`);
    setTitle("");
    setShoot("");
    setEdit("");
    setHasError(false);
    setIsOpen(false);
  };

  const shown = props.showCreated ? [...created, ...rows] : rows;

  return (
    <>
      {canCreate && (
        <div className="toolbar">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setIsOpen(!isOpen)}
          >
            Νέα Εσωτερική Παραγωγή
          </button>
          <p className="note">
            Οι Παραγωγές πελάτη ανοίγουν μόνες τους: μία ανά Περίοδο στη
            μηνιαία, μία με την υπογραφή στην εφάπαξ. Δεν φτιάχνονται με το
            χέρι.
          </p>
        </div>
      )}
      {canCreate && isOpen && (
        <form className="card g1-form" onSubmit={handleSubmit}>
          <h2>Νέα Εσωτερική Παραγωγή</h2>
          <label>
            Τίτλος
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={hasError}
            />
          </label>
          {hasError && (
            <p className="note" role="alert">
              Ο Τίτλος είναι υποχρεωτικός.
            </p>
          )}
          <label>
            Υπεύθυνος
            <select
              className="select"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {canManageCost && (
            <div className="g1-hours">
              <label>
                Εκτιμώμενες ώρες γυρίσματος (προαιρετικό)
                <input
                  className="input"
                  inputMode="decimal"
                  value={shoot}
                  onChange={(e) => setShoot(e.target.value)}
                />
              </label>
              <label>
                Εκτιμώμενες ώρες μοντάζ (προαιρετικό)
                <input
                  className="input"
                  inputMode="decimal"
                  value={edit}
                  onChange={(e) => setEdit(e.target.value)}
                />
              </label>
            </div>
          )}
          <button type="submit" className="button" data-primary="true">
            Δημιουργία
          </button>
        </form>
      )}
      {lastNote && (
        <p className="note" role="status">
          Φτιάχτηκε μόνο στη μνήμη του prototype: {lastNote}.
        </p>
      )}
      {shown.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Καμία Παραγωγή εδώ.</h2>
          <div className="muted">{props.emptyText}</div>
        </section>
      ) : (
        <G1Table role={role} rows={shown} />
      )}
    </>
  );
}
