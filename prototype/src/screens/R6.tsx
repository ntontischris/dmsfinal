import { COMPANY, TAX } from "@/data/settings-company";
import type { Lang, TeamCard } from "@/data/website";
import { publicTeam } from "@/data/website-access";
import {
  CtaBlock,
  Hero,
  Page,
  Section,
  ctxOf,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { tr } from "@/screens/w-site";

const nameOf = (t: TeamCard, lang: Lang) =>
  lang === "en" ? (t.nameEn ?? t.name) : t.name;
const titleOf = (t: TeamCard, lang: Lang) =>
  lang === "en" ? (t.titleEn ?? t.titleEl) : t.titleEl;

function Team({ ctx }: { ctx: PageCtx }) {
  const { lang } = ctx;
  const team = publicTeam(lang);
  if (team.length === 0) return null;
  return (
    <Section title={tr(lang, "Η ομάδα", "The team")}>
      <div className="site-grid">
        {team.map((t) => (
          <div key={t.id} className="site-tile">
            <div className="rc-avatar">{t.photo}</div>
            <div className="rc-tile-title">{nameOf(t, lang)}</div>
            <p className="rc-muted">{titleOf(t, lang)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Details({ lang }: { lang: Lang }) {
  return (
    <Section title={tr(lang, "Στοιχεία εταιρείας", "Company details")}>
      <p className="rc-muted">
        {COMPANY.name}
        <br />
        {COMPANY.address}
        <br />
        {COMPANY.phone} · {COMPANY.email}
        <br />
        {tr(lang, "ΑΦΜ", "VAT no.")} {TAX.afm} · {TAX.doy} · ΓΕΜΗ {TAX.gemi}
      </p>
    </Section>
  );
}

// R6 Σχετικά (/about): σταθερό κείμενο, κάρτες ομάδας με Συναίνεση, στοιχεία εταιρείας.
export function R6(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { lang, state } = ctx;
  return (
    <Page ctx={ctx} code="R6" path="/about">
      <Hero
        eyebrow={tr(lang, "Σχετικά", "About")}
        title={tr(
          lang,
          "Μικρή ομάδα, μεγάλη προσοχή στη λεπτομέρεια.",
          "A small team with a big eye for detail.",
        )}
      />
      <div className="rc-prose site-section">
        <p>
          {tr(
            lang,
            "Η Delta Films είναι μια ομάδα παραγωγής βίντεο στην Αθήνα. Δουλεύουμε με επιχειρήσεις που θέλουν σταθερή παρουσία και βίντεο που τις αντιπροσωπεύουν.",
            "Delta Films is a video production team in Athens. We work with businesses that want a steady presence and video that represents them.",
          )}
        </p>
        <p>
          {tr(
            lang,
            "Γυρίζουμε στον χώρο σας, μοντάρουμε στο δικό μας στούντιο και παραδίδουμε όταν συμφωνήσαμε.",
            "We shoot at your place, edit in our own studio and deliver when we said we would.",
          )}
        </p>
      </div>
      {state !== "empty" && <Team ctx={ctx} />}
      <Details lang={lang} />
      <CtaBlock ctx={ctx} />
    </Page>
  );
}
