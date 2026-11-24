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
  | "home"
  | "clients"
  | "sales"
  | "agreements"
  | "productions"
  | "filming"
  | "calendar"
  | "messages"
  | "invoices"
  | "reports"
  | "team"
  | "equipment"
  | "knowledge"
  | "settings"
  | "c-today"
  | "c-work"
  | "c-filming"
  | "c-account"
  | "c-messages";

export type IconName =
  | "today"
  | "home"
  | "clients"
  | "sales"
  | "agreements"
  | "production"
  | "filming"
  | "calendar"
  | "talk"
  | "money"
  | "reports"
  | "team"
  | "equipment"
  | "knowledge"
  | "company"
  | "work"
  | "account";

export interface Space {
  id: SpaceId;
  label: string;
  // Μία λέξη για το κάτω μενού του κινητού, όταν το label δεν χωράει.
  barLabel?: string;
  icon: IconName;
  audience: "team" | "client";
  // Η ομάδα του αριστερού μενού: ανάμεσα σε δύο ομάδες μπαίνει διαχωριστικό.
  group?: number;
  // Οι οθόνες του θέματος με τη σειρά τους· η πρώτη ορατή είναι αυτή που ανοίγει, οι άλλες φαίνονται από κάτω στο μενού.
  tabs: readonly string[];
  // Οθόνες του θέματος χωρίς δική τους θέση: ουρές και σελίδες λεπτομέρειας.
  members: readonly string[];
}

// Το μενού της ομάδας: ένα θέμα ανά οντότητα (όπως το παλιό DMS), λίστα → σελίδα. Κάθε δουλειά έχει ένα σπίτι.
// Κωδικοί χωρίς σελίδα στην εφαρμογή απλώς δεν φαίνονται. Το E5 και το N3 είναι οθόνες πελάτη· στην ομάδα μπαίνουν
// μόνο για την περιήγηση χωρίς βάση. Το O8 (Ενσωματώσεις) είναι το N5 του prototype.
const TEAM_SPACES: readonly Space[] = [
  {
    id: "home",
    label: "Αρχική",
    icon: "home",
    audience: "team",
    group: 1,
    tabs: ["A1"],
    members: [],
  },
  {
    id: "clients",
    label: "Πελάτες",
    icon: "clients",
    audience: "team",
    group: 2,
    tabs: ["B1"],
    members: ["B6", "B2", "N2"],
  },
  {
    id: "sales",
    label: "Πωλήσεις",
    icon: "sales",
    audience: "team",
    group: 2,
    tabs: ["B3"],
    members: ["B5", "B4"],
  },
  {
    id: "agreements",
    label: "Συμφωνίες",
    icon: "agreements",
    audience: "team",
    group: 2,
    tabs: ["D1"],
    members: ["D4", "D2"],
  },
  {
    id: "productions",
    label: "Παραγωγές",
    icon: "production",
    audience: "team",
    group: 3,
    tabs: ["G1", "G4", "H1"],
    members: ["G2", "H2", "G3"],
  },
  {
    id: "filming",
    label: "Γυρίσματα",
    icon: "filming",
    audience: "team",
    group: 3,
    tabs: ["E1", "E6"],
    members: ["E2", "E3", "E4", "E7", "E5"],
  },
  {
    id: "calendar",
    label: "Ημερολόγιο",
    icon: "calendar",
    audience: "team",
    group: 3,
    tabs: ["A5"],
    members: ["A7", "A6"],
  },
  {
    id: "messages",
    label: "Μηνύματα",
    icon: "talk",
    audience: "team",
    group: 3,
    tabs: ["J1"],
    members: ["J2"],
  },
  {
    id: "invoices",
    label: "Τιμολόγια",
    icon: "money",
    audience: "team",
    group: 4,
    tabs: ["I2", "I1", "I4", "I6"],
    members: ["I3", "I8", "I5"],
  },
  {
    id: "reports",
    label: "Αναφορές",
    icon: "reports",
    audience: "team",
    group: 4,
    tabs: ["M1"],
    members: ["M2", "I7"],
  },
  {
    id: "team",
    label: "Ομάδα",
    icon: "team",
    audience: "team",
    group: 5,
    tabs: ["N1"],
    members: ["N4", "N6", "N5", "N3"],
  },
  {
    id: "equipment",
    label: "Εξοπλισμός",
    icon: "equipment",
    audience: "team",
    group: 5,
    tabs: ["F1"],
    members: ["F3", "F2"],
  },
  {
    id: "knowledge",
    label: "Γνώση",
    icon: "knowledge",
    audience: "team",
    group: 5,
    tabs: ["A8", "L1"],
    members: ["L2", "L3"],
  },
  {
    id: "settings",
    label: "Ρυθμίσεις",
    icon: "company",
    audience: "team",
    group: 5,
    // Οι υποσελίδες των Ρυθμίσεων (O2–O9) είναι κάρτες του θέματος, αμέσως μετά την Εταιρεία: η μόνη πλοήγησή τους
    // (οι παλιές καρτέλες μέσα στη σελίδα, SettingsTabs, έφυγαν).
    tabs: ["O1", "O2", "O3", "O4", "O5", "O6", "O9", "O7", "C1", "P2", "P1"],
    members: ["K1", "K2", "K3", "O8", "C2"],
  },
];

