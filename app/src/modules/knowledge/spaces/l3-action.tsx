"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import {
  coverUnanswered,
  ignoreUnanswered,
  reopenUnanswered,
} from "../assistant-actions";

// Οι ενέργειες της L3 ως ένα κουμπί του prototype (`L3.tsx`). Μετά την επιτυχία η ενέργεια γυρίζει στη λίστα (?done=…)·
// αν η βάση πει όχι, το λάθος φαίνεται δίπλα.
const ACTIONS = {
  cover: coverUnanswered,
  ignore: ignoreUnanswered,
  reopen: reopenUnanswered,
} as const;

interface L3ActionProps {
  kind: keyof typeof ACTIONS;
  fields: Readonly<Record<string, string>>;
  label: string;
  tone?: "primary" | "danger";
  isDisabled?: boolean;
}

export function L3Action({
  kind,
  fields,
  label,
  tone,
  isDisabled = false,
}: L3ActionProps) {
  const [state, dispatch, isPending] = useActionState(
    ACTIONS[kind],
    INITIAL_FORM_STATE,
  );
  return (
    <form action={dispatch} className="btn-row">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="button"
        data-primary={tone === "primary" ? "true" : undefined}
        data-danger={tone === "danger" ? "true" : undefined}
        disabled={isPending || isDisabled}
      >
        {label}
      </button>
      {state.error && (
        <span className="part-sub" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
