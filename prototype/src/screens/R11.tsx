import Link from "next/link";

import { COOKIE_POLICY_VERSION } from "@/data/website";
import { parseLang } from "@/data/website-access";
import type { ScreenProps } from "@/screens/shared";
import { ConsentLog } from "@/screens/r11-consent-log";
import { withQuery } from "@/screens/w-form";
import { SiteFrame, tr } from "@/screens/w-site";

const STATES: readonly { value: string | undefined; label: string }[] = [
  { value: "banner", label: "banner" },
  { value: "settings", label: "ρυθμίσεις" },
  { value: "done", label: "μετά την επιλογή" },
];

export function R11({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const mode = query.cookies ?? "banner";
  return (
    <SiteFrame
      role={role}
      code="R11"
      lang={lang}
      path="/cookies"
      query={{ ...query, cookies: mode === "done" ? undefined : mode }}
    >
      <nav className="site-proto" aria-label="Prototype">
        Prototype: το banner φαίνεται στο κάτω μέρος της σελίδας.{" "}
        {STATES.map((s) => (
          <Link
            key={s.label}
            href={withQuery(role, "R11", query, { cookies: s.value })}
            aria-current={mode === s.value ? "true" : undefined}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <section className="site-hero">
        <h2>{tr(lang, "Banner cookies", "Cookie banner")}</h2>
        <p>
          {tr(
            lang,
            "Πριν την Αποδοχή δεν φορτώνει κανένα εργαλείο στατιστικών ή διαφήμισης.",
            "Before you accept, no statistics or advertising tool is loaded.",
          )}
        </p>
      </section>
      <div className="r-box">
        <h3>{tr(lang, "Οι κανόνες", "The rules")}</h3>
        <ul>
          <li>
            Αποδοχή και Απόρριψη: ίδιο μέγεθος, ίδιο στυλ, στο ίδιο επίπεδο.
          </li>
          <li>
            Καμία κατηγορία δεν είναι προεπιλεγμένη (εκτός από τα Απαραίτητα).
          </li>
          <li>
            Η σελίδα δεν κλειδώνει: ο επισκέπτης συνεχίζει να τη διαβάζει.
          </li>
          <li>
            «Ρυθμίσεις cookies» στο υποσέλιδο κάθε σελίδας: αλλάζει ή ανακαλεί
            την επιλογή οποτεδήποτε. Μετά την ανάκληση, τα εργαλεία δεν
            φορτώνουν από την επόμενη σελίδα.
          </li>
        </ul>
      </div>
      {mode === "done" && <ConsentLog version={COOKIE_POLICY_VERSION} />}
    </SiteFrame>
  );
}
