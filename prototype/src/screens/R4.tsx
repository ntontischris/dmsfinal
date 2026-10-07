import Link from "next/link";

import type { Lang, Work } from "@/data/website";
import {
  findWork,
  isCaseStudy,
  publicSectors,
  publicWorks,
  sectorName,
  workTitle,
} from "@/data/website-access";
import {
  CtaBlock,
  NotFound,
  Page,
  Player,
  Section,
  ctxOf,
  workSummary,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

const isPublicCase = (w: Work | undefined, lang: Lang): boolean =>
  !!w && isCaseStudy(w, lang) && publicWorks(lang).some((x) => x.id === w.id);

function Story({ work, lang }: { work: Work; lang: Lang }) {
  const story = lang === "en" ? work.storyEn : work.storyEl;
  if (!story) return null;
  const parts = [
    { title: tr(lang, "Πρόκληση", "Challenge"), text: story.challenge },
    { title: tr(lang, "Λύση", "Solution"), text: story.solution },
    { title: tr(lang, "Αποτέλεσμα", "Result"), text: story.result },
  ];
  return (
    <div className="rc-story site-section">
      {parts.map((p) => (
        <div key={p.title} className="site-tile">
          <h4>{p.title}</h4>
          <p>{p.text}</p>
        </div>
      ))}
    </div>
  );
}

function Media({ ctx, work }: { ctx: PageCtx; work: Work }) {
  const { role, lang, query } = ctx;
  if (query.play === "1") return <Player work={work} lang={lang} />;
  return (
    <>
      <div className="site-cover">{work.cover}</div>
      <Link
        className="site-button"
        href={siteHref(role, "R4", lang, { work: work.slug, play: "1" })}
      >
        ▶ {tr(lang, "Δείτε το βίντεο", "Watch the video")}
      </Link>
    </>
  );
}

function SectorLinks({ ctx, work }: { ctx: PageCtx; work: Work }) {
  const { role, lang } = ctx;
  const sectors = publicSectors(lang).filter((s) =>
    work.sectorIds.includes(s.id),
  );
  if (sectors.length === 0) return null;
  return (
    <div className="rc-chips">
      {sectors.map((s) => (
        <Link
          key={s.id}
          className="rc-chip"
          href={siteHref(role, "R2", lang, { sector: s.slug })}
        >
          {sectorName(s, lang)}
        </Link>
      ))}
    </div>
  );
}

// R4 Case study (/work/<slug>): `?work=slug`, `?play=1`.
export function R4(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { lang, query, state } = ctx;
  const other: Lang = lang === "en" ? "el" : "en";
  const fallback = publicWorks(lang).find((w) => isCaseStudy(w, lang));
  const work = query.work ? findWork(query.work) : fallback;
  const path = `/work/${work?.slug ?? query.work ?? ""}`;
  if (!work || !isPublicCase(work, lang))
    return (
      <Page ctx={ctx} code="R4" path={path}>
        <NotFound
          ctx={ctx}
          code="R4"
          otherParams={{ work: query.work }}
          existsInOther={isPublicCase(work, other)}
        />
      </Page>
    );
  return (
    <Page ctx={ctx} code="R4" path={path}>
      <section className="rc-hero site-hero">
        <div className="rc-eyebrow">
          {tr(lang, "Μελέτη περίπτωσης", "Case study")}
        </div>
        <h2>{workTitle(work, lang)}</h2>
        <p>{workSummary(work, lang)}</p>
        <SectorLinks ctx={ctx} work={work} />
      </section>
      <Section title={tr(lang, "Το βίντεο", "The video")}>
        <Media ctx={ctx} work={work} />
      </Section>
      {state !== "empty" && <Story work={work} lang={lang} />}
      <CtaBlock ctx={ctx} />
    </Page>
  );
}
