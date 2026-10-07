import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { COOKIE_CATEGORIES, type Lang } from "@/data/website";
import { siteHref, tr } from "@/screens/w-site";
import { screenHref, type ScreenQuery } from "@/screens/shared";

import "./r-forms.css";

interface CookieLayerProps {
  role: RoleId;
  code: string;
  lang: Lang;
  query: ScreenQuery;
}

// Banner και ρυθμίσεις cookies (R11). Φαίνεται με `?cookies=banner` ή `?cookies=settings`.
// Βασική λειτουργία (ADR 0016): ίσα κουμπιά, καμία προεπιλεγμένη επιλογή, η σελίδα δεν κλειδώνει.
export function CookieLayer({ role, code, lang, query }: CookieLayerProps) {
  const mode = query.cookies;
  if (mode !== "banner" && mode !== "settings") return null;
  const choose = screenHref(role, code, { ...query, cookies: undefined });
  const policy = siteHref(role, "R8", lang, { doc: "cookies" });
  return mode === "banner" ? (
    <CookieBanner
      lang={lang}
      choose={choose}
      policy={policy}
      query={query}
      role={role}
      code={code}
    />
  ) : (
    <CookieSettings lang={lang} choose={choose} query={query} />
  );
}

interface BannerProps {
  lang: Lang;
  choose: string;
  policy: string;
  query: ScreenQuery;
  role: RoleId;
  code: string;
}

function CookieBanner({
  lang,
  choose,
  policy,
  query,
  role,
  code,
}: BannerProps) {
  const settings = screenHref(role, code, { ...query, cookies: "settings" });
  return (
    <section
      className="r-cookie"
      role="region"
      aria-label={tr(lang, "Cookies", "Cookies")}
    >
      <p>
        {tr(
          lang,
          "Χρησιμοποιούμε cookies για στατιστικά και διαφήμιση μόνο αν συμφωνήσετε. Τα απαραίτητα δουλεύουν πάντα. ",
          "We use statistics and advertising cookies only if you agree. The necessary ones always run. ",
        )}
        <Link href={policy}>
          {tr(lang, "Μάθετε περισσότερα", "Learn more")}
        </Link>
      </p>
      <div className="r-cookie-actions">
        <Link className="site-button" href={choose}>
          {tr(lang, "Αποδοχή", "Accept")}
        </Link>
        <Link className="site-button" href={choose}>
          {tr(lang, "Απόρριψη", "Reject")}
        </Link>
        <Link href={settings}>{tr(lang, "Ρυθμίσεις", "Settings")}</Link>
      </div>
    </section>
  );
}

function CookieSettings({
  lang,
  choose,
  query,
}: Pick<BannerProps, "lang" | "choose" | "query">) {
  const current: Readonly<Record<string, boolean>> = {
    necessary: true,
    statistics: query.stats === "1",
    marketing: query.marketing === "1",
  };
  return (
    <section
      className="r-cookie"
      role="region"
      aria-label={tr(lang, "Ρυθμίσεις cookies", "Cookie settings")}
    >
      <strong>{tr(lang, "Ρυθμίσεις cookies", "Cookie settings")}</strong>
      <div className="r-cookie-cats">
        {COOKIE_CATEGORIES.map((c) => (
          <label key={c.id}>
            <input
              type="checkbox"
              name={c.id}
              defaultChecked={current[c.id]}
              disabled={c.isLocked}
            />
            <span>
              <strong>{lang === "en" ? c.labelEn : c.labelEl}</strong>
              {c.isLocked ? tr(lang, " (πάντα ενεργά)", " (always on)") : ""}
              <br />
              {lang === "en" ? c.textEn : c.textEl}
            </span>
          </label>
        ))}
      </div>
      <div className="r-cookie-actions">
        <Link className="site-button" href={choose}>
          {tr(lang, "Αποθήκευση επιλογών", "Save choices")}
        </Link>
      </div>
    </section>
  );
}
