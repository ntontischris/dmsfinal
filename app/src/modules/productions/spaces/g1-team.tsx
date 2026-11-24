"use client";

import { useState } from "react";

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
    <form ref={formRef} className="ml-box g1-new" onSubmit={onSubmit}>
      <h2 className="ml-box-title">Νέα Εσωτερική Παραγωγή</h2>
      <div className="ml-fields">
        <label className="ml-field">
          <span>Τίτλος</span>
          <input
            className="input"
            name="title"
            autoComplete="off"
            aria-invalid={!!state.error}
          />
        </label>
        <label className="ml-field">
          <span>Υπεύθυνος</span>
          <select
            className="input"
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
        {state.error && (
          <p className="note" role="alert" data-wide>
            {state.error}
          </p>
        )}
        {state.notice && (
          <p className="note" role="status">
            {state.notice}
          </p>
        )}
        <div className="ml-actions">
          <button type="submit" data-primary="true" disabled={isPending}>
            {isPending ? "Δημιουργία…" : "Δημιουργία"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function G1Team(props: G1TeamProps) {
  const { rows, people, canCreate } = props;
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {canCreate && (
        <header className="ml-head">
          <p>
            Οι Παραγωγές πελάτη ανοίγουν μόνες τους: μία ανά Περίοδο στη
            μηνιαία, μία με την υπογραφή στην εφάπαξ. Δεν φτιάχνονται με το
            χέρι.
          </p>
          <div className="ml-quick">
            <button
              type="button"
              data-primary="true"
              aria-expanded={isOpen}
              onClick={() => setIsOpen(!isOpen)}
            >
              Νέα Εσωτερική Παραγωγή
            </button>
          </div>
        </header>
      )}
      {canCreate && isOpen && (
        <NewInternalForm
          people={people}
          defaultOwnerId={props.defaultOwnerId}
        />
      )}
      {rows.length === 0 ? (
        <p className="ml-empty" role="status">
          <strong>Καμία Παραγωγή εδώ.</strong> {props.emptyText}
        </p>
      ) : (
        <G1Table rows={rows} />
      )}
    </>
  );
}
