"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import { sendTestEmail } from "../integrations-actions";
import { INITIAL_FORM_STATE } from "../schemas";

// Δοκιμαστικό email μόνο στον λογαριασμό του Ιδιοκτήτη (η βάση το επιβάλλει).
export function TestEmailForm() {
  const [state, action, isSending] = useActionState(sendTestEmail, INITIAL_FORM_STATE);
  return (
    <form action={action} className="grid justify-items-start gap-2">
      <FormMessage state={state} />
      <Button type="submit" disabled={isSending}>
        {isSending ? "Αποστολή…" : "Δοκιμαστικό email στον εαυτό μου"}
      </Button>
    </form>
  );
}
