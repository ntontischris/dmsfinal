import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { CURRENT_CLIENT_USER } from "@/data/team";
import { findTeamUser, USER_OF_ROLE } from "@/data/team-access";
import type { Lang } from "@/data/website";
import { AuthCard } from "@/screens/r9-card";
import { screenHref } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

export const signedInName = (role: RoleId): string =>
  role === "client"
    ? "Μαρία Παπαδάκη"
    : (findTeamUser(USER_OF_ROLE[role])?.name ?? "—");

export function AlreadySignedIn({ role, lang }: { role: RoleId; lang: Lang }) {
  const name = signedInName(role);
  return (
    <AuthCard
      title={tr(lang, "Είστε ήδη συνδεδεμένος", "You are already signed in")}
    >
      <p>
        {tr(
          lang,
          `Είστε ήδη συνδεδεμένος ως ${name}`,
          `You are already signed in as ${name}`,
        )}
        {role === "client" && (
          <span className="r-muted"> ({CURRENT_CLIENT_USER})</span>
        )}
      </p>
      <Link className="site-button" href={screenHref(role, "A1", {})}>
        {tr(lang, "Στο σύστημα →", "To the app →")}
      </Link>
      <Link
        className="site-button"
        data-quiet="true"
        href={siteHref("visitor", "R9", lang)}
      >
        {tr(lang, "Αποσύνδεση", "Sign out")}
      </Link>
    </AuthCard>
  );
}
