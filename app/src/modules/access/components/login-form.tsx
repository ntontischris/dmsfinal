"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Field, Input } from "@/components/ui/field";
import { useKeptForm } from "@/lib/use-kept-form";

import { sendMagicLink, signInWithGoogle, signInWithPassword } from "../actions";

// R9 Είσοδος: email και κωδικός, σύνδεσμος στο email, ή Google. Μόνο για όσους έχουν προσκληθεί.
export function LoginForm({ next }: { next: string }) {
  const { state: passwordState, isPending: isSigningIn, onSubmit: passwordAction, formRef: passwordActionRef } = useKeptForm(signInWithPassword);
  const { state: linkState, isPending: isSending, onSubmit: linkAction, formRef: linkActionRef } = useKeptForm(sendMagicLink);

  return (
    <div className="grid gap-6">
      <form ref={passwordActionRef} onSubmit={passwordAction} className="grid gap-3">
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
        <form ref={linkActionRef} onSubmit={linkAction} className="grid gap-3">
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
