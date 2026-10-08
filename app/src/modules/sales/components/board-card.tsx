"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { moveOpportunityStage } from "../actions-opportunities";
import { formatDate, isForgotten } from "../helpers";
import { NO_MANAGER_LABEL } from "../labels";
import type { ListItem, Opportunity } from "../types";

import { CloseLostForm } from "./close-lost-form";

interface BoardCardProps {
  opportunity: Opportunity;
  stages: readonly ListItem[]; // μόνο τα ενεργά Στάδια
  reasons: readonly ListItem[];
  sourceLabel: string;
  today: string;
  canWork: boolean;
}

// Αλλαγή Σταδίου με την επιλογή, χωρίς κουμπί: η φόρμα υποβάλλεται μόλις αλλάξει η τιμή.
// Η τιμή είναι ελεγχόμενη: αν η αλλαγή αποτύχει, το πεδίο γυρίζει στο Στάδιο που έχει πραγματικά η Ευκαιρία,
// αλλιώς θα έδειχνε Στάδιο που δεν ισχύει δίπλα στο μήνυμα λάθους.
function StageSelect({
  opportunity,
  stages,
}: {
  opportunity: Opportunity;
  stages: readonly ListItem[];
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(moveOpportunityStage);
  const [picked, setPicked] = useState(opportunity.stageId);
  // Όσο τρέχει η υποβολή δείχνει την επιλογή του Χρήστη· αν γύρισε λάθος, το τρέχον Στάδιο.
  const value = !isPending && state.error ? opportunity.stageId : picked;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-1">
      <input type="hidden" name="opportunityId" value={opportunity.id} />
      <Select
        name="stageId"
        aria-label={`Στάδιο: ${opportunity.title}`}
        value={value}
        onChange={(event) => {
          setPicked(event.target.value);
          formRef.current?.requestSubmit();
        }}
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.label}
          </option>
        ))}
      </Select>
      <FormMessage state={state} />
    </form>
  );
}

// Η κάρτα μιας ανοιχτής Ευκαιρίας στο Pipeline: τι είναι, ποιου είναι, τι ακολουθεί και, για όποιον τη δουλεύει, γρήγορες ενέργειες.
export function BoardCard({
  opportunity,
  stages,
  reasons,
  sourceLabel,
  today,
  canWork,
}: BoardCardProps) {
  return (
    <li className="grid gap-2 rounded-sm border bg-background p-3 text-sm">
      <Link
        href={`/app/pipeline/${opportunity.id}`}
        className="font-medium break-words"
      >
        {opportunity.title}
      </Link>
      <span className="break-words">{opportunity.clientName ?? "—"}</span>
      <span className="text-muted-foreground">
        Υπεύθυνος: {opportunity.managerName ?? NO_MANAGER_LABEL}
      </span>
      <span className="text-muted-foreground">Πηγή: {sourceLabel}</span>
      {opportunity.nextStepDue && (
        <span className="break-words">
          {opportunity.nextStep} ({formatDate(opportunity.nextStepDue)})
        </span>
      )}
      {isForgotten(opportunity, today) && (
        <div>
          <Badge tone="attention">Ξεχασμένη</Badge>
        </div>
      )}
      {canWork && (
        <>
          <StageSelect opportunity={opportunity} stages={stages} />
          <CloseLostForm
            opportunityId={opportunity.id}
            reasons={reasons}
            title={opportunity.title}
            size="sm"
          />
        </>
      )}
    </li>
  );
}