const CLIENT_SPACES: readonly Space[] = [
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

export const SPACES: readonly Space[] = [...TEAM_SPACES, ...CLIENT_SPACES];

// Εργαλεία πάνω δεξιά (Ειδοποιήσεις, Γνώση) και οθόνες του μενού προφίλ: δεν ανήκουν σε Χώρο.
export const TOOL_CODES = ["A2", "A8"] as const;
export const PROFILE_CODES = ["A3", "A4", "N3"] as const;

// Οι ουρές δεν είναι καρτέλες: φαίνονται ως φίλτρα κάτω από τη λίστα-γονιό τους (ουρά → γονιός).
export const QUEUES: Readonly<Record<string, string>> = {
  B5: "B3",
  B6: "B1",
  D4: "D1",
  E2: "E1",
  A7: "A5",
};

// Σύντομες ετικέτες για καρτέλες και φίλτρα· ο πλήρης τίτλος μένει στην αναζήτηση.
const SHORT_LABELS: Readonly<Record<string, string>> = {
  A5: "Ημερολόγιο",
  B1: "Πελάτες",
  B3: "Ευκαιρίες",
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

export const tabOf = (code: string): string => QUEUES[code] ?? code;

const MOBILE_MAX = 5;
// Με περισσότερους Χώρους, η μπάρα κρατά τόσους και οι υπόλοιποι πάνε στο «Περισσότερα».
const MOBILE_KEPT = 4;

// Στο κινητό χωράνε έως 5· με περισσότερους, 4 στη μπάρα και οι υπόλοιποι (π.χ. Εταιρεία) στο «Περισσότερα».
export const mobileBar = <T>(
  views: readonly T[],
): { bar: readonly T[]; more: readonly T[] } =>
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
  // Όλοι οι ορατοί κωδικοί του θέματος (καρτέλες, μέλη, λεπτομέρειες): ποιο θέμα ανάβει.
  codes: readonly string[];
  group?: number;
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

// Σελίδες εκτός μενού που ζουν στα «Εργαλεία» ενός Χώρου (η Εξαγωγή δεν έχει άλλο σύνδεσμο).
const SHELF_PAGES: readonly string[] = ["M2"];

const isPlacedElsewhere = (code: string, tabs: readonly string[]): boolean =>
  (TOOL_CODES as readonly string[]).includes(code) ||
  (PROFILE_CODES as readonly string[]).includes(code) ||
  tabs.includes(QUEUES[code] ?? "");

// Χωρίς ορατή καρτέλα, ό,τι φαίνεται από τα «Περισσότερα» γίνεται καρτέλα· ο Χώρος κρύβεται μόνο όταν δεν έχει τίποτα.
const viewOf = (space: Space, allows: Allows): SpaceView => {
  const tabs = visibleCodes(space.tabs, allows);
  const members = visibleCodes(space.members, allows);
  const rest = members.filter(
    (code) =>
      (isNavCode(code) || SHELF_PAGES.includes(code)) &&
      !isPlacedElsewhere(code, tabs),
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
    ...(space.group === undefined ? {} : { group: space.group }),
  };
};

const audienceOf = (allows: Allows): Space["audience"] =>
  allows("team") ? "team" : "client";

export const spacesModel = (allows: Allows): SpacesModel => {
  const spaces = SPACES.filter((space) => space.audience === audienceOf(allows))
    .map((space) => viewOf(space, allows))
    .filter((view) => view.tabs.length > 0);
  // Ένα εργαλείο που έχει ήδη θέση στο μενού (η Γνώση της ομάδας) δεν μπαίνει δεύτερη φορά πάνω δεξιά.
  const isInMenu = (code: string) =>
    spaces.some((view) => [...view.tabs, ...view.more].some((link) => link.code === code));
  return {
    spaces,
    tools: visibleCodes(TOOL_CODES, allows)
      .filter((code) => !isInMenu(code))
      .map((code) => linkOf(code, allows)),
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
