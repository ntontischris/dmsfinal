import Link from "next/link";
import type { ReactNode } from "react";

import type { RoleId } from "@/data/roles";
import { COMPANY, TAX } from "@/data/settings-company";
import type { Lang } from "@/data/website";
import { publicPath, websiteCapsOf } from "@/data/website-access";
import { CookieLayer } from "@/screens/w-cookies";
import { WidgetBubble } from "@/screens/w-widget";
import { screenHref, type ScreenQuery } from "@/screens/shared";

import "./w.css";

// Το πλαίσιο κάθε δημόσιας σελίδας (R1–R13): διεύθυνση, κεφαλίδα, υποσέλιδο, banner cookies, widget.
// Η γλώσσα ζει στη διεύθυνση: `?lang=en` εδώ, `/en/...` στο πραγματικό σύστημα.

export const tr = (lang: Lang, el: string, en: string): string =>
  lang === "en" ? en : el;

// Σύνδεσμος σε δημόσια οθόνη που κρατά τη γλώσσα.
export const siteHref = (
  role: RoleId,
  code: string,
  lang: Lang,
  params: Readonly<Record<string, string | undefined>> = {},
): string =>
  screenHref(role, code, { ...params, lang: lang === "en" ? "en" : undefined });

const NAV: readonly { code: string; el: string; en: string }[] = [
  { code: "R3", el: "Δουλειές", en: "Work" },
  { code: "R5", el: "Τιμές", en: "Pricing" },
  { code: "R6", el: "Σχετικά", en: "About" },
  { code: "R7", el: "Επικοινωνία", en: "Contact" },
];

interface SiteFrameProps {
  role: RoleId;
  code: string;
  lang: Lang;
  path: string; // η πραγματική διαδρομή, π.χ. "/services/podcast"
  query: ScreenQuery;
  children: ReactNode;
  hasWidget?: boolean;
}

export function SiteFrame({
  role,
  code,
  lang,
  path,
  query,
  children,
  hasWidget = true,
}: SiteFrameProps) {
  const isSignedIn = websiteCapsOf(role).isSignedIn;
  const other: Lang = lang === "en" ? "el" : "en";
  return (
    <div className="site" lang={lang}>
      <div className="site-url" aria-label="Διεύθυνση στο πραγματικό σύστημα">
        <code>{publicPath(lang, path)}</code>
      </div>
      <header className="site-head">
        <Link className="site-brand" href={siteHref(role, "R1", lang)}>
          {COMPANY.tradeName}
        </Link>
        <nav
          className="site-nav"
          aria-label={tr(lang, "Ιστοσελίδα", "Website")}
        >
          {NAV.map((item) => (
            <Link
              key={item.code}
              href={siteHref(role, item.code, lang)}
              aria-current={item.code === code ? "page" : undefined}
            >
              {tr(lang, item.el, item.en)}
            </Link>
          ))}
          <Link
            href={screenHref(role, code, {
              ...query,
              lang: other === "en" ? "en" : undefined,
            })}
            hrefLang={other}
            aria-label={tr(lang, "English version", "Ελληνική έκδοση")}
          >
            {other.toUpperCase()}
          </Link>
          {isSignedIn ? (
            <Link className="site-cta" href={screenHref(role, "A1", {})}>
              {tr(lang, "Στο σύστημα →", "To the app →")}
            </Link>
          ) : (
            <Link className="site-cta" href={siteHref(role, "R9", lang)}>
              {tr(lang, "Είσοδος", "Sign in")}
            </Link>
          )}
        </nav>
      </header>
      <div className="site-body">{children}</div>
      <footer className="site-foot">
        <div>
          <strong>{COMPANY.name}</strong>
          <br />
          {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          <br />
          {tr(lang, "ΑΦΜ", "VAT no.")} {TAX.afm} · {TAX.doy}
        </div>
        <nav className="site-legal" aria-label={tr(lang, "Νομικά", "Legal")}>
          <Link href={siteHref(role, "R8", lang, { doc: "privacy" })}>
            {tr(lang, "Απόρρητο", "Privacy")}
          </Link>
          <Link href={siteHref(role, "R8", lang, { doc: "cookies" })}>
            Cookies
          </Link>
          <Link href={siteHref(role, "R8", lang, { doc: "terms" })}>
            {tr(lang, "Όροι χρήσης", "Terms")}
          </Link>
          <Link
            href={screenHref(role, code, { ...query, cookies: "settings" })}
          >
            {tr(lang, "Ρυθμίσεις cookies", "Cookie settings")}
          </Link>
        </nav>
      </footer>
      <CookieLayer role={role} code={code} lang={lang} query={query} />
      {hasWidget && <WidgetBubble role={role} lang={lang} />}
    </div>
  );
}
