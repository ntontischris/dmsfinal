// Οι Χώροι (νέα εμφάνιση): λίγες μεγάλες περιοχές με βάση τη δουλειά, πάνω από τις οθόνες του NAV.
// Δεν είναι δεύτερο μενού: κάθε Χώρος δείχνει κωδικούς του NAV, και το href και το `requires` έρχονται από εκεί.
// Ο καθένας βλέπει όσα του ανοίγουν τα Δικαιώματα (ποτέ μενού ανά Ρόλο, ADR 0001). Από το prototype `data/spaces.ts`.

import { currentHref, visibleNav, type NavItem } from "@/components/shell/nav";

export type SpaceIcon = "today" | "clients" | "production" | "money" | "talk" | "company" | "work" | "filming" | "account";

interface SpaceDef {
  id: string;
  label: string;
  // Μία λέξη για τη μπάρα του κινητού, όταν το label δεν χωράει.
  barLabel?: string;
  icon: SpaceIcon;
  audience: "team" | "client";
  // Οι καρτέλες, με τη σειρά τους· η πρώτη ορατή είναι αυτή που ανοίγει.
  tabs: readonly string[];
  // Οθόνες του Χώρου χωρίς καρτέλα (ουρές, υποσελίδες): στο «Περισσότερα» στο τέλος των καρτελών.
  more: readonly string[];
}

// Οι κωδικοί του prototype χωρίς σελίδα στην εφαρμογή (π.χ. I6, I7, M2, Q1) λείπουν. Το H3 του πελάτη είναι το H1.
// Το E5 και το N3 είναι οθόνες πελάτη· στους Χώρους ομάδας μπαίνουν μόνο για την περιήγηση χωρίς βάση.
const SPACES: readonly SpaceDef[] = [
  { id: "today", label: "Σήμερα", icon: "today", audience: "team", tabs: ["A1", "A5"], more: ["E6"] },
  {
    id: "clients",
    label: "Πελάτες",
    icon: "clients",
    audience: "team",
    tabs: ["B1", "B3", "D1", "C1"],
    more: ["B5", "B6", "D4"],
  },
  {
    id: "production",
    label: "Παραγωγή",
    icon: "production",
    audience: "team",
    tabs: ["E1", "G1", "H1", "F1"],
    more: ["E2", "A7", "E7", "F3", "E5"],
  },
  { id: "money", label: "Χρήματα", icon: "money", audience: "team", tabs: ["I2", "I1", "I4", "M1"], more: ["I5", "G3"] },
  { id: "talk", label: "Επικοινωνία", icon: "talk", audience: "team", tabs: ["J1"], more: [] },
  {
    id: "company",
    label: "Εταιρεία",
    icon: "company",
    audience: "team",
    tabs: ["N1", "K1", "L1", "O1", "P2", "P1"],
    more: ["N4", "N3", "K3", "O2", "O3", "O6", "O7", "O8", "KIT"],
  },
  { id: "c-today", label: "Σήμερα", icon: "today", audience: "client", tabs: ["A1"], more: [] },
  {
    id: "c-work",
    label: "Η δουλειά μου",
    barLabel: "Δουλειά",
    icon: "work",
    audience: "client",
    tabs: ["G1", "H1"],
    more: [],
  },
  { id: "c-filming", label: "Γυρίσματα", icon: "filming", audience: "client", tabs: ["E1", "E5", "A5"], more: [] },
  {
    id: "c-account",
    label: "Λογαριασμός",
    icon: "account",
    audience: "client",
    tabs: ["D1", "I2", "I5"],
    more: ["N3"],
  },
  { id: "c-messages", label: "Μηνύματα", icon: "talk", audience: "client", tabs: ["J3"], more: [] },
];

// Εργαλεία πάνω δεξιά, έξω από τους Χώρους: Ειδοποιήσεις (καμπανάκι) και Γνώση.
const TOOL_CODES = ["A2", "A8"] as const;

