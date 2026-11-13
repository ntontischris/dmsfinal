// Οι Χώροι: οι λίγες μεγάλες περιοχές στις οποίες χωρίζεται η εφαρμογή, με βάση τη δουλειά και όχι τα modules.
// Ένας σκελετός για την ομάδα και ένας για τους Χρήστες πελάτη· ο καθένας βλέπει όσους του ανοίγουν τα Δικαιώματα
// (ποτέ μενού ανά Ρόλο, ADR 0001). Οι ουρές και οι σελίδες λεπτομέρειας ανήκουν σε Χώρο αλλά δεν είναι καρτέλες.
// Από το prototype (`data/spaces.ts`): ορατός κωδικός = ορατός στο NAV (screens.ts)· κωδικός χωρίς σελίδα = κρυφός.

import {
  codesOfPath,
  hrefFor,
  isCodeVisible,
  isNavCode,
  titleOf,
  type Allows,
} from "@/spaces/data/screens";

export type SpaceId =
  | "today"
  | "clients"
  | "production"
  | "money"
  | "talk"
  | "company"
  | "c-today"
  | "c-work"
  | "c-filming"
  | "c-account"
  | "c-messages";

export type IconName =
  | "today"
  | "clients"
  | "production"
  | "money"
  | "talk"
  | "company"
  | "work"
  | "filming"
  | "account";

export interface Space {
  id: SpaceId;
  label: string;
  // Μία λέξη για το κάτω μενού του κινητού, όταν το label δεν χωράει.
  barLabel?: string;
  icon: IconName;
  audience: "team" | "client";
  // Οι καρτέλες του Χώρου, με τη σειρά τους· η πρώτη ορατή είναι αυτή που ανοίγει.
  tabs: readonly string[];
  // Οθόνες του Χώρου χωρίς καρτέλα: ουρές και σελίδες λεπτομέρειας.
  members: readonly string[];
  // Σύνδεσμοι δίπλα στις καρτέλες προς οθόνη άλλου Χώρου (όχι αντίγραφό της), π.χ. «Τιμές» → Κατάλογος.
  links?: readonly { label: string; code: string }[];
}

// Ίδιοι Χώροι με το prototype. Οι κωδικοί χωρίς σελίδα στην εφαρμογή (π.χ. Q1) απλώς δεν φαίνονται.
// Το E5 και το N3 είναι οθόνες πελάτη· στους Χώρους ομάδας μπαίνουν μόνο για την περιήγηση χωρίς βάση. Το O8 (Ενσωματώσεις)
// είναι το N5 του prototype και το KIT ο κατάλογος των components.
export const SPACES: readonly Space[] = [
  {
    id: "today",
    label: "Σήμερα",
    icon: "today",
    audience: "team",
    tabs: ["A1", "A5", "E6"],
    members: ["A2", "A6", "G4"],
  },
  {
    id: "clients",
    label: "Πελάτες",
    icon: "clients",
    audience: "team",
    tabs: ["B1", "B3", "D1", "C1"],
    members: ["B2", "B4", "B5", "B6", "C2", "D2", "D4", "N2"],
  },
  {
    id: "production",
    label: "Παραγωγή",
    icon: "production",
    audience: "team",
    tabs: ["E1", "G1", "H1", "F1"],
    members: ["A7", "E2", "E3", "E4", "E7", "F2", "F3", "G2", "H2", "E5"],
  },
  {
    id: "money",
    label: "Χρήματα",
    icon: "money",
    audience: "team",
    tabs: ["I2", "I1", "I4", "I6", "I7", "M1", "M2"],
    members: ["G3", "I3", "I5"],
    links: [{ label: "Τιμές", code: "C1" }],
  },
  {
    id: "talk",
    label: "Επικοινωνία",
    icon: "talk",
    audience: "team",
    tabs: ["J1"],
    members: ["J2"],
  },
  {
    id: "company",
    label: "Εταιρεία",
    icon: "company",
    audience: "team",
    tabs: ["N1", "K1", "L1", "O1", "P2", "P1", "Q1"],
    members: [
      "K2",
      "K3",
      "L2",
      "L3",
      "N4",
      "N5",
      "O2",
      "O3",
      "O6",
      "O7",
      "O8",
      "KIT",
      "N3",
    ],
  },
  {
    id: "c-today",
    label: "Σήμερα",
    icon: "today",
    audience: "client",
    tabs: ["A1"],
    members: ["A2"],
  },
  {
    id: "c-work",
    label: "Η δουλειά μου",
    barLabel: "Δουλειά",
    icon: "work",
    audience: "client",
    tabs: ["G1", "H1"],
    members: ["G2", "H2"],
  },
  {
    id: "c-filming",
    label: "Γυρίσματα",
    icon: "filming",
    audience: "client",
    tabs: ["E1", "E5", "A5"],
    members: ["E3"],
  },
  {
    id: "c-account",
    label: "Λογαριασμός",
    icon: "account",
    audience: "client",
    tabs: ["D1", "I2", "I5"],
    members: ["D2"],
  },
  {
    id: "c-messages",
    label: "Μηνύματα",
    icon: "talk",
    audience: "client",
    tabs: ["J3"],
    members: [],
  },
];

