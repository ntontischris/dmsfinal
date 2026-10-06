"use client";

import type { ReactNode } from "react";

import type { Terms } from "@/data/agreements";
import { Field, type SectionProps } from "@/screens/d2-ui";

export interface TermRowProps {
  id: string;
  label: string;
  props: SectionProps;
  text: string;
  defaultText: string;
  input: ReactNode;
  extraHint?: string;
}

// Όρος: πεδίο ή κείμενο, και δίπλα η προεπιλογή όταν άλλαξε (μόνο για την ομάδα).
export function TermRow({
  id,
  label,
  props,
  text,
  defaultText,
  input,
  extraHint,
}: TermRowProps) {
  const isChanged = text !== defaultText && !props.caps.isClient;
  const hint = [isChanged ? `προεπιλογή: ${defaultText}` : "", extraHint ?? ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <Field
      id={id}
      label={label}
      isEditing={props.isEditing}
      value={text}
      input={input}
      hint={hint || undefined}
    />
  );
}

export const termsSetter =
  ({ update }: SectionProps) =>
  (change: Partial<Terms>) =>
    update((d) => ({ ...d, terms: { ...d.terms, ...change } }));
