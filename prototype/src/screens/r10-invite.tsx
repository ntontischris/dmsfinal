import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { Lang } from "@/data/website";
import { AuthCard } from "@/screens/r9-card";
import { screenHref } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

interface Invite {
  by: string;
  whereEl: string;
  whereEn: string;
  name: string;
  email: string;
}

const TEAM_INVITE: Invite = {
  by: "Γιώργος Μαυρίδης",
  whereEl: "την ομάδα της Delta Films",
  whereEn: "the Delta Films team",
  name: "Νίκος Ιωάννου",
  email: "nikos@example.com",
};

const CLIENT_INVITE: Invite = {
  by: "Μαρία Παπαδάκη",
  whereEl: "τον Πελάτη «Κυψέλη Μελισσοκομική»",
  whereEn: "the client «Κυψέλη Μελισσοκομική»",
  name: "Σοφία Κυριακού",
  email: "sofia@kypseli.example",
};

export const pickInvite = (who: string | undefined): Invite =>
  who === "client" ? CLIENT_INVITE : TEAM_INVITE;

export function InviteAccept({
  role,
  lang,
  who,
}: {
  role: RoleId;
  lang: Lang;
  who: string | undefined;
}) {
  const invite = pickInvite(who);
  return (
    <AuthCard title={tr(lang, "Αποδοχή πρόσκλησης", "Accept your invitation")}>
      <p className="r-who">
        {tr(
          lang,
          `Ο/Η ${invite.by} σας προσκάλεσε στο ${invite.whereEl}.`,
          `${invite.by} invited you to ${invite.whereEn}.`,
        )}
      </p>
      <form className="r-form">
        <label>
          {tr(lang, "Ονοματεπώνυμο", "Full name")}
          <input
            className="input"
            type="text"
            name="name"
            defaultValue={invite.name}
          />
        </label>
        <label>
          Email {tr(lang, "(κλειδωμένο)", "(locked)")}
          <input
            className="input"
            type="email"
            value={invite.email}
            disabled
            readOnly
          />
        </label>
        <label>
          {tr(
            lang,
            "Κωδικός (τουλάχιστον 10 χαρακτήρες)",
            "Password (at least 10 characters)",
          )}
          <input
            className="input"
            type="password"
            name="password"
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        <label>
          {tr(lang, "Γλώσσα", "Language")}
          <select className="input" name="language" defaultValue={lang}>
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </select>
        </label>
        <Link
          className="site-button"
          href={siteHref(role, "R10", lang, { flow: "invite-done", who })}
        >
          {tr(lang, "Δημιουργία λογαριασμού", "Create account")}
        </Link>
      </form>
      <p className="r-or">{tr(lang, "ή", "or")}</p>
      <Link
        className="site-button"
        data-quiet="true"
        href={siteHref(role, "R10", lang, { flow: "invite-done", who })}
      >
        {tr(lang, "Συνέχεια με Google", "Continue with Google")}
      </Link>
      <p className="r-muted">
        {tr(
          lang,
          "Συνεχίζοντας αποδέχεστε τους ",
          "By continuing you accept the ",
        )}
        <Link href={siteHref(role, "R8", lang, { doc: "terms" })}>
          {tr(lang, "Όρους χρήσης", "Terms of use")}
        </Link>
        {tr(lang, " και το ", " and the ")}
        <Link href={siteHref(role, "R8", lang, { doc: "privacy" })}>
          {tr(lang, "Απόρρητο", "Privacy policy")}
        </Link>
        .
      </p>
    </AuthCard>
  );
}

export function InviteDone({
  role,
  lang,
  who,
}: {
  role: RoleId;
  lang: Lang;
  who: string | undefined;
}) {
  const invite = pickInvite(who);
  return (
    <AuthCard
      title={tr(
        lang,
        "Ο λογαριασμός σας είναι έτοιμος",
        "Your account is ready",
      )}
    >
      <p>
        {tr(
          lang,
          `Καλώς ήρθατε, ${invite.name}. Είστε μέλος: ${invite.whereEl}.`,
          `Welcome, ${invite.name}. You now belong to ${invite.whereEn}.`,
        )}
      </p>
      <Link className="site-button" href={screenHref(role, "A1", {})}>
        {tr(lang, "Στο σύστημα →", "To the app →")}
      </Link>
    </AuthCard>
  );
}
