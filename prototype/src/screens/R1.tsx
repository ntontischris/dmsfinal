import { featuredWorks } from "@/data/website-access";
import { Page, ctxOf } from "@/screens/r-content-parts";
import { clipsOf } from "@/screens/r1-model";
import { ExportQueue, LogoSources, SectorBins } from "@/screens/r1-sections";
import { Suite } from "@/screens/r1-suite";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

import "./r1.css";

// R1 Αρχική (/): ίδια σελίδα για κάθε ρόλο, στήνεται ως αίθουσα μοντάζ.
// Οι Επιλεγμένες Δουλειές είναι τα κλιπ του timeline· οι ενότητες χωρίς περιεχόμενο δεν εμφανίζονται.
export function R1(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { role, lang, state } = ctx;
  const isEmpty = state === "empty";
  const clips = isEmpty ? [] : clipsOf(featuredWorks(lang), role, lang);
  return (
    <Page ctx={ctx} code="R1" path="/">
      <div className="r1">
        <Suite
          lang={lang}
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
          clips={clips}
          quoteHref={siteHref(role, "R7", lang)}
          worksHref={siteHref(role, "R3", lang)}
        />
        {!isEmpty && (
          <>
            <SectorBins ctx={ctx} />
            <LogoSources ctx={ctx} />
          </>
        )}
        <ExportQueue ctx={ctx} />
      </div>
    </Page>
  );
}
