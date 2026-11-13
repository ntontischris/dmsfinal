// Οι οθόνες της νέας εμφάνισης (Χώροι) με τον κωδικό του Blueprint (κεφ. 8), όπως στο prototype: κωδικός → πραγματική διαδρομή.
// Οι οθόνες του μενού (NAV) παίρνουν διαδρομή και Δικαίωμα από το nav.ts· οι σελίδες λεπτομέρειας (π.χ. B2 = /app/clients/<id>)
// ζουν εδώ, με τη γονική οθόνη του NAV που κρίνει αν φαίνονται. Καθαρό αρχείο: το διαβάζει και ο browser.

import { NAV, type NavItem } from "@/components/shell/nav";

interface DetailScreen {
  code: string;
  title: string;
  // Η διαδρομή, με {id} για το στοιχείο.
  route: string;
  // Η οθόνη του NAV που πρέπει να βλέπει ο Χρήστης για να φαίνεται και αυτή.
  parent: string;
}

// Σελίδες λεπτομέρειας και φόρμες που δεν είναι στο μενού. Οι κωδικοί του prototype χωρίς σελίδα λείπουν.
const DETAIL_SCREENS: readonly DetailScreen[] = [
  {
    code: "A6",
    title: "Ρεπό / Άδεια",
    route: "/app/calendar/blocked/new",
    parent: "A5",
  },
  {
    code: "B2",
    title: "Σελίδα Πελάτη",
    route: "/app/clients/{id}",
    parent: "B1",
  },
  { code: "B4", title: "Ευκαιρία", route: "/app/pipeline/{id}", parent: "B3" },
  {
    code: "C2",
    title: "Πακέτο ή Υπηρεσία",
    route: "/app/catalogue/{id}",
    parent: "C1",
  },
  {
    code: "D2",
    title: "Συμφωνία",
    route: "/app/agreements/{id}",
    parent: "D1",
  },
  { code: "E3", title: "Γύρισμα", route: "/app/filming/{id}", parent: "E1" },
  { code: "E4", title: "Νέο Γύρισμα", route: "/app/filming/new", parent: "E1" },
  {
    code: "F2",
    title: "Αντικείμενο εξοπλισμού",
    route: "/app/equipment/{id}",
    parent: "F1",
  },
  {
    code: "G2",
    title: "Παραγωγή",
    route: "/app/productions/{id}",
    parent: "G1",
  },
  {
    code: "H2",
    title: "Παραδοτέο",
    route: "/app/deliverables/{id}",
    parent: "H1",
  },
  {
    code: "I3",
    title: "Καταχώρηση Τιμολογίου",
    route: "/app/finance/invoices/new",
    parent: "I2",
  },
  { code: "J2", title: "Συνομιλία", route: "/app/messages/{id}", parent: "J1" },
  {
    code: "K2",
    title: "Μηνύματα συστήματος",
    route: "/app/settings/system-messages",
    parent: "K1",
  },
  {
    code: "L2",
    title: "Συζητήσεις Βοηθού",
    route: "/app/knowledge/conversations",
    parent: "L1",
  },
  {
    code: "L3",
    title: "Αναπάντητες ερωτήσεις",
    route: "/app/knowledge/unanswered",
    parent: "L1",
  },
  { code: "M2", title: "Εξαγωγή", route: "/app/reports/export", parent: "M1" },
];

const NAV_ITEMS: readonly NavItem[] = NAV.flatMap((section) => section.items);

export type Allows = (requirement: string) => boolean;

const requirementsOf = (requires: NavItem["requires"]): readonly string[] =>
  requires === undefined
    ? []
    : typeof requires === "string"
      ? [requires]
      : requires;

// Ο ίδιος κωδικός μπορεί να υπάρχει δύο φορές στο NAV (π.χ. I2 για ομάδα και για πελάτη): φαίνεται αν φαίνεται έστω ένα.
const navItemsOf = (code: string): readonly NavItem[] =>
  NAV_ITEMS.filter((item) => item.code === code);

const isNavItemVisible = (item: NavItem, allows: Allows): boolean => {
  const requirements = requirementsOf(item.requires);
  return requirements.length === 0 || requirements.some(allows);
};