// Εργαλεία πάνω δεξιά (Ειδοποιήσεις, Γνώση) και οθόνες του μενού προφίλ: δεν ανήκουν σε Χώρο.
export const TOOL_CODES = ["A2", "A8"] as const;
export const PROFILE_CODES = ["A3", "A4", "N3"] as const;

// Οι ουρές δεν είναι καρτέλες: φαίνονται ως φίλτρα κάτω από τη λίστα-γονιό τους (ουρά → γονιός).
export const QUEUES: Readonly<Record<string, string>> = {
  B5: "B1",
  B6: "B1",
  D4: "D1",
  E2: "E1",
  A7: "E1",
};

// Υποσελίδες με δικές τους καρτέλες μέσα στην οθόνη (Ρυθμίσεις): ανήκουν στην καρτέλα-γονιό, γιατί η οθόνη τις πλοηγεί ήδη.
const SUBPAGES: Readonly<Record<string, string>> = {
  O2: "O1",
  O3: "O1",
  O6: "O1",
  O7: "O1",
  K3: "O1",
};

// Σύντομες ετικέτες για καρτέλες και φίλτρα· ο πλήρης τίτλος μένει στην αναζήτηση.
const SHORT_LABELS: Readonly<Record<string, string>> = {
  A5: "Ημερολόγιο",
  B1: "Πελάτες",
  B3: "Pipeline",
  B5: "Χωρίς υπεύθυνο",
  B6: "Πιθανά διπλά",
  C1: "Κατάλογος",
  D1: "Συμφωνίες",
  D4: "Προς έγκριση",
  E1: "Γυρίσματα",
  E2: "Αναμένουν έγκριση",
  E5: "Νέα κράτηση",
  A7: "Διαγραφές Google",
  F1: "Εξοπλισμός",
  G1: "Παραγωγές",
  H1: "Παραδοτέα",
  I1: "Προς τιμολόγηση",
  I2: "Τιμολόγια",
  I4: "Εισπράξεις",
  I5: "Καρτέλα",
  I6: "Έξοδα",
  I7: "Κερδοφορία",
  M1: "Αναφορές",
  N1: "Ομάδα",
  K1: "Αυτοματισμοί",
  L1: "Γνώση",
  O1: "Ρυθμίσεις",
  P1: "Ίχνος",
  P2: "Υγεία",
  A2: "Ειδοποιήσεις",
  A8: "Γνώση",
  N3: "Συνάδελφοι",
  A6: "Ρεπό / Άδεια",
  E6: "Τα Γυρίσματά μου",
  G4: "Οι εργασίες μου",
  J1: "Εισερχόμενα",
  J3: "Μηνύματα",
  N4: "Ρόλοι και Δικαιώματα",
  O8: "Ενσωματώσεις",
};

export const shortLabel = (code: string): string | undefined =>
  SHORT_LABELS[code];

export const labelOf = (code: string): string =>
  shortLabel(code) ?? titleOf(code);

export const barLabel = (space: Pick<Space, "label" | "barLabel">): string =>
  space.barLabel ?? space.label;

export const tabOf = (code: string): string =>
  QUEUES[code] ?? SUBPAGES[code] ?? code;

const MOBILE_MAX = 5;
// Με περισσότερους Χώρους, η μπάρα κρατά τόσους και οι υπόλοιποι πάνε στο «Περισσότερα».
const MOBILE_KEPT = 4;

// Στο κινητό χωράνε έως 5· με περισσότερους, 4 στη μπάρα και οι υπόλοιποι (π.χ. Εταιρεία) στο «Περισσότερα».
export const mobileBar = <T>(views: readonly T[]): { bar: readonly T[]; more: readonly T[] } =>
  views.length > MOBILE_MAX
    ? { bar: views.slice(0, MOBILE_KEPT), more: views.slice(MOBILE_KEPT) }
    : { bar: views, more: [] };

// --- Το μοντέλο του θεατή: υπολογίζεται στον server από τα Δικαιώματα και περνά στο κέλυφος (σειριοποιήσιμο).

export interface ScreenLink {
  code: string;
  label: string;
  href: string;
}

