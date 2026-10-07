import Link from "next/link";

import {
  findSector,
  packageName,
  packageText,
  packagesOfSector,
  publicSectors,
  sectorName,
} from "@/data/website-access";
import {
  CtaBlock,
  Hero,
  NotFound,
  Page,
  Section,
  WorkGrid,
  ctxOf,
  priceLine,
  sectorWorks,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

function Packages({ ctx, slug }: { ctx: PageCtx; slug: string }) {
  const { role, lang } = ctx;
  const sector = findSector(slug);
  const packages = sector ? packagesOfSector(sector, lang) : [];
  if (packages.length === 0) return null;
  return (
    <Section title={tr(lang, "Πακέτα", "Packages")}>
      <div className="site-grid">
        {packages.map((p) => (
          <div key={p.id} className="site-tile">
            <div className="rc-tile-title">{packageName(p, lang)}</div>
            <p className="rc-muted">{packageText(p, lang)}</p>
            <div className="rc-price">{priceLine(p, lang)}</div>
            <Link
              className="site-button"
              data-quiet="true"
              href={siteHref(role, "R7", lang, { package: p.id })}
            >
              {tr(lang, "Ζητήστε προσφορά", "Request a quote")}
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SectorWorks({ ctx, sectorId }: { ctx: PageCtx; sectorId: string }) {
  const works = sectorWorks(sectorId, ctx.lang);
  if (works.length === 0) return null;
  return (
    <Section title={tr(ctx.lang, "Δουλειές μας", "Our work")}>
      <WorkGrid ctx={ctx} works={works} />
    </Section>
  );
}

function Proto({ ctx }: { ctx: PageCtx }) {
  const { role, lang, query } = ctx;
  return (
    <p className="site-proto">
      Prototype:{" "}
      <Link
        href={siteHref(role, "R2", lang, { sector: "corporate" })}
        aria-current={query.sector === "corporate"}
      >
        Εταιρικά βίντεο (μόνο ελληνικά)
      </Link>
      <Link
        href={siteHref(role, "R2", lang, { sector: "music-videos" })}
        aria-current={query.sector === "music-videos"}
      >
        Μουσικά βίντεο (κρυφός)
      </Link>
    </p>
  );
}

// R2 Σελίδα Τομέα (/services/<slug>): `?sector=slug`.
export function R2(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { role, lang, state, query } = ctx;
  const visible = publicSectors(lang);
  const slug = query.sector ?? visible[0]?.slug ?? "";
  const sector = visible.find((s) => s.slug === slug);
  const other = lang === "en" ? "el" : "en";
  const path = `/services/${slug}`;
  if (!sector)
    return (
      <Page ctx={ctx} code="R2" path={path}>
        <Proto ctx={ctx} />
        <NotFound
          ctx={ctx}
          code="R2"
          otherParams={{ sector: slug }}
          existsInOther={publicSectors(other).some((s) => s.slug === slug)}
        />
      </Page>
    );
  return (
    <Page ctx={ctx} code="R2" path={path}>
      <Proto ctx={ctx} />
      <Hero
        eyebrow={tr(lang, "Υπηρεσίες", "Services")}
        title={sectorName(sector, lang)}
        text={
          lang === "en" ? (sector.introEn ?? sector.introEl) : sector.introEl
        }
      >
        <Link
          className="site-button"
          href={siteHref(role, "R7", lang, { sector: sector.slug })}
        >
          {tr(lang, "Ζητήστε προσφορά", "Request a quote")}
        </Link>
      </Hero>
      {state !== "empty" && (
        <>
          <Packages ctx={ctx} slug={sector.slug} />
          <SectorWorks ctx={ctx} sectorId={sector.id} />
        </>
      )}
      <CtaBlock ctx={ctx} params={{ sector: sector.slug }} />
    </Page>
  );
}
