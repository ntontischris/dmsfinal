import type { ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

// Μικρά κομμάτια που μοιράζονται οι φόρμες της σελίδας στοιχείου (C2) και της δημιουργίας:
// ένα πεδίο είναι πεδίο για όποιον μπορεί να το αλλάξει και απλό κείμενο, στο ίδιο σημείο, για τους άλλους.
// Η ετικέτα μένει χωριστά από την υπόδειξη, ώστε το όνομα του πεδίου να είναι ακριβώς η ετικέτα.

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

// Το ποσό με κόμμα και δύο δεκαδικά, όπως το γράφει όποιος έχει ελληνικό πληκτρολόγιο.
export const moneyInput = (amount: number): string =>
  amount.toFixed(2).replace(".", ",");

export const hintId = (id: string): string => `${id}-hint`;

function Hint({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <span id={hintId(id)} className="text-sm text-muted-foreground">
      {children}
    </span>
  );
}

interface FormRowProps {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode; // το πεδίο (με id = id)
}

export function FormRow({ id, label, hint, children }: FormRowProps) {
  return (
    <div className="grid max-w-md content-start gap-1.5">
      <label htmlFor={id} className="kit-label">
        {label}
      </label>
      {children}
      <Hint id={id}>{hint}</Hint>
    </div>
  );
}

interface ReadOnlyRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode; // η τιμή ως κείμενο
}

export function ReadOnlyRow({ label, hint, children }: ReadOnlyRowProps) {
  return (
    <div className="grid max-w-md content-start gap-1.5">
      <span className="kit-label">{label}</span>
      <span className="text-sm">{children}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  );
}

// Πεδίο με κατάληξη δίπλα (π.χ. «€ / μήνα»).
export function WithSuffix({
  suffix,
  children,
}: {
  suffix: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}
