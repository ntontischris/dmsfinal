"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { Button, type ButtonVariantProps } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { cn } from "@/lib/cn";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

// Φόρμες ενεργειών που ΔΕΝ χάνουν το μήνυμά τους όταν η ενέργεια τις κάνει περιττές (π.χ. μετά το «Αποστολή» το κουμπί
// φεύγει, γιατί η πρόταση δεν είναι πια σε Σύνταξη). Το μήνυμα ζει στο NoticeScope που τις περιέχει και μένει στη θέση του.

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const ScopeContext = createContext<((state: FormState) => void) | null>(null);

interface NoticeScopeProps {
  children: ReactNode;
  className?: string;
  messageAt?: "top" | "bottom";
}

export function NoticeScope({
  children,
  className,
  messageAt = "top",
}: NoticeScopeProps) {
  const [state, setState] = useState<FormState>(INITIAL_FORM_STATE);
  const message = <FormMessage state={state} />;
  return (
    <ScopeContext value={setState}>
      <div className={cn("grid gap-3", className)}>
        {messageAt === "top" && message}
        {children}
        {messageAt === "bottom" && message}
      </div>
    </ScopeContext>
  );
}

interface ScopedFormProps {
  action: Action;
  submitLabel?: string;
  pendingLabel?: string;
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  className?: string;
  resetOnSuccess?: boolean;
  hideSubmit?: boolean; // τα κουμπιά υποβολής τα βάζει η ίδια η φόρμα (π.χ. Εγκρίνω / Απόρριψη)
  children: ReactNode | ((isPending: boolean) => ReactNode);
}

// Μέσα σε NoticeScope το μήνυμα πηγαίνει εκεί· έξω από αυτό φαίνεται κάτω από τη φόρμα, όπως στην ActionForm.
export function ScopedForm({
  action,
  submitLabel = "Αποθήκευση",
  pendingLabel,
  variant = "default",
  size = "md",
  className,
  resetOnSuccess = false,
  hideSubmit = false,
  children,
}: ScopedFormProps) {
  const report = useContext(ScopeContext);
  const run: Action = async (previous, form) => {
    const next = await action(previous, form);
    report?.(next);
    return next;
  };
  const { state, isPending, onSubmit, formRef } = useKeptForm(run, {
    resetOnSuccess,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={cn("grid gap-3", className)}
    >
      {typeof children === "function" ? children(isPending) : children}
      {report ? null : <FormMessage state={state} />}
      {hideSubmit ? null : (
        <div>
          <Button
            type="submit"
            variant={variant}
            size={size}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? `${submitLabel}…`) : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

// Εκτύπωση της προεπισκόπησης: ανοίγει πρώτα το συμπτυγμένο πλαίσιο που τη φέρει.
export function PrintButton({ targetId }: { targetId: string }) {
  const handleClick = () => {
    document.getElementById(targetId)?.setAttribute("open", "");
    window.print();
  };
  return (
    <Button size="sm" onClick={handleClick} className="print:hidden">
      Εκτύπωση
    </Button>
  );
}
