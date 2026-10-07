import Link from "next/link";

import { publicSectors, publicWorks, sectorName } from "@/data/website-access";
import {
  CtaBlock,
  Hero,
  Page,
  Player,
  Section,
  WorkGrid,
  ctxOf,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

function SectorFilter({ ctx }: { ctx: PageCtx }) {
  const { role, lang, query } = ctx;
  const sectors = publicSectors(lang);
  if (sectors.length === 0) return null;
  const chips = [
    { slug: undefined, label: tr(lang, "Όλες", "All") },
    ...sectors.map((s) => ({ slug: s.slug, label: sectorName(s, lang) })),
  ];
  return (
    <nav
      className="rc-chips"
      aria-label={tr(lang, "Φίλτρο τομέα", "Sector filter")}
    >
      {chips.map((c) => (
        <Link
          key={c.label}
          className="rc-chip"
          aria-current={query.sector === c.slug}
          href={siteHref(role, "R3", lang, { sector: c.slug })}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}

// R3 Δουλειές (/work): `?sector=` φίλτρο, `?play=<slug>` player placeholder.
export function R3(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { lang, state, query } = ctx;
  const sector = publicSectors(lang).find((s) => s.slug === query.sector);
  const all = publicWorks(lang);
  const works = sector
    ? all.filter((w) => w.sectorIds.includes(sector.id))
    : all;
  const playing = all.find((w) => w.slug === query.play);
  const title = sector
    ? sectorName(sector, lang)
    : tr(lang, "Όλες οι δουλειές", "All work");
  return (
    <Page ctx={ctx} code="R3" path="/work">
      <Hero
        eyebrow={tr(lang, "Δουλειές", "Work")}
        title={tr(lang, "Ό,τι έχουμε φτιάξει.", "What we have made.")}
        text={tr(
          lang,
          "Επιλεγμένα έργα από πελάτες που μας εμπιστεύτηκαν.",
          "A selection of projects from clients who trusted us.",
        )}
      />
      {state !== "empty" && all.length > 0 && (
        <Section title={title}>
          <SectorFilter ctx={ctx} />
          {playing && <Player work={playing} lang={lang} />}
          <WorkGrid ctx={ctx} works={works} />
        </Section>
      )}
      <CtaBlock ctx={ctx} />
    </Page>
  );
}
