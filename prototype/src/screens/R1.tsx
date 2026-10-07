import Link from "next/link";

import {
  featuredWorks,
  publicLogos,
  publicSectors,
  sectorName,
} from "@/data/website-access";
import {
  CtaBlock,
  Hero,
  Page,
  Section,
  WorkGrid,
  ctxOf,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

function SectorTiles({ ctx }: { ctx: PageCtx }) {
  const { role, lang } = ctx;
  const sectors = publicSectors(lang);
  if (sectors.length === 0) return null;
  return (
    <Section title={tr(lang, "Τι κάνουμε", "What we do")}>
      <div className="site-grid">
        {sectors.map((s) => (
          <Link
            key={s.id}
            className="site-tile"
            href={siteHref(role, "R2", lang, { sector: s.slug })}
          >
            <div className="rc-tile-title">{sectorName(s, lang)}</div>
            <p className="rc-muted">
              {lang === "en" ? (s.introEn ?? s.introEl) : s.introEl}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function FeaturedWorks({ ctx }: { ctx: PageCtx }) {
  const { role, lang } = ctx;
  const works = featuredWorks(lang);
  if (works.length === 0) return null;
  return (
    <Section
      title={tr(lang, "Επιλεγμένες δουλειές", "Selected work")}
      aside={
        <Link href={siteHref(role, "R3", lang)}>
          {tr(lang, "Όλες οι δουλειές →", "All work →")}
        </Link>
      }
    >
      <WorkGrid ctx={ctx} works={works} />
    </Section>
  );
}

function LogoStrip({ ctx }: { ctx: PageCtx }) {
  const logos = publicLogos();
  if (logos.length === 0) return null;
  return (
    <Section title={tr(ctx.lang, "Μας εμπιστεύονται", "Trusted by")}>
      <div className="rc-logos">
        {logos.map((l) => (
          <span key={l.id} className="rc-logo">
            {l.clientName}
          </span>
        ))}
      </div>
    </Section>
  );
}

// R1 Αρχική (/): ίδια σελίδα για κάθε ρόλο· οι ενότητες χωρίς περιεχόμενο δεν εμφανίζονται.
export function R1(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { role, lang, state } = ctx;
  const isEmpty = state === "empty";
  return (
    <Page ctx={ctx} code="R1" path="/">
      <Hero
        eyebrow={`${tr(lang, "Παραγωγή βίντεο", "Video production")} · Delta Films`}
        title={tr(
          lang,
          "Βίντεο που φέρνουν πελάτες.",
          "Video that brings you customers.",
        )}
        text={tr(
          lang,
          "Από το πρώτο γύρισμα ως το τελικό μοντάζ, φτιάχνουμε βίντεο για επιχειρήσεις που θέλουν να ξεχωρίζουν.",
          "From the first shoot to the final cut, we make video for businesses that want to stand out.",
        )}
      >
        <Link className="site-button" href={siteHref(role, "R7", lang)}>
          {tr(lang, "Ζητήστε προσφορά", "Request a quote")}
        </Link>
        <Link
          className="site-button"
          data-quiet="true"
          href={siteHref(role, "R3", lang)}
        >
          {tr(lang, "Δείτε δουλειές", "See our work")}
        </Link>
      </Hero>
      {!isEmpty && (
        <>
          <SectorTiles ctx={ctx} />
          <FeaturedWorks ctx={ctx} />
          <LogoStrip ctx={ctx} />
        </>
      )}
      <CtaBlock ctx={ctx} />
    </Page>
  );
}
