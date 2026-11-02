"use client";

import { useRef, useState } from "react";

import type { FormState } from "@/lib/form-state";

import { decideApproval, newRevision } from "../actions-flow";
import type { AgreementDetail } from "../types";
import { D2Form, IdField } from "./d2-ui";

// Έγκριση και νέα αναθεώρηση (prototype `screens/d2-actions.tsx`), με τα πραγματικά actions.

type Decision = "approve" | "reject";

// «Εγκρίνω» / «Απορρίπτω» με κοινό σχόλιο· το κουμπί θυμάται την απόφαση πριν σταλεί η φόρμα (όπως η σημερινή σελίδα).
export function ApprovalActions({ agreementId }: { agreementId: string }) {
  const decision = useRef<Decision>("approve");
  const decide = (previous: FormState, form: FormData) => {
    form.set("decision", decision.current);
    return decideApproval(previous, form);
  };
  return (
    <D2Form action={decide} hideSubmit className="btn-row">
      {(isPending) => (
        <>
          <IdField id={agreementId} />
          <input
            className="input grow"
            name="comment"
            aria-label="Σχόλιο Εγκριτή"
            placeholder="Σχόλιο (υποχρεωτικό στην απόρριψη)"
            autoComplete="off"
          />
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
            onClick={() => (decision.current = "approve")}
          >
            Εγκρίνω
          </button>
          <button
            type="submit"
            className="button"
            data-danger="true"
            disabled={isPending}
            onClick={() => (decision.current = "reject")}
          >
            Απορρίπτω
          </button>
        </>
      )}
    </D2Form>
  );
}

export function RevisionButton({ agreement }: { agreement: AgreementDetail }) {
  const [isAsking, setIsAsking] = useState(false);
  const next = agreement.revision + 1;
  const warning =
    agreement.path === "sent"
      ? `Θα γίνει αναθεώρηση ${next} και οι σύνδεσμοι θα ακυρωθούν· αν η αλλαγή προσθέτει ή βαθαίνει Παρέκκλιση θα θέλει νέα Έγκριση.`
      : `Θα γίνει αναθεώρηση ${next} με νέα Ισχύς· οι παλιοί Σύνδεσμοι ακυρώνονται.`;
  if (!isAsking)
    return (
      <button
        type="button"
        className="button"
        onClick={() => setIsAsking(true)}
      >
        Νέα αναθεώρηση
      </button>
    );
  return (
    <span className="d2-ask">
      <span className="muted">{warning}</span>
      <D2Form action={newRevision} hideSubmit>
        {(isPending) => (
          <>
            <IdField id={agreement.id} />
            <input
              className="input"
              name="summary"
              aria-label="Τι αλλάζει (προαιρετικά)"
              placeholder="Τι αλλάζει (προαιρετικά)"
              autoComplete="off"
            />
            <span className="btn-row">
              <button
                type="submit"
                className="button"
                data-primary="true"
                disabled={isPending}
              >
                Συνέχεια
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setIsAsking(false)}
              >
                Άκυρο
              </button>
            </span>
          </>
        )}
      </D2Form>
    </span>
  );
}
