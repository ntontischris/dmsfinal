import Link from "next/link";

import type { CataloguePackage } from "@/data/catalogue";
import {
  packageName,
  packageText,
  publicPackages,
} from "@/data/website-access";
import {
  CtaBlock,
  Hero,
  Page,
  Section,
  ctxOf,
  priceLine,
  type PageCtx,
} from "@/screens/r-content-parts";
import type { ScreenProps } from "@/screens/shared";
import { siteHref, tr } from "@/screens/w-site";

function PackageCard({ ctx, p }: { ctx: PageCtx; p: CataloguePackage }) {
  const { role, lang } = ctx;
  return (
    <div className="site-tile">
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
  );
}

interface GroupProps {
  ctx: PageCtx;
  title: string;
  items: readonly CataloguePackage[];
}

function Group({ ctx, title, items }: GroupProps) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <div className="site-grid">
        {items.map((p) => (
          <PackageCard key={p.id} ctx={ctx} p={p} />
        ))}
      </div>
    </Section>
  );
}

// R5 Τιμές (/pricing): ομαδοποίηση ανά χρέωση, τιμή ή «Ζητήστε προσφορά».
export function R5(props: ScreenProps) {
  const ctx = ctxOf(props);
  const { lang, state } = ctx;
  const all = state === "empty" ? [] : publicPackages(lang);
  return (
    <Page ctx={ctx} code="R5" path="/pricing">
      <Hero
        eyebrow={tr(lang, "Τιμές", "Pricing")}
        title={tr(
          lang,
          "Καθαρές τιμές, χωρίς εκπλήξεις.",
          "Clear prices, no surprises.",
        )}
        text={tr(
          lang,
          "Οι τιμές είναι χωρίς ΦΠΑ.",
          "Prices are excluding VAT.",
        )}
      />
      <Group
        ctx={ctx}
        title={tr(lang, "Μηνιαία πακέτα", "Monthly packages")}
        items={all.filter((p) => p.billing === "μηνιαίο")}
      />
      <Group
        ctx={ctx}
        title={tr(lang, "Εφάπαξ πακέτα", "One-off packages")}
        items={all.filter((p) => p.billing !== "μηνιαίο")}
      />
      <CtaBlock
        ctx={ctx}
        title={tr(
          lang,
          "Δεν βρίσκετε αυτό που θέλετε;",
          "Not finding what you need?",
        )}
      />
    </Page>
  );
}
