import Link from "next/link";

import { COMPANY } from "@/data/settings-company";
import type { Lang } from "@/data/website";
import { parseLang } from "@/data/website-access";
import type { ScreenProps } from "@/screens/shared";
import { SystemNote } from "@/screens/r7-system-note";
import { InterestForm, parseFail, withQuery } from "@/screens/w-form";
import { SiteFrame, siteHref, tr } from "@/screens/w-site";

const FAILS: readonly { value: string | undefined; label: string }[] = [
  { value: undefined, label: "κανονική" },
  { value: "invalid", label: "λάθη πεδίων" },
  { value: "human", label: "αποτυχία ελέγχου ανθρώπου" },
  { value: "limit", label: "όριο αποστολών" },
];

function ContactBlock({ lang }: { lang: Lang }) {
  return (
    <aside
      className="r-box"
      aria-label={tr(lang, "Στοιχεία επικοινωνίας", "Contact details")}
    >
      <h3>{COMPANY.name}</h3>
      <span>{COMPANY.address}</span>
      <span>{COMPANY.phone}</span>
      <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
    </aside>
  );
}

function ProtoBar({ role, query }: Pick<ScreenProps, "role" | "query">) {
  return (
    <nav className="site-proto" aria-label="Prototype">
      Prototype:{" "}
      {FAILS.map((f) => (
        <Link
          key={f.label}
          href={withQuery(role, "R7", query, {
            fail: f.value,
            step: undefined,
          })}
          aria-current={
            query.step !== "sent" && query.fail === f.value ? "true" : undefined
          }
        >
          {f.label}
        </Link>
      ))}
      <Link
        href={withQuery(role, "R7", query, { step: "sent", fail: undefined })}
        aria-current={query.step === "sent" ? "true" : undefined}
      >
        μετά την αποστολή (/contact/thanks)
      </Link>
    </nav>
  );
}

function Thanks({ role, lang }: { role: ScreenProps["role"]; lang: Lang }) {
  return (
    <section className="site-hero">
      <h2>{tr(lang, "Λάβαμε το αίτημά σας", "We received your request")}</h2>
      <p>
        {tr(
          lang,
          "Στείλαμε ένα email επιβεβαίωσης στη διεύθυνση που δώσατε, στα ελληνικά.",
          "We sent a confirmation email to the address you gave, in English.",
        )}
      </p>
      <div
        className="r-box"
        style={{ marginTop: "var(--space-4)", maxWidth: "36rem" }}
      >
        <h3>{tr(lang, "Τι γίνεται τώρα", "What happens next")}</h3>
        <ul>
          <li>
            {tr(
              lang,
              "Κάποιος από την ομάδα μας διαβάζει το μήνυμά σας.",
              "Someone on our team reads your message.",
            )}
          </li>
          <li>
            {tr(
              lang,
              "Θα σας απαντήσουμε στο email σας.",
              "We will reply to your email.",
            )}
          </li>
          <li>
            {tr(
              lang,
              "Αν θέλετε να προσθέσετε κάτι, απαντήστε στο email επιβεβαίωσης.",
              "To add something, reply to the confirmation email.",
            )}
          </li>
        </ul>
      </div>
      <p style={{ marginTop: "var(--space-4)" }}>
        <Link
          className="site-button"
          data-quiet="true"
          href={siteHref(role, "R1", lang)}
        >
          {tr(lang, "Πίσω στην αρχική", "Back to home")}
        </Link>
      </p>
    </section>
  );
}

export function R7({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const isSent = query.step === "sent";
  return (
    <SiteFrame
      role={role}
      code="R7"
      lang={lang}
      path={isSent ? "/contact/thanks" : "/contact"}
      query={query}
    >
      <ProtoBar role={role} query={query} />
      {isSent ? (
        <Thanks role={role} lang={lang} />
      ) : (
        <>
          <section className="site-hero">
            <h2>
              {tr(lang, "Πείτε μας τι χρειάζεστε", "Tell us what you need")}
            </h2>
            <p>
              {tr(
                lang,
                "Γράψτε μας δυο λόγια και θα επικοινωνήσουμε μαζί σας.",
                "Write us a few lines and we will get back to you.",
              )}
            </p>
          </section>
          <div className="r-split">
            <InterestForm
              role={role}
              lang={lang}
              query={query}
              fail={parseFail(query.fail)}
            />
            <ContactBlock lang={lang} />
          </div>
        </>
      )}
      <SystemNote isSent={isSent} lang={lang} />
    </SiteFrame>
  );
}
