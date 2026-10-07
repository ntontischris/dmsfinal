"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { sendMagicLink, signInWithGoogle, signInWithPassword } from "../actions";
import { INITIAL_FORM_STATE } from "../schemas";
import { FormMessage } from "./form-message";

// R9 Είσοδος: email και κωδικός, σύνδεσμος στο email, ή Google. Μόνο για όσους έχουν προσκληθεί.
export function LoginForm({ next }: { next: string }) {
  const [passwordState, passwordAction, isSigningIn] = useActionState(signInWithPassword, INITIAL_FORM_STATE);
  const [linkState, linkAction, isSending] = useActionState(sendMagicLink, INITIAL_FORM_STATE);

  return (
    <div className="grid gap-6">
      <form action={passwordAction} className="grid gap-3">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Κωδικός">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormMessage state={passwordState} />
        <Button variant="primary" type="submit" disabled={isSigningIn}>
          {isSigningIn ? "Είσοδος…" : "Είσοδος"}
        </Button>
        <Link href="/login/reset" className="text-sm text-muted-foreground">
          Ξέχασες τον κωδικό;
        </Link>
      </form>

      <div className="grid gap-3 border-t pt-6">
        <p className="kit-label m-0">Ή χωρίς κωδικό</p>
        <form action={linkAction} className="grid gap-3">
          <input type="hidden" name="next" value={next} />
          <Field label="Email για σύνδεσμο εισόδου">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <FormMessage state={linkState} />
          <Button type="submit" disabled={isSending}>
            {isSending ? "Αποστολή…" : "Στείλε μου σύνδεσμο"}
          </Button>
        </form>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" className="w-full">
            Σύνδεση με Google
          </Button>
        </form>
      </div>
    </div>
  );
}