export interface SpaceView {
  id: SpaceId;
  label: string;
  barLabel: string;
  icon: IconName;
  tabs: readonly ScreenLink[];
  // Οι ουρές ανά καρτέλα-γονιό.
  queues: Readonly<Record<string, readonly ScreenLink[]>>;
  // Οθόνες του μενού χωρίς καρτέλα ή ουρά: στο «Περισσότερα» στο τέλος των καρτελών, για να μη χαθεί καμία.
  more: readonly ScreenLink[];
  links: readonly (ScreenLink & { space: string })[];
  // Όλοι οι ορατοί κωδικοί του Χώρου (καρτέλες, μέλη, λεπτομέρειες): ποιος Χώρος ανάβει.
  codes: readonly string[];
}

export interface SpacesModel {
  spaces: readonly SpaceView[];
  tools: readonly ScreenLink[];
  profile: readonly ScreenLink[];
}

const linkOf = (code: string, allows: Allows): ScreenLink => ({
  code,
  label: labelOf(code),
  href: hrefFor(code, allows),
});

const visibleCodes = (
  codes: readonly string[],
  allows: Allows,
): readonly string[] => codes.filter((code) => isCodeVisible(code, allows));

const isPlacedElsewhere = (code: string, tabs: readonly string[]): boolean =>
  (TOOL_CODES as readonly string[]).includes(code) ||
  (PROFILE_CODES as readonly string[]).includes(code) ||
  tabs.includes(QUEUES[code] ?? SUBPAGES[code] ?? "");

// Χωρίς ορατή καρτέλα, ό,τι φαίνεται από τα «Περισσότερα» γίνεται καρτέλα· ο Χώρος κρύβεται μόνο όταν δεν έχει τίποτα.
const viewOf = (space: Space, allows: Allows): Omit<SpaceView, "links"> => {
  const tabs = visibleCodes(space.tabs, allows);
  const members = visibleCodes(space.members, allows);
  const rest = members.filter(
    (code) => isNavCode(code) && !isPlacedElsewhere(code, tabs),
  );
  const shownTabs = tabs.length > 0 ? tabs : rest;
  const queues = Object.fromEntries(
    shownTabs.map((tab) => [
      tab,
      members
        .filter((code) => QUEUES[code] === tab)
        .map((code) => linkOf(code, allows)),
    ]),
  );
  return {
    id: space.id,
    label: space.label,
    barLabel: barLabel(space),
    icon: space.icon,
    tabs: shownTabs.map((code) => linkOf(code, allows)),
    queues,
    more: tabs.length > 0 ? rest.map((code) => linkOf(code, allows)) : [],
    codes: [...tabs, ...members],
  };
};

const audienceOf = (allows: Allows): Space["audience"] =>
  allows("team") ? "team" : "client";

export const spacesModel = (allows: Allows): SpacesModel => {
  const views = SPACES.filter((space) => space.audience === audienceOf(allows))
    .map((space) => ({ space, view: viewOf(space, allows) }))
    .filter(({ view }) => view.tabs.length > 0);
  // Οι σύνδεσμοι προς οθόνη άλλου Χώρου, μόνο όσες βλέπει ο Χρήστης.
  const homeOf = (code: string) =>
    views.find(({ view }) => view.codes.includes(code))?.view;
  return {
    spaces: views.map(({ space, view }) => ({
      ...view,
      links: (space.links ?? []).flatMap((link) => {
        const home = homeOf(link.code);
        return home
          ? [
              {
                ...linkOf(link.code, allows),
                label: link.label,
                space: home.label,
              },
            ]
          : [];
      }),
    })),
    tools: visibleCodes(TOOL_CODES, allows).map((code) => linkOf(code, allows)),
    profile: visibleCodes(PROFILE_CODES, allows).map((code) =>
      linkOf(code, allows),
    ),
  };
};

export const landingOf = (view: Pick<SpaceView, "tabs">): string =>
  view.tabs[0].href;

export const spaceOf = (
  code: string | undefined,
  model: SpacesModel,
): SpaceView | undefined =>
  code === undefined
    ? undefined
    : model.spaces.find((view) => view.codes.includes(code));

// Όλοι οι κωδικοί ενός Χώρου (καρτέλες και μέλη), π.χ. για τη λωρίδα του από τις κάρτες της Σήμερα.
export const codesOfSpace = (id: SpaceId): readonly string[] => {
  const space = SPACES.find((candidate) => candidate.id === id);
  return space ? [...space.tabs, ...space.members] : [];
};

// Ο κωδικός της διαδρομής για αυτόν τον θεατή: από τους υποψήφιους, αυτός που ανήκει σε Χώρο του (π.χ. το /app/messages
// είναι J1 για την ομάδα και J3 για τον πελάτη). Αλλιώς ο πρώτος, όπως πριν.
export const screenCodeOf = (
  pathname: string,
  model: SpacesModel,
): string | undefined => {
  const codes = codesOfPath(pathname);
  return codes.find((code) => spaceOf(code, model) !== undefined) ?? codes[0];
};
