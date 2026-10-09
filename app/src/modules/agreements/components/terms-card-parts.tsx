import type { ReactNode } from "react";

import { Field, Select } from "@/components/ui/field";

// Μικρά κομμάτια που μοιράζονται οι κάρτες της O3 (Όροι, Πολιτική Γυρισμάτων, Τιμολόγηση).

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό τα πεδία είναι κειμένου.
export const decimalText = (value: number): string =>
  String(value).replace(".", ",");

export function CardNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}

// «ναι»/«όχι» για τις ρυθμίσεις που είναι διακόπτες (στέλνει "yes" ή "no").
export function YesNoField({
  name,
  label,
  isYes,
}: {
  name: string;
  label: string;
  isYes: boolean;
}) {
  return (
    <Field label={label}>
      <Select name={name} defaultValue={isYes ? "yes" : "no"}>
        <option value="yes">ναι</option>
        <option value="no">όχι</option>
      </Select>
    </Field>
  );
}