// Σύντομες ετικέτες για καρτέλες· ο πλήρης τίτλος μένει στην οθόνη.
const SHORT_LABELS: Readonly<Record<string, string>> = {
  B3: "Pipeline",
  D4: "Προς έγκριση",
  E2: "Αναμένουν έγκριση",
  E5: "Νέα κράτηση",
  A7: "Διαγραφές Google",
  I5: "Καρτέλα",
  L1: "Γνώση",
  O1: "Ρυθμίσεις",
  P1: "Ίχνος",
  P2: "Υγεία",
};

export interface SpaceLink {
  code: string;
  label: string;
  href: string;
}

export interface SpaceView {
  id: string;
  label: string;
  barLabel: string;
  icon: SpaceIcon;
  tabs: readonly SpaceLink[];
  more: readonly SpaceLink[];
}

export interface SpacesShell {
  spaces: readonly SpaceView[];
  tools: readonly SpaceLink[];
}

type Allows = (requirement: string) => boolean;

const toLink = (item: NavItem): SpaceLink => ({
  code: item.code,
  label: SHORT_LABELS[item.code] ?? item.label,
  href: item.href,
});

// Οι ορατοί κωδικοί, με τη σειρά τους· ο ίδιος κωδικός μπορεί να υπάρχει για ομάδα και για πελάτη (π.χ. I2).
const linksOf = (codes: readonly string[], visible: readonly NavItem[]): SpaceLink[] =>
  codes.flatMap((code) => {
    const item = visible.find((candidate) => candidate.code === code);
    return item ? [toLink(item)] : [];
  });

// Χωρίς ορατή καρτέλα, ό,τι φαίνεται από τα «Περισσότερα» γίνεται καρτέλα· ο Χώρος κρύβεται μόνο όταν δεν έχει τίποτα.
const viewOf = (space: SpaceDef, visible: readonly NavItem[]): SpaceView => {
  const tabs = linksOf(space.tabs, visible);
  const more = linksOf(space.more, visible);
  return {
    id: space.id,
    label: space.label,
    barLabel: space.barLabel ?? space.label,
    icon: space.icon,
    tabs: tabs.length > 0 ? tabs : more,
    more: tabs.length > 0 ? more : [],
  };
};

// Ομάδα όποιος έχει «team» (και χωρίς βάση, όπου όλα επιτρέπονται)· αλλιώς οι Χώροι πελάτη.
export const spacesShell = (allows: Allows): SpacesShell => {
  const visible = visibleNav(allows).flatMap((section) => section.items);
  const audience = allows("team") ? "team" : "client";
  return {
    spaces: SPACES.filter((space) => space.audience === audience)
      .map((space) => viewOf(space, visible))
      .filter((view) => view.tabs.length > 0),
    tools: linksOf(TOOL_CODES, visible),
  };
};

export const landingOf = (view: SpaceView): string => view.tabs[0].href;

// Πού βρίσκεται ο Χρήστης: η μεγαλύτερη διαδρομή που ταιριάζει, ώστε το /app/clients/123 να ανάβει Πελάτες → B1.
export const currentPlace = (
  pathname: string,
  shell: SpacesShell,
): { spaceId: string | undefined; href: string | undefined } => {
  const links = [...shell.spaces.flatMap((view) => [...view.tabs, ...view.more]), ...shell.tools];
  const href = currentHref(pathname, [{ title: "", items: links }]);
  const owner = shell.spaces.find((view) => [...view.tabs, ...view.more].some((link) => link.href === href));
  return { spaceId: owner?.id, href };
};

const MOBILE_MAX = 5;
// Με περισσότερους Χώρους, η μπάρα κρατά τόσους και οι υπόλοιποι (π.χ. Εταιρεία) πάνε στο «Περισσότερα».
const MOBILE_KEPT = 4;

export const mobileBar = (
  views: readonly SpaceView[],
): { bar: readonly SpaceView[]; more: readonly SpaceView[] } =>
  views.length > MOBILE_MAX
    ? { bar: views.slice(0, MOBILE_KEPT), more: views.slice(MOBILE_KEPT) }
    : { bar: views, more: [] };
