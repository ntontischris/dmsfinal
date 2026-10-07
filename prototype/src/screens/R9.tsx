import { parseLang } from "@/data/website-access";
import { FriendlyError, ProtoBar } from "@/screens/r9-card";
import { LinkSent, LoginForm, parseFail } from "@/screens/r9-form";
import { AlreadySignedIn } from "@/screens/r9-signed-in";
import { StateSwitcher, parseState, type ScreenProps } from "@/screens/shared";
import { SiteFrame, siteHref } from "@/screens/w-site";

const VARIANTS: readonly {
  key: string;
  label: string;
  params: Record<string, string>;
}[] = [
  { key: "", label: "κανονική", params: {} },
  { key: "wrong", label: "λάθος κωδικός", params: { fail: "wrong" } },
  {
    key: "google",
    label: "Google χωρίς πρόσκληση",
    params: { fail: "google" },
  },
  { key: "inactive", label: "ανενεργός", params: { fail: "inactive" } },
  { key: "human", label: "έλεγχος ανθρώπου", params: { fail: "human" } },
  { key: "many", label: "πολλές προσπάθειες", params: { fail: "many" } },
  {
    key: "link-sent",
    label: "σύνδεσμος στάλθηκε",
    params: { step: "link-sent" },
  },
];

// R9 «Είσοδος»: ο Επισκέπτης μπαίνει· ο συνδεδεμένος βλέπει «ήδη συνδεδεμένος».
export function R9({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const state = parseState(query.state);
  const fail = parseFail(query.fail);
  const notice =
    query.notice === "reset-done"
      ? lang === "en"
        ? "Your password was changed. Sign in with the new one."
        : "Ο κωδικός άλλαξε. Συνδεθείτε με τον νέο."
      : undefined;
  const body =
    state === "error" ? (
      <FriendlyError lang={lang} />
    ) : role !== "visitor" ? (
      <AlreadySignedIn role={role} lang={lang} />
    ) : query.step === "link-sent" ? (
      <LinkSent role={role} lang={lang} />
    ) : (
      <LoginForm role={role} lang={lang} fail={fail} notice={notice} />
    );
  return (
    <>
      <StateSwitcher
        role={role}
        code="R9"
        state={state}
        keep={{ ...query, state: undefined }}
      />
      <ProtoBar
        current={fail ?? query.step ?? ""}
        heading="Μετά την είσοδο: ομάδα και Χρήστης ενός Πελάτη → Σήμερα (A1)· Χρήστης με πολλούς Πελάτες → Εναλλαγή Πελάτη (A4). Παραλλαγές:"
        items={VARIANTS.map((v) => ({
          key: v.key,
          label: v.label,
          href: siteHref(role, "R9", lang, v.params),
        }))}
      />
      <SiteFrame
        role={role}
        code="R9"
        lang={lang}
        path="/login"
        query={query}
        hasWidget={false}
      >
        {body}
      </SiteFrame>
    </>
  );
}
