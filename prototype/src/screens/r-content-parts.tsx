import Link from "next/link";
import type { ReactNode } from "react";

import type { CataloguePackage } from "@/data/catalogue";
import { COMPANY } from "@/data/settings-company";
import type { Lang, Work } from "@/data/website";
import {
  isCaseStudy,
  parseLang,
  publicWorks,
  workTitle,
} from "@/data/website-access";
import { SiteFrame, siteHref, tr } from "@/screens/w-site";
import {
  StateSwitcher,
  fmtMoney,
  parseState,
  type ScreenProps,
  type ScreenState,
} from "@/screens/shared";

import "./r-content.css";

type Params = Readonly<Record<string, string | undefined>>;

export interface PageCtx {
  role: ScreenProps["role"];
  query: ScreenProps["query"];
  lang: Lang;
  state: ScreenState;
}

export const ctxOf = ({ role, query }: ScreenProps): PageCtx => ({
  role,
  query,
  lang: parseLang(query.lang),
  state: parseState(query.state),
});

interface PageProps {
  ctx: PageCtx;
  code: string;
  path: string;
  children: ReactNode;
}

// Πλαίσιο σελίδας: StateSwitcher + SiteFrame· η κατάσταση «σφάλμα» δείχνει φιλικό δημόσιο μήνυμα.
export function Page({ ctx, code, path, children }: PageProps) {
  const { role, query, lang, state } = ctx;
  return (
    <>
      <StateSwitcher
        role={role}
        code={code}
        state={state}
        keep={{ ...query, state: undefined }}
      />
      <SiteFrame role={role} code={code} lang={lang} path={path} query={query}>
        {state === "error" ? <PublicError lang={lang} /> : children}
      </SiteFrame>
    </>
  );
}

export function PublicError({ lang }: { lang: Lang }) {
  return (
    <section className="rc-error" role="alert">
      <h2>
        {tr(
          lang,
          "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.",
          "Something went wrong. Please try again shortly.",
        )}
      </h2>
      <p className="rc-muted">
        {tr(lang, "Ή επικοινωνήστε μαζί μας: ", "Or get in touch: ")}
        {COMPANY.email} · {COMPANY.phone}
      </p>
    </section>
  );
}

interface NotFoundProps {
  ctx: PageCtx;
  code: string;
  otherParams?: Params;
  existsInOther: boolean;
}

// Απόφαση 12: «Η σελίδα δεν βρέθηκε» με σύνδεσμο στην άλλη γλώσσα μόνο αν εκεί υπάρχει.
export function NotFound({
  ctx,
  code,
  otherParams,
  existsInOther,
}: NotFoundProps) {
  const { role, lang } = ctx;
  const other: Lang = lang === "en" ? "el" : "en";
  return (
    <section className="rc-error">
      <h2>{tr(lang, "Η σελίδα δεν βρέθηκε", "Page not found")}</h2>
      <div className="rc-actions" style={{ justifyContent: "center" }}>
        {existsInOther && (
          <Link
            className="site-button"
            data-quiet="true"
            href={siteHref(role, code, other, otherParams)}
          >
            {tr(lang, "Δείτε την αγγλική έκδοση", "View the Greek version")}
          </Link>
        )}
        <Link className="site-button" href={siteHref(role, "R1", lang)}>
          {tr(lang, "Αρχική", "Home")}
        </Link>
      </div>
    </section>
  );
}

interface HeroProps {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
}

export function Hero({ eyebrow, title, text, children }: HeroProps) {
  return (
    <section className="rc-hero site-hero">
      {eyebrow && <div className="rc-eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="rc-actions">{children}</div>}
    </section>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function Section({ title, children, aside }: SectionProps) {
  return (
    <section className="site-section">
      <h3 className="rc-h">
        <span>{title}</span>
        {aside}
      </h3>
      {children}
    </section>
  );
}

interface CtaProps {
  ctx: PageCtx;
  params?: Params;
  title?: string;
}

export function CtaBlock({ ctx, params, title }: CtaProps) {
  const { role, lang } = ctx;
  return (
    <section className="rc-cta site-section">
      <h3>
        {title ??
          tr(lang, "Έχετε μια ιδέα για βίντεο;", "Got a video in mind?")}
      </h3>
      <Link className="site-button" href={siteHref(role, "R7", lang, params)}>
        {tr(lang, "Ζητήστε προσφορά", "Request a quote")}
      </Link>
    </section>
  );
}

export const workSummary = (w: Work, lang: Lang): string =>
  lang === "en" ? (w.summaryEn ?? w.summaryEl) : w.summaryEl;

export function WorkTile({ ctx, work }: { ctx: PageCtx; work: Work }) {
  const { role, lang } = ctx;
  const isCase = isCaseStudy(work, lang);
  const href = isCase
    ? siteHref(role, "R4", lang, { work: work.slug })
    : siteHref(role, "R3", lang, { play: work.slug });
  return (
    <Link className="site-tile" href={href}>
      <div className="site-cover">{work.cover}</div>
      <div className="rc-tile-title">{workTitle(work, lang)}</div>
      <p className="rc-muted">{workSummary(work, lang)}</p>
      <p className="rc-muted">
        {isCase
          ? tr(lang, "Μελέτη περίπτωσης →", "Case study →")
          : `▶ ${work.video.host}`}
      </p>
    </Link>
  );
}

export function WorkGrid({
  ctx,
  works,
}: {
  ctx: PageCtx;
  works: readonly Work[];
}) {
  return (
    <div className="site-grid">
      {works.map((w) => (
        <WorkTile key={w.id} ctx={ctx} work={w} />
      ))}
    </div>
  );
}

export function Player({ work, lang }: { work: Work; lang: Lang }) {
  return (
    <div className="rc-player" role="img" aria-label={workTitle(work, lang)}>
      <div>
        <strong>Player: {work.video.host}</strong>
        <div>{work.video.url}</div>
      </div>
    </div>
  );
}

export const priceLine = (p: CataloguePackage, lang: Lang): string => {
  if (!p.showsPrice) return tr(lang, "Ζητήστε προσφορά", "Request a quote");
  const per = p.billing === "μηνιαίο" ? tr(lang, "/μήνα", "/month") : "";
  return tr(
    lang,
    `από ${fmtMoney(p.price)} + ΦΠΑ${per}`,
    `from ${fmtMoney(p.price)} + VAT${per}`,
  );
};

export const sectorWorks = (sectorId: string, lang: Lang): readonly Work[] =>
  publicWorks(lang).filter((w) => w.sectorIds.includes(sectorId));
