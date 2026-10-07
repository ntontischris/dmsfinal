import Link from "next/link";
import type { ReactNode } from "react";

import { publicLogos, publicSectors, sectorName } from "@/data/website-access";
import type { PageCtx } from "@/screens/r-content-parts";
import { siteHref, tr } from "@/screens/w-site";

// R1: οι ενότητες κάτω από την αίθουσα: Τομείς ως «bins», λογότυπα ως «πηγές», CTA ως «ουρά εξαγωγής».

const pad = (n: number) => String(n).padStart(2, "0");

interface HeadProps {
  label: string;
  title: string;
  aside?: ReactNode;
}

function SectionHead({ label, title, aside }: HeadProps) {
  return (
    <header className="r1-sec-head">
      <span className="kit-label">{label}</span>
      <h3>{title}</h3>
      {aside && <span className="r1-sec-aside">{aside}</span>}
    </header>
  );
}

export function SectorBins({ ctx }: { ctx: PageCtx }) {
  const { role, lang } = ctx;
  const sectors = publicSectors(lang);
  if (sectors.length === 0) return null;
  return (
    <section className="r1-section">
      <SectionHead label="Bins" title={tr(lang, "Τι κάνουμε", "What we do")} />
      <ul className="r1-bins">
        {sectors.map((s, i) => (
          <li key={s.id}>
            <Link href={siteHref(role, "R2", lang, { sector: s.slug })}>
              <svg viewBox="0 0 24 20" aria-hidden>
                <path d="M1 3 h8 l2 2.5 h12 v13.5 h-22z" />
              </svg>
              <span className="r1-bin-code">BIN_{pad(i + 1)}</span>
              <strong>{sectorName(s, lang)}</strong>
              <span className="r1-bin-line">
                {lang === "en" ? (s.introEn ?? s.introEl) : s.introEl}
              </span>
              <span className="r1-bin-go" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LogoSources({ ctx }: { ctx: PageCtx }) {
  const logos = publicLogos();
  if (logos.length === 0) return null;
  return (
    <section className="r1-section">
      <SectionHead
        label={tr(ctx.lang, "Πηγές", "Sources")}
        title={tr(ctx.lang, "Μας εμπιστεύονται", "Trusted by")}
      />
      <ul className="r1-sources">
        {logos.map((l, i) => (
          <li key={l.id}>
            <small>SRC_{pad(i + 1)}</small>
            {l.clientName}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExportQueue({ ctx }: { ctx: PageCtx }) {
  const { role, lang } = ctx;
  return (
    <section className="r1-section r1-queue">
      <div className="r1-panel">
        <p className="r1-panel-head kit-label">
          <span>{tr(lang, "Ουρά εξαγωγής", "Export queue")}</span>
          <span>{tr(lang, "1 εργασία", "1 job")}</span>
        </p>
        <div className="r1-job">
          <span className="r1-job-name">
            {tr(lang, "to_video_sas.mp4", "your_video.mp4")}
          </span>
          <span className="r1-job-spec">H.264 · 3840×2160 · 25p</span>
          <span className="r1-progress" aria-hidden>
            <i />
          </span>
          <span className="r1-job-state">
            {tr(lang, "Σε αναμονή", "Queued")}
          </span>
        </div>
      </div>
      <h3>{tr(lang, "Έχετε μια ιδέα για βίντεο;", "Got a video in mind?")}</h3>
      <Link className="site-button" href={siteHref(role, "R7", lang)}>
        {tr(lang, "Ζητήστε προσφορά", "Request a quote")}
      </Link>
    </section>
  );
}
