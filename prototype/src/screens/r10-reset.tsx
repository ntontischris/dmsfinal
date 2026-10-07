import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { Lang } from "@/data/website";
import { AuthCard, Msg } from "@/screens/r9-card";
import { siteHref, tr } from "@/screens/w-site";

export function ResetRequest({
  role,
  lang,
  isSent,
}: {
  role: RoleId;
  lang: Lang;
  isSent: boolean;
}) {
  return (
    <AuthCard title={tr(lang, "Επαναφορά κωδικού", "Reset your password")}>
      {isSent ? (
        <Msg kind="info">
          {tr(
            lang,
            "Αν υπάρχει λογαριασμός με αυτό το email, στείλαμε σύνδεσμο επαναφοράς. Ισχύει 1 ώρα και χρησιμοποιείται μία φορά.",
            "If an account exists for this email, we sent a reset link. It is valid for 1 hour and works once.",
          )}
        </Msg>
      ) : (
        <p className="r-muted">
          {tr(
            lang,
            "Γράψτε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.",
            "Enter your email and we will send you a reset link.",
          )}
        </p>
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
        <Link
          className="site-button"
          href={siteHref(role, "R10", lang, { flow: "reset", sent: "1" })}
        >
          {tr(lang, "Στείλτε μου σύνδεσμο", "Send me a link")}
        </Link>
      </form>
      <Link href={siteHref(role, "R9", lang)}>
        {tr(lang, "← Πίσω στην Είσοδο", "← Back to sign in")}
      </Link>
    </AuthCard>
  );
}

export function ResetSet({ role, lang }: { role: RoleId; lang: Lang }) {
  return (
    <AuthCard title={tr(lang, "Νέος κωδικός", "New password")}>
      <p className="r-muted">
        {tr(
          lang,
          "Ο κωδικός θέλει τουλάχιστον 10 χαρακτήρες. Δεν υπάρχει άλλος κανόνας.",
          "Your password needs at least 10 characters. There is no other rule.",
        )}
      </p>
      <form className="r-form">
        <label>
          {tr(lang, "Νέος κωδικός", "New password")}
          <input
            className="input"
            type="password"
            name="password"
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        <label>
          {tr(lang, "Επιβεβαίωση κωδικού", "Confirm password")}
          <input
            className="input"
            type="password"
            name="confirm"
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        <Link
          className="site-button"
          href={siteHref(role, "R9", lang, { notice: "reset-done" })}
        >
          {tr(lang, "Αλλαγή κωδικού", "Change password")}
        </Link>
      </form>
    </AuthCard>
  );
}
