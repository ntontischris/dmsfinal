import { parseLang } from "@/data/website-access";
import { InviteAccept, InviteDone } from "@/screens/r10-invite";
import { ResetRequest, ResetSet } from "@/screens/r10-reset";
import { FriendlyError, ProtoBar } from "@/screens/r9-card";
import { StateSwitcher, parseState, type ScreenProps } from "@/screens/shared";
import { SiteFrame, siteHref } from "@/screens/w-site";

const FLOWS: readonly {
  key: string;
  label: string;
  params: Record<string, string>;
}[] = [
  { key: "reset", label: "ζητώ επαναφορά", params: { flow: "reset" } },
  { key: "reset-set", label: "νέος κωδικός", params: { flow: "reset-set" } },
  { key: "invite", label: "πρόσκληση ομάδας", params: { flow: "invite" } },
  {
    key: "invite-client",
    label: "πρόσκληση Χρήστη πελάτη",
    params: { flow: "invite", who: "client" },
  },
  {
    key: "invite-done",
    label: "πρόσκληση: έτοιμο",
    params: { flow: "invite-done" },
  },
];

const PATHS: Readonly<Record<string, string>> = {
  reset: "/reset-password",
  "reset-set": "/reset-password/set",
  invite: "/invite/…",
  "invite-done": "/invite/…/done",
};

// R10 «Επαναφορά κωδικού και αποδοχή πρόσκλησης». Οι ληγμένοι σύνδεσμοι πάνε στη R13.
export function R10({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const state = parseState(query.state);
  const flow = query.flow ?? "reset";
  const who = query.who;
  const current =
    flow === "invite" && who === "client" ? "invite-client" : flow;
  const body =
    state === "error" ? (
      <FriendlyError lang={lang} />
    ) : flow === "reset-set" ? (
      <ResetSet role={role} lang={lang} />
    ) : flow === "invite" ? (
      <InviteAccept role={role} lang={lang} who={who} />
    ) : flow === "invite-done" ? (
      <InviteDone role={role} lang={lang} who={who} />
    ) : (
      <ResetRequest role={role} lang={lang} isSent={query.sent === "1"} />
    );
  return (
    <>
      <StateSwitcher
        role={role}
        code="R10"
        state={state}
        keep={{ ...query, state: undefined }}
      />
      <ProtoBar
        current={current}
        heading="Ροή:"
        items={[
          ...FLOWS.map((f) => ({
            key: f.key,
            label: f.label,
            href: siteHref(role, "R10", lang, f.params),
          })),
          {
            key: "dead",
            label: "ληγμένος σύνδεσμος → R13",
            href: siteHref(role, "R13", lang, { case: "reset-expired" }),
          },
        ]}
      />
      <SiteFrame
        role={role}
        code="R10"
        lang={lang}
        path={PATHS[flow] ?? "/reset-password"}
        query={query}
        hasWidget={false}
      >
        {body}
      </SiteFrame>
    </>
  );
}
