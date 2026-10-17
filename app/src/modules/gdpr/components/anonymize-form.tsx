"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { anonymizeSubject } from "../actions";
import { ERASED_TEXT, KEPT_TEXT } from "../labels";
import type { PersonKind } from "../schemas";

interface AnonymizeFormProps {
  subjectKind: PersonKind;
  subjectId: string;
  name: string;
}

// Ν8: μη αναστρέψιμη, σε δύο βήματα. Το κουμπί ανοίγει μόνο όταν το όνομα ταιριάζει ακριβώς· η βάση το ξαναελέγχει.
export function AnonymizeForm({
  subjectKind,
  subjectId,
  name,
}: AnonymizeFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(anonymizeSubject);
  const [isConfirming, setIsConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  if (state.notice) return <FormMessage state={state} />;
  if (!isConfirming)
    return (
      <div>
        <Button variant="danger" onClick={() => setIsConfirming(true)}>
          Ανωνυμοποίηση
        </Button>
      </div>
    );
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      role="alertdialog"
      aria-label={`Ανωνυμοποίηση: ${name}`}
      className="grid max-w-xl justify-items-start gap-3 rounded-sm border border-destructive/55 px-3 py-3"
    >
      <input type="hidden" name="subjectKind" value={subjectKind} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <p className="m-0 text-sm font-medium">
        Ανωνυμοποίηση: {name}. Μη αναστρέψιμη, δεν υπάρχει αναίρεση.
      </p>
      <p className="m-0 text-sm">
        <strong>Σβήνονται:</strong> {ERASED_TEXT}
      </p>
      <p className="m-0 text-sm text-muted-foreground">
        <strong>Μένουν:</strong> {KEPT_TEXT}
      </p>
      <Field label={`Γράψε «${name}» για επιβεβαίωση`}>
        <Input
          name="typedName"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          type="submit"
          disabled={isPending || typed.trim() !== name.trim()}
        >
          {isPending ? "Ανωνυμοποίηση…" : "Ανωνυμοποίηση οριστικά"}
        </Button>
        <Button onClick={() => setIsConfirming(false)}>Άκυρο</Button>
      </div>
    </form>
  );
}
