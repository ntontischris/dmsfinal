// Η πλοήγηση της εφαρμογής: ενότητες με τα modules τους. Κάθε module προσθέτει εδώ τις οθόνες του όταν χτιστεί.
// Ο κωδικός είναι αυτός του Blueprint (κεφ. 8), για να αντιστοιχίζεται με το prototype.
// `requires`: ένα Δικαίωμα (ή περισσότερα, αρκεί ένα), ή «owner» για ό,τι κάνει μόνο ο Ιδιοκτήτης.

export interface NavItem {
  code: string;
  label: string;
  href: string;
  // Ένα Δικαίωμα, ή περισσότερα (αρκεί ένα). «owner» = μόνο Ιδιοκτήτης.
  requires?: string | readonly string[];
}

export interface NavSection {
  title: string;
  items: readonly NavItem[];
}

export const NAV: readonly NavSection[] = [
  {
    title: "Κοινά",
    items: [{ code: "A1", label: "Σήμερα", href: "/app" }],
  },
  {
    title: "Πελάτες και Πωλήσεις",
    items: [
      {
        code: "B1",
        label: "Πελάτες",
        href: "/app/clients",
        requires: "clients.view",
      },
      {
        code: "B3",
        label: "Pipeline Ευκαιριών",
        href: "/app/pipeline",
        requires: "clients.manage",
      },
      {
        code: "B5",
        label: "Χωρίς υπεύθυνο",
        href: "/app/unassigned",
        requires: "clients.transfer",
      },
      {
        code: "B6",
        label: "Πιθανά διπλά",
        href: "/app/clients/duplicates",
        requires: "clients.merge",
      },
    ],
  },
  {
    title: "Κατάλογος",
    items: [
      {
        code: "C1",
        label: "Κατάλογος",
        href: "/app/catalogue",
        requires: "catalogue.view",
      },
    ],
  },
  {
    title: "Συμφωνίες",
    items: [
      {
        code: "D1",
        label: "Συμφωνίες",
        href: "/app/agreements",
        requires: "agreements.view",
      },
      {
        code: "D4",
        label: "Προτάσεις προς έγκριση",
        href: "/app/agreements/approvals",
        requires: "agreements.deviate",
      },
    ],
  },
  {
    title: "Παραγωγές",
    items: [
      {
        code: "G1",
        label: "Παραγωγές",
        href: "/app/productions",
        requires: ["productions.manage", "c.productions"],
      },
    ],
  },
  {
    title: "Γυρίσματα",
    items: [
      { code: "E1", label: "Γυρίσματα", href: "/app/filming", requires: ["filming.view", "c.book"] },
      { code: "E2", label: "Ουρά έγκρισης", href: "/app/filming/queue", requires: "filming.approve" },
      { code: "E6", label: "Τα Γυρίσματά μου", href: "/app/filming/mine", requires: "filming.view" },
      { code: "E7", label: "Πρότυπα Συνεργείου", href: "/app/filming/crew-templates", requires: "filming.crew" },
    ],
  },
  {
    title: "Εξοπλισμός",
    items: [
      {
        code: "F1",
        label: "Εξοπλισμός",
        href: "/app/equipment",
        requires: "equipment.view",
      },
      {
        code: "F3",
        label: "Πρότυπα εξοπλισμού",
        href: "/app/equipment/templates",
        requires: "equipment.view",
      },
    ],
  },
  {
    title: "Ομάδα και Πρόσβαση",
    items: [
      {
        code: "N1",
        label: "Ομάδα",
        href: "/app/team",
        requires: "access.team",
      },
      {
        code: "N4",
        label: "Ρόλοι και Δικαιώματα",
        href: "/app/team/roles",
        requires: "owner",
      },
    ],
  },
  {
    title: "Ο Πελάτης μου",
    items: [
      { code: "N3", label: "Συνάδελφοι", href: "/app/colleagues", requires: "c.colleagues" },
    ],
  },
  {
    title: "Ρυθμίσεις",
    items: [
      {
        code: "O1",
        label: "Ρυθμίσεις",
        href: "/app/settings/company",
        requires: "settings.manage",
      },
      {
        code: "O2",
        label: "Ρυθμίσεις Πωλήσεων",
        href: "/app/settings/sales",
        requires: "settings.manage",
      },
      {
        code: "O3",
        label: "Ρυθμίσεις Συμφωνιών",
        href: "/app/settings/agreements",
        requires: "settings.manage",
      },
      {
        code: "O6",
        label: "Ρυθμίσεις Οικονομικών",
        href: "/app/settings/finance",
        requires: "finance.cost",
      },
      {
        code: "O7",
        label: "Έλεγχος ετοιμότητας",
        href: "/app/settings/readiness",
        requires: "settings.manage",
      },
      {
        code: "O8",
        label: "Ενσωματώσεις",
        href: "/app/settings/integrations",
        requires: "owner",
      },
    ],
  },
  {
    title: "Σύστημα",
    items: [{ code: "KIT", label: "Kit", href: "/app/kit" }],
  },
];

// Μόνο οι οθόνες που επιτρέπονται, και μόνο οι ενότητες που έχουν κάτι.
const requirementsOf = (requires: string | readonly string[]): readonly string[] =>
  typeof requires === "string" ? [requires] : requires;

export const visibleNav = (
  allows: (requirement: string) => boolean,
): NavSection[] =>
  NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !item.requires || requirementsOf(item.requires).some(allows),
    ),
  })).filter((section) => section.items.length > 0);

// Η τρέχουσα οθόνη: η μεγαλύτερη διαδρομή που ταιριάζει (π.χ. το /app/team/roles/… ανήκει στο N4, όχι στο N1).
export const currentHref = (
  pathname: string,
  sections: readonly NavSection[],
): string | undefined =>
  sections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
