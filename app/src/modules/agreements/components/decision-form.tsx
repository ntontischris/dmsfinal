"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

import { decideApproval } from "../actions-flow";

import { ScopedForm } from "./agreement-actions-parts";
import { Textarea } from "./terms-section-parts";

type Decision = "approve" | "reject";

// «Εγκρίνω» / «Απόρριψη» με κοινό σχόλιο, για τη D2 και τη D4. Το κουμπί που πατήθηκε θυμάται την απόφαση
// πριν σταλεί η φόρμα (η υποβολή δεν μεταφέρει το κουμπί). Το σχόλιο είναι υποχρεωτικό μόνο στην Απόρριψη, και το ελέγχει ο server.
export function DecisionForm({ agreementId }: { agreementId: string }) {
  const decision = useRef<Decision>("approve");
  const decide = (previous: FormState, form: FormData): Promise<FormState> => {
    form.set("decision", decision.current);
    return decideApproval(previous, form);
  };
  const choose = (value: Decision) => () => {
    decision.current = value;
  };
  return (
    <ScopedForm action={decide} hideSubmit>
      {(isPending) => (
        <>
          <input type="hidden" name="agreementId" value={agreementId} />
          <Field label="Σχόλιο">
            <Textarea name="comment" rows={3} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              onClick={choose("approve")}
            >
              Εγκρίνω
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isPending}
              onClick={choose("reject")}
            >
              Απόρριψη
            </Button>
          </div>
        </>
      )}
    </ScopedForm>
  );
}
