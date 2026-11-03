"use client";

import Link from "next/link";

import { useKeptForm } from "@/lib/use-kept-form";

import {
  sendMagicLink,
  signInWithPassword,
} from "../actions";
import { FormMsg } from "./r-msg";

// R9 Είσοδος στη νέα εμφάνιση (prototype `LoginForm` του `screens/r9-form.tsx`), με τα ίδια actions με την κλασική:
// email και κωδικός, σύνδεσμος στο email (εδώ με δικό του πεδίο, γιατί τον στέλνει αμέσως), ή Google.
export function SpacesLoginForm({ next }: { next: string }) {
  const {
    state: passwordState,
    isPending: isSigningIn,
    onSubmit: handlePassword,
    formRef: passwordRef,
  } = useKeptForm(signInWithPassword);
  const {
    state: linkState,
    isPending: isSending,
    onSubmit: handleLink,
    formRef: linkRef,
  } = useKeptForm(sendMagicLink);
  return (
    <>
      <form ref={passwordRef} onSubmit={handlePassword} className="r-form">
        <input type="hidden" name="next" value={next} />
        <label>
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label>
          <span>Κωδικός</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <FormMsg state={passwordState} />
        <button className="site-button" type="submit" disabled={isSigningIn}>
          {isSigningIn ? "Είσοδος…" : "Είσοδος"}
        </button>
      </form>
      <div className="r-row">
        <Link href="/login/reset">Ξεχάσατε τον κωδικό;</Link>
      </div>
      <p className="r-or">ή</p>
      <form ref={linkRef} onSubmit={handleLink} className="r-form">
        <input type="hidden" name="next" value={next} />
        <label>
          <span>Email για σύνδεσμο εισόδου</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <FormMsg state={linkState} />
        <button
          className="site-button"
          data-quiet="true"
          type="submit"
          disabled={isSending}
        >
          {isSending ? "Αποστολή…" : "Στείλτε μου σύνδεσμο εισόδου"}
        </button>
      </form>
      <p className="r-muted">Η είσοδος γίνεται μόνο με πρόσκληση.</p>
    </>
  );
}
