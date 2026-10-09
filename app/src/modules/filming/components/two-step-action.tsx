"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";

import { ActionForm } from "./action-form";

interface TwoStepActionProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  triggerLabel: string;
  confirmLabel: string;
  question: string;
  children: ReactNode;
}

// Ενέργεια που καίει Παροχή: πρώτα το κουμπί, μετά η ερώτηση με «Ναι» και «Άκυρο». Ίδιο μοτίβο με την απενεργοποίηση ομάδας.
export function TwoStepAction({
  action,
  triggerLabel,
  confirmLabel,
  question,
  children,
}: TwoStepActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming)
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setIsConfirming(true)}>
        {triggerLabel}
      </Button>
    );
  return (
    <ActionForm action={action} submitLabel={confirmLabel} variant="danger" size="sm">
      {children}
      <p className="m-0 text-sm">{question}</p>
      <Button type="button" size="sm" onClick={() => setIsConfirming(false)}>
        Άκυρο
      </Button>
    </ActionForm>
  );
}
