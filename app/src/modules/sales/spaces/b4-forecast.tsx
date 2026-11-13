"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { setForecast, setOpportunityManager } from "../actions-forecast";
import type { AssignableUser, OpportunityForecast } from "../types";
import { SpacesActionForm, SpacesField } from "./spaces-form";

// B4 · Πρόβλεψη (b3): Αξία, Πιθανότητα, πότε περιμένουμε να κλείσει. Κενό = η Αξία από την πρόταση, η Πιθανότητα
// του Σταδίου. Χωρίς «Βλέπει ποσά» το πεδίο Αξίας δεν φαίνεται και η Αξία μένει όπως είναι.
export function ForecastEditor({
  opportunityId,
  forecast,
  stageProbability,
  canSeeAmounts,
}: {
  opportunityId: string;
  forecast: OpportunityForecast;
  stageProbability: number | null;
  canSeeAmounts: boolean;
}) {
  return (
    <SpacesActionForm
      action={setForecast}
      submitLabel="Αποθήκευση πρόβλεψης"
      isPrimary={false}
      className="stack"
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {canSeeAmounts ? (
        <SpacesField label="Αξία € (κενό = από την πρόταση)">
          <input
            className="input"
            name="value"
            inputMode="decimal"
            defaultValue={forecast.estimate ?? ""}
          />
        </SpacesField>
      ) : (
        <input type="hidden" name="keepValue" value="1" />
      )}
      <SpacesField label="Πιθανότητα % (κενό = του Σταδίου)">
        <input
          className="input"
          name="probability"
          inputMode="numeric"
          placeholder={
            stageProbability === null ? "" : String(stageProbability)
          }
          defaultValue={forecast.probability ?? ""}
        />
      </SpacesField>
      <SpacesField label="Αναμενόμενο κλείσιμο">
        <input
          className="input"
          type="date"
          name="expectedClose"
          defaultValue={forecast.expectedClose ?? ""}
        />
      </SpacesField>
    </SpacesActionForm>
  );
}

// B4 · Υπεύθυνος (b2): η Ευκαιρία περνά σε άλλον με μία επιλογή. Ο Υπεύθυνος του Πελάτη δεν αλλάζει.
export function ManagerChange({
  opportunityId,
  managerId,
  candidates,
}: {
  opportunityId: string;
  managerId: string;
  candidates: readonly AssignableUser[];
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    setOpportunityManager,
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="btn-row">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <select
        className="select"
        aria-label="Υπεύθυνος Ευκαιρίας"
        name="userId"
        defaultValue={managerId}
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {candidates.map((candidate) => (
          <option key={candidate.userId} value={candidate.userId}>
            {candidate.name}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
      {state.notice && (
        <span className="note" role="status">
          {state.notice}
        </span>
      )}
    </form>
  );
}
