import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { Lang } from "@/data/website";
import { AuthCard, Msg } from "@/screens/r9-card";
import { siteHref, tr } from "@/screens/w-site";

type Fail = "wrong" | "google" | "inactive" | "human" | "many";

const FAILS: Readonly<Record<Fail, readonly [string, string]>> = {
  wrong: ["Λάθος email ή κωδικός.", "Wrong email or password."],
  google: [
    "Αυτός ο λογαριασμός Google δεν έχει πρόσκληση.",
    "This Google account has no invitation.",
  ],
  inactive: ["Ο λογαριασμός δεν είναι ενεργός.", "This account is not active."],
  human: [
    "Δεν καταφέραμε να επιβεβαιώσουμε ότι είστε άνθρωπος. Δοκιμάστε ξανά.",
    "We could not confirm you are human. Please try again.",
  ],
  many: [
    "Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.",
    "Too many attempts. Try again in a few minutes.",
  ],
};

export const parseFail = (value: string | undefined): Fail | undefined =>
  value === "wrong" ||
  value === "google" ||
  value === "inactive" ||
  value === "human" ||
  value === "many"
    ? value
    : undefined;

export function LinkSent({ role, lang }: { role: RoleId; lang: Lang }) {
  return (
    <AuthCard title={tr(lang, "Ελέγξτε το email σας", "Check your email")}>
      <Msg kind="info">
        {tr(
          lang,
          "Αν υπάρχει λογαριασμός με αυτό το email, στείλαμε σύνδεσμο εισόδου. Ισχύει 1 ώρα και χρησιμοποιείται μία φορά.",
          "If an account exists for this email, we sent a sign-in link. It is valid for 1 hour and works once.",
        )}
      </Msg>
      <Link
        className="site-button"
        data-quiet="true"
        href={siteHref(role, "R9", lang)}
      >
        {tr(lang, "Πίσω στην Είσοδο", "Back to sign in")}
      </Link>
    </AuthCard>
  );
}

interface LoginFormProps {
  role: RoleId;
  lang: Lang;
  fail: Fail | undefined;
  notice?: string;
}

export function LoginForm({ role, lang, fail, notice }: LoginFormProps) {
  return (
    <AuthCard title={tr(lang, "Είσοδος", "Sign in")}>
      {notice && <Msg kind="info">{notice}</Msg>}
      {fail && (
        <Msg kind="error">{tr(lang, FAILS[fail][0], FAILS[fail][1])}</Msg>
      )}
      <form className="r-form">
        <label>
          Email
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
          />
        </label>
        <label>
          {tr(lang, "Κωδικός", "Password")}
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
          />
        </label>
        <button className="site-button" type="button">
          {tr(lang, "Είσοδος", "Sign in")}
        </button>
      </form>
      <div className="r-row">
        <Link href={siteHref(role, "R10", lang, { flow: "reset" })}>
          {tr(lang, "Ξεχάσατε τον κωδικό;", "Forgot your password?")}
        </Link>
        <Link href={siteHref(role, "R9", lang, { step: "link-sent" })}>
          {tr(lang, "Στείλτε μου σύνδεσμο εισόδου", "Email me a sign-in link")}
        </Link>
      </div>
      <p className="r-or">{tr(lang, "ή", "or")}</p>
      <Link
        className="site-button"
        data-quiet="true"
        href={siteHref(role, "R9", lang, { fail: "google" })}
      >
        {tr(lang, "Συνέχεια με Google", "Continue with Google")}
      </Link>
      <p className="r-muted">
        {tr(
          lang,
          "Η είσοδος γίνεται μόνο με πρόσκληση.",
          "Sign-in is by invitation only.",
        )}{" "}
        <Link href={siteHref(role, "R7", lang)}>
          {tr(
            lang,
            "Θέλετε να γίνετε πελάτης; Στείλτε μας μήνυμα.",
            "Want to become a client? Send us a message.",
          )}
        </Link>
      </p>
      <p className="r-muted">
        {tr(
          lang,
          "Προστατεύεται από έλεγχο ανθρώπου",
          "Protected by a human check",
        )}
      </p>
    </AuthCard>
  );
}
