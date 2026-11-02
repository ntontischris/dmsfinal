"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { useKeptForm } from "@/lib/use-kept-form";

import { createInternalProduction } from "../actions-create";
import type { OwnerCandidate } from "../types";
import type { G1Row } from "./g1-rows";
import { G1Table } from "./g1-table";

import "./g1.css";

interface G1TeamProps {
  rows: readonly G1Row[];
  people: readonly OwnerCandidate[];
  defaultOwnerId: string;
  canCreate: boolean;
  emptyText: string;
}

// Η νέα Εσωτερική Παραγωγή (prototype `g1-team.tsx`) πάνω στην πραγματική ενέργεια: μετά τη δημιουργία ανοίγει η σελίδα της.
// Οι εκτιμώμενες ώρες του prototype λείπουν: η εκτίμηση γράφεται στο «Κόστος και ώρες» της Παραγωγής.
function NewInternalForm({
  people,
  defaultOwnerId,
}: Pick<G1TeamProps, "people" | "defaultOwnerId">) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    createInternalProduction,
  );
  return (
    <form ref={formRef} className="g1-form-wrap" onSubmit={onSubmit}>
      <Panel label="Νέα Εσωτερική Παραγωγή">
        <div className="e-form">
          <label>
            Τίτλος
            <input
              className="input"
              name="title"
              autoComplete="off"
              aria-invalid={!!state.error}
            />
          </label>
          {state.error && (
            <p className="note" role="alert">
              {state.error}
            </p>
          )}
          <label>
            Υπεύθυνος
            <select
              className="select"
              name="ownerId"
              defaultValue={defaultOwnerId}
            >
              <option value="">Χωρίς υπεύθυνο</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          {state.notice && (
            <p className="note" role="status">
              {state.notice}
            </p>
          )}
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
          >
            {isPending ? "Δημιουργία…" : "Δημιουργία"}
          </button>
        </div>
      </Panel>
    </form>
  );
}

export function G1Team(props: G1TeamProps) {
  const { rows, people, canCreate } = props;
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {canCreate && (
        <div className="toolbar">
          <button
            type="button"
            className="button"
            data-primary="true"
            aria-expanded={isOpen}
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
        <NewInternalForm
          people={people}
          defaultOwnerId={props.defaultOwnerId}
        />
      )}
      {rows.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Καμία Παραγωγή εδώ.</h2>
          <div className="muted">{props.emptyText}</div>
        </section>
      ) : (
        <G1Table rows={rows} />
      )}
    </>
  );
}
