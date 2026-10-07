import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { COMPANY } from "@/data/settings-company";
import { DEAD_LINK_CASES, type DeadLinkCase, type Lang } from "@/data/website";
import { AuthCard, ProtoBar } from "@/screens/r9-card";
import { siteHref, tr } from "@/screens/w-site";

// Ο Υπεύθυνος της Ευκαιρίας (φανταστικός): Άννα Δημητρίου.
const OWNER = { name: "Άννα Δημητρίου", email: "anna@example.com" };

export const findCase = (id: string | undefined): DeadLinkCase =>
  DEAD_LINK_CASES.find((c) => c.id === id) ?? DEAD_LINK_CASES[0];

const fillOwner = (text: string): string =>
  text
    .replace("{Υπεύθυνο}", `${OWNER.name} (${OWNER.email})`)
    .replace("{owner}", `${OWNER.name} (${OWNER.email})`);

function Actions({
  role,
  lang,
  c,
}: {
  role: RoleId;
  lang: Lang;
  c: DeadLinkCase;
}) {
  const link = (
    code: string,
    params: Record<string, string>,
    el: string,
    en: string,
  ) => (
    <Link className="site-button" href={siteHref(role, code, lang, params)}>
      {tr(lang, el, en)}
    </Link>
  );
  return (
    <div className="r-help">
      {c.kind === "επαναφορά" &&
        link(
          "R10",
          { flow: "reset" },
          "Νέος σύνδεσμος επαναφοράς",
          "Request a new reset link",
        )}
      {c.kind === "είσοδος" &&
        link(
          "R9",
          { step: "link-sent" },
          "Νέος σύνδεσμος εισόδου",
          "Request a new sign-in link",
        )}
      {(c.id === "invite-used" || c.id === "proposal-signed") &&
        link("R9", {}, "Είσοδος", "Sign in")}
      {c.kind === "πρόταση" && c.id !== "proposal-signed" && (
        <a className="site-button" href={`mailto:${OWNER.email}`}>
          {tr(lang, "Στείλτε email", "Send an email")}
        </a>
      )}
      {c.kind === "παλιό σύστημα" && (
        <a className="site-button" href={`mailto:${COMPANY.email}`}>
          {COMPANY.email}
        </a>
      )}
      {link("R1", {}, "Αρχική σελίδα", "Home page")}
    </div>
  );
}

export function DeadLink({
  role,
  lang,
  c,
}: {
  role: RoleId;
  lang: Lang;
  c: DeadLinkCase;
}) {
  const reason = tr(lang, c.reasonEl, c.reasonEn);
  const next = fillOwner(tr(lang, c.nextEl, c.nextEn));
  return (
    <AuthCard
      title={tr(
        lang,
        "Ο σύνδεσμος δεν ισχύει πια",
        "This link is no longer valid",
      )}
    >
      <p className="r-reason">{reason}</p>
      <p>{next}</p>
      {c.kind === "παλιό σύστημα" && (
        <p className="r-muted">
          {COMPANY.name} · {COMPANY.email} · {COMPANY.phone}
        </p>
      )}
      <Actions role={role} lang={lang} c={c} />
    </AuthCard>
  );
}

const KINDS = Array.from(new Set(DEAD_LINK_CASES.map((c) => c.kind)));

export function CaseBar({
  role,
  lang,
  current,
}: {
  role: RoleId;
  lang: Lang;
  current: string;
}) {
  return (
    <>
      {KINDS.map((kind) => (
        <ProtoBar
          key={kind}
          current={current}
          heading={`${kind}:`}
          items={DEAD_LINK_CASES.filter((c) => c.kind === kind).map((c) => ({
            key: c.id,
            label: c.id,
            href: siteHref(role, "R13", lang, { case: c.id }),
          }))}
        />
      ))}
    </>
  );
}
