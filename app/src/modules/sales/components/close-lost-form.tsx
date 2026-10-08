"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

import { closeOpportunityLost } from "../actions-opportunities";
import type { ListItem } from "../types";

import { ActionForm } from "./action-form";

interface CloseLostFormProps {
  opportunityId: string;
  reasons: readonly ListItem[];
  title?: string; // στην κάρτα του Pipeline: το πεδίο δεν έχει ορατή ετικέτα, οπότε το όνομά του λέει ποια Ευκαιρία
  size?: "md" | "sm";
}

function LossReasonSelect({
  reasons,
  title,
}: {
  reasons: readonly ListItem[];
  title?: string;
}) {
  return (
    <Select
      name="lossReasonId"
      defaultValue=""
      required
      aria-label={title ? `Λόγος απώλειας: ${title}` : undefined}
    >
      <option value="" disabled>
        Διάλεξε Λόγο απώλειας
      </option>
      {reasons
        .filter((reason) => !reason.isRetired)
        .map((reason) => (
          <option key={reason.id} value={reason.id}>
            {reason.label}
          </option>
        ))}
    </Select>
  );
}

// Το κλείσιμο ως χαμένη δεν αναιρείται, γι' αυτό είναι δύο βήματα: πρώτα ανοίγει η επιλογή Λόγου απώλειας, μετά η επιβεβαίωση.
export function CloseLostForm({
  opportunityId,
  reasons,
  title,
  size = "md",
}: CloseLostFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const select = <LossReasonSelect reasons={reasons} title={title} />;
  return (
    <div className="grid gap-2">
      <div>
        <Button
          size={size}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          Κλείσιμο ως χαμένη
        </Button>
      </div>
      {isOpen && (
        <ActionForm
          action={closeOpportunityLost}
          submitLabel="Επιβεβαίωση κλεισίματος"
          pendingLabel="Κλείσιμο…"
          variant="danger"
          size={size}
        >
          <input type="hidden" name="opportunityId" value={opportunityId} />
          {title ? select : <Field label="Λόγος απώλειας">{select}</Field>}
        </ActionForm>
      )}
    </div>
  );
}
