import type { ReactNode, TextareaHTMLAttributes } from "react";

import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";

// Μικρά κομμάτια που μοιράζονται οι ενότητες της D2: ένα πεδίο είναι πεδίο για όποιον μπορεί να το αλλάξει και
// απλό κείμενο, στο ίδιο σημείο, για τους άλλους. Η υπόδειξη μένει έξω από την ετικέτα, ώστε το όνομα του πεδίου
// να είναι ακριβώς η ετικέτα του.

const TEXTAREA =
  "w-full min-w-0 rounded-sm border border-input bg-background px-3 py-1.5 text-sm leading-snug text-foreground hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(TEXTAREA, "min-h-20", className)} {...props} />
  );
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}

// Το ποσό με κόμμα και δύο δεκαδικά, όπως το γράφει όποιος έχει ελληνικό πληκτρολόγιο.
export const moneyInput = (amount: number): string =>
  amount.toFixed(2).replace(".", ",");

// Αριθμός για πεδίο: ώρες με κόμμα ως υποδιαστολή.
export const decimalInput = (value: number): string =>
  String(value).replace(".", ",");

interface FieldWithHintProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function FieldWithHint({ label, hint, children }: FieldWithHintProps) {
  return (
    <div className="grid max-w-md content-start gap-1">
      <Field label={label}>{children}</Field>
      {hint && <MutedNote>{hint}</MutedNote>}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

interface CheckFieldProps {
  name: string;
  label: string;
  defaultChecked: boolean;
  hint?: ReactNode;
}

export function CheckField({
  name,
  label,
  defaultChecked,
  hint,
}: CheckFieldProps) {
  return (
    <div className="grid content-start gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="accent-primary"
        />
        {label}
      </label>
      {hint && <MutedNote>{hint}</MutedNote>}
    </div>
  );
}

export function ReadOnlyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="kit-label">{label}</dt>
      <dd className="m-0 text-sm">{children}</dd>
    </div>
  );
}

export function ReadOnlyList({ children }: { children: ReactNode }) {
  return <dl className="m-0 grid gap-3 sm:grid-cols-2">{children}</dl>;
}

export const yesNo = (value: boolean): string => (value ? "ναι" : "όχι");

export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;
