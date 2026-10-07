import Link from "next/link";

import { parseLang } from "@/data/website-access";
import { screenHref, type ScreenProps } from "@/screens/shared";
import {
  LEGAL_DOCS,
  docTitle,
  parseDoc,
  type LegalDoc,
} from "@/screens/r8-docs";
import { CookieToolsTable, SubprocessorsTable } from "@/screens/r8-tables";
import { SiteFrame, siteHref, tr } from "@/screens/w-site";
import type { Lang } from "@/data/website";

function Tabs({
  props,
  doc,
  lang,
}: {
  props: ScreenProps;
  doc: LegalDoc;
  lang: Lang;
}) {
  return (
    <nav
      className="r-tabs"
      aria-label={tr(lang, "Νομικά κείμενα", "Legal texts")}
    >
      {LEGAL_DOCS.map((d) => (
        <Link
          key={d.id}
          href={siteHref(props.role, "R8", lang, { doc: d.id })}
          aria-current={d.id === doc.id ? "page" : undefined}
        >
          {docTitle(d, lang)}
        </Link>
      ))}
    </nav>
  );
}

function DocBody({ doc, lang }: { doc: LegalDoc; lang: Lang }) {
  return (
    <div className="r-doc">
      {doc.sections.map((sec) => (
        <section key={sec.headingEl}>
          <h3>{lang === "en" ? sec.headingEn : sec.headingEl}</h3>
          <p>{lang === "en" ? sec.textEn : sec.textEl}</p>
        </section>
      ))}
      {doc.id === "privacy" && (
        <section>
          <h3>{tr(lang, "Υποεκτελούντες", "Subprocessors")}</h3>
          <SubprocessorsTable lang={lang} />
        </section>
      )}
      {doc.id === "cookies" && (
        <section>
          <h3>{tr(lang, "Τι χρησιμοποιούμε", "What we use")}</h3>
          <CookieToolsTable lang={lang} />
        </section>
      )}
    </div>
  );
}

export function R8({ role, query }: ScreenProps) {
  const lang = parseLang(query.lang);
  const doc =
    LEGAL_DOCS.find((d) => d.id === parseDoc(query.doc)) ?? LEGAL_DOCS[0];
  return (
    <SiteFrame role={role} code="R8" lang={lang} path={doc.path} query={query}>
      <Tabs props={{ role, query }} doc={doc} lang={lang} />
      <h2>{docTitle(doc, lang)}</h2>
      <p className="r-meta">
        {tr(lang, "Έκδοση", "Version")} {doc.version} · {doc.date}
      </p>
      <DocBody doc={doc} lang={lang} />
      <p style={{ marginTop: "var(--space-4)" }}>
        <Link href={screenHref(role, "R8", { ...query, cookies: "settings" })}>
          {tr(lang, "Ρυθμίσεις cookies", "Cookie settings")}
        </Link>
      </p>
      <p className="site-proto" style={{ marginTop: "var(--space-4)" }}>
        Prototype: Τα κείμενα τα γράφει ο developer και τα εγκρίνει η εταιρεία.
      </p>
    </SiteFrame>
  );
}
