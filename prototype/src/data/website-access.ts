// Κανόνες της Ιστοσελίδας: ποιος διαχειρίζεται, τι φαίνεται σε ποια γλώσσα, ποια Πακέτα είναι δημόσια.
// Πηγές: κεφ. 9 «Ιστοσελίδα: λεπτομέρειες κανόνων», ADR 0013.

import { CATALOGUE, isPackage, type CataloguePackage } from "@/data/catalogue";
import type { RoleId } from "@/data/roles";
import {
  LOGOS,
  SECTORS,
  TEAM_CARDS,
  WORKS,
  type ClientLogo,
  type Consent,
  type Lang,
  type Sector,
  type TeamCard,
  type Work,
} from "@/data/website";

export interface WebsiteCaps {
  canManageWebsite: boolean; // «Διαχειρίζεται Ιστοσελίδα» (Εύρος «όλα»)
  isSignedIn: boolean;
}

export const websiteCapsOf = (role: RoleId): WebsiteCaps => ({
  canManageWebsite: role === "owner" || role === "admin",
  isSignedIn: role !== "visitor",
});

export const parseLang = (value: string | undefined): Lang =>
  value === "en" ? "en" : "el";

// Η διεύθυνση που θα είχε η σελίδα στο πραγματικό σύστημα.
export const publicPath = (lang: Lang, path: string): string =>
  `devremedia.com${lang === "en" ? "/en" : ""}${path === "/" && lang === "en" ? "" : path}`;

// Τι λείπει για να φανεί μια καταχώριση. Κενή λίστα = φαίνεται.
export type Blocker =
  "κρυφή" | "χωρίς Συναίνεση" | "χωρίς ελληνικό" | "χωρίς αγγλικό";

const consentBlocks = (consent: Consent | undefined): boolean =>
  !!consent && !consent.isGiven;

interface Visible {
  isShown: boolean;
  needsConsent: boolean;
  consent?: Consent;
  hasEl: boolean;
  hasEn: boolean;
}

const blockersOf = (entry: Visible, lang: Lang): readonly Blocker[] =>
  [
    !entry.isShown && ("κρυφή" as const),
    entry.needsConsent &&
      consentBlocks(entry.consent) &&
      ("χωρίς Συναίνεση" as const),
    !entry.hasEl && ("χωρίς ελληνικό" as const),
    lang === "en" && !entry.hasEn && ("χωρίς αγγλικό" as const),
  ].filter((b): b is Blocker => !!b);

const sectorShape = (s: Sector): Visible => ({
  isShown: s.isShown,
  needsConsent: false,
  hasEl: !!s.nameEl && !!s.introEl,
  hasEn: !!s.nameEn && !!s.introEn,
});

const workShape = (w: Work): Visible => ({
  isShown: w.isShown,
  needsConsent: !w.isOwnProduction,
  consent: w.consent,
  hasEl: !!w.titleEl && !!w.summaryEl,
  hasEn: !!w.titleEn && !!w.summaryEn,
});

const logoShape = (l: ClientLogo): Visible => ({
  isShown: l.isShown,
  needsConsent: true,
  consent: l.consent,
  hasEl: true,
  hasEn: true, // εικόνα: ίδια και στις δύο γλώσσες
});

const teamShape = (t: TeamCard): Visible => ({
  isShown: t.isShown,
  needsConsent: true,
  consent: t.consent,
  hasEl: !!t.titleEl,
  hasEn: !!t.titleEn,
});

export const sectorBlockers = (s: Sector, lang: Lang) =>
  blockersOf(sectorShape(s), lang);
export const workBlockers = (w: Work, lang: Lang) =>
  blockersOf(workShape(w), lang);
export const logoBlockers = (l: ClientLogo, lang: Lang) =>
  blockersOf(logoShape(l), lang);
export const teamBlockers = (t: TeamCard, lang: Lang) =>
  blockersOf(teamShape(t), lang);

// Η ένδειξη της λίστας διαχείρισης (κεφ. 9, «Πότε φαίνεται μια καταχώριση»).
export type PublishStatus =
  "Δεν φαίνεται" | "Φαίνεται στα ελληνικά" | "Φαίνεται και στα αγγλικά";

const statusFrom = (
  el: readonly Blocker[],
  en: readonly Blocker[],
): PublishStatus =>
  el.length > 0
    ? "Δεν φαίνεται"
    : en.length > 0
      ? "Φαίνεται στα ελληνικά"
      : "Φαίνεται και στα αγγλικά";

export const sectorStatus = (s: Sector) =>
  statusFrom(sectorBlockers(s, "el"), sectorBlockers(s, "en"));
export const workStatus = (w: Work) =>
  statusFrom(workBlockers(w, "el"), workBlockers(w, "en"));
export const logoStatus = (l: ClientLogo) =>
  statusFrom(logoBlockers(l, "el"), logoBlockers(l, "en"));
export const teamStatus = (t: TeamCard) =>
  statusFrom(teamBlockers(t, "el"), teamBlockers(t, "en"));

const byOrder = <T extends { order: number }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.order - b.order);

export const publicSectors = (lang: Lang): readonly Sector[] =>
  byOrder(SECTORS.filter((s) => sectorBlockers(s, lang).length === 0));

export const publicWorks = (lang: Lang): readonly Work[] =>
  byOrder(WORKS.filter((w) => workBlockers(w, lang).length === 0));

export const featuredWorks = (lang: Lang): readonly Work[] =>
  publicWorks(lang).filter((w) => w.isFeatured);

export const isCaseStudy = (w: Work, lang: Lang): boolean =>
  lang === "en" ? !!w.storyEn : !!w.storyEl;

export const publicLogos = (): readonly ClientLogo[] =>
  byOrder(LOGOS.filter((l) => logoBlockers(l, "el").length === 0));

export const publicTeam = (lang: Lang): readonly TeamCard[] =>
  byOrder(TEAM_CARDS.filter((t) => teamBlockers(t, lang).length === 0));

export const findSector = (slug: string | undefined): Sector | undefined =>
  SECTORS.find((s) => s.slug === slug);

export const findWork = (slug: string | undefined): Work | undefined =>
  WORKS.find((w) => w.slug === slug);

// Δημόσιο Πακέτο: σημειωμένο δημόσιο στον Κατάλογο, όχι αρχειοθετημένο·
// στο /en μόνο με αγγλικό όνομα και αγγλική δημόσια περιγραφή (κεφ. 9 #9).
export const isPackagePublicIn = (p: CataloguePackage, lang: Lang): boolean =>
  p.isPublic &&
  !p.isArchived &&
  !!p.descriptionPublic &&
  (lang === "el" || (!!p.nameEn && !!p.descriptionPublicEn));

export const publicPackages = (lang: Lang): readonly CataloguePackage[] =>
  CATALOGUE.filter(isPackage).filter((p) => isPackagePublicIn(p, lang));

export const packagesOfSector = (
  s: Sector,
  lang: Lang,
): readonly CataloguePackage[] =>
  publicPackages(lang).filter((p) => s.packageIds.includes(p.id));

export const packageName = (p: CataloguePackage, lang: Lang): string =>
  lang === "en" ? p.nameEn : p.name;

export const packageText = (p: CataloguePackage, lang: Lang): string =>
  lang === "en" ? p.descriptionPublicEn : p.descriptionPublic;

export const sectorName = (s: Sector, lang: Lang): string =>
  lang === "en" ? (s.nameEn ?? s.nameEl) : s.nameEl;

export const workTitle = (w: Work, lang: Lang): string =>
  lang === "en" ? (w.titleEn ?? w.titleEl) : w.titleEl;