// Ορατή οθόνη = ορατή στο NAV (ή η γονική της στο NAV, για σελίδα λεπτομέρειας). Κωδικός χωρίς σελίδα = κρυφός.
export const isCodeVisible = (code: string, allows: Allows): boolean => {
  const items = navItemsOf(code);
  if (items.length > 0)
    return items.some((item) => isNavItemVisible(item, allows));
  const detail = DETAIL_SCREENS.find((screen) => screen.code === code);
  return detail !== undefined && isCodeVisible(detail.parent, allows);
};

export const isNavCode = (code: string): boolean => navItemsOf(code).length > 0;

// Ο τίτλος της οθόνης: του NAV, ή της σελίδας λεπτομέρειας.
export const titleOf = (code: string): string =>
  navItemsOf(code)[0]?.label ??
  DETAIL_SCREENS.find((screen) => screen.code === code)?.title ??
  code;

const routeOf = (code: string, allows?: Allows): string | undefined => {
  const items = navItemsOf(code);
  const visible = allows
    ? items.find((item) => isNavItemVisible(item, allows))
    : undefined;
  return (
    (visible ?? items[0])?.href ??
    DETAIL_SCREENS.find((screen) => screen.code === code)?.route
  );
};

export type HrefParams = Readonly<Record<string, string | undefined>>;

// Αντί για το screenHref(role, code, query) του prototype: η πραγματική διαδρομή του κωδικού, με το {id} στη θέση του
// και τα υπόλοιπα ως query. Π.χ. hrefOf("B2", { id: "x" }) → /app/clients/x.
export const hrefOf = (code: string, params: HrefParams = {}): string => {
  const route = routeOf(code) ?? "/app";
  const { id, ...rest } = params;
  const path = route.replace("{id}", encodeURIComponent(id ?? ""));
  const search = new URLSearchParams(
    Object.entries(rest).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  ).toString();
  return `${path}${search ? `?${search}` : ""}`;
};

// Η διαδρομή του κωδικού για τον συγκεκριμένο θεατή (π.χ. το I2 πελάτη και ομάδας έχουν ίδια διαδρομή, αλλά όχι πάντα).
export const hrefFor = (code: string, allows: Allows): string =>
  routeOf(code, allows) ?? "/app";

const matchesRoute = (pathname: string, route: string): boolean => {
  const parts = route.split("/");
  const segments = pathname.split("/");
  return (
    parts.length === segments.length &&
    parts.every((part, index) =>
      part === "{id}" ? segments[index] !== "" : part === segments[index],
    )
  );
};

// Ο κωδικός μιας διαδρομής: πρώτα ακριβές ταίριασμα (NAV ή λεπτομέρεια), αλλιώς η μεγαλύτερη διαδρομή του NAV που ταιριάζει
// (π.χ. /app/team/roles/<id> → N4). Τα /app/clients/duplicates (B6) κερδίζουν το /app/clients/{id} (B2) γιατί είναι στο NAV.
export const codeOfPath = (pathname: string): string | undefined =>
  codesOfPath(pathname)[0];

// Όλοι οι υποψήφιοι κωδικοί μιας διαδρομής: η ίδια σελίδα μπορεί να είναι δύο οθόνες, μία της ομάδας και μία του πελάτη
// (π.χ. /app/messages → J1 ομάδας, J3 πελάτη). Ποια ισχύει το κρίνει ο θεατής (spaces.ts, screenCodeOf).
export const codesOfPath = (pathname: string): readonly string[] => {
  const exactNav = NAV_ITEMS.filter((item) => item.href === pathname);
  if (exactNav.length > 0) return [...new Set(exactNav.map((item) => item.code))];
  // Σταθερή διαδρομή (π.χ. /app/filming/new) πριν από διαδρομή με {id} (/app/filming/{id}).
  const detail =
    DETAIL_SCREENS.find((screen) => screen.route === pathname) ??
    DETAIL_SCREENS.find((screen) => matchesRoute(pathname, screen.route));
  if (detail) return [detail.code];
  const prefix = NAV_ITEMS.filter(
    (item) => item.href !== "/app" && pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return prefix ? [prefix.code] : [];
};
