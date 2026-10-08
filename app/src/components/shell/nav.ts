// Η πλοήγηση της εφαρμογής: ενότητες με τα modules τους. Κάθε module προσθέτει εδώ τις οθόνες του όταν χτιστεί.
// Ο κωδικός είναι αυτός του Blueprint (κεφ. 8), για να αντιστοιχίζεται με το prototype.
// `requires`: ένα Δικαίωμα, ή «owner» για ό,τι κάνει μόνο ο Ιδιοκτήτης. Όποιος δεν το έχει, δεν βλέπει την οθόνη στη λίστα.

export interface NavItem {
  code: string;
  label: string;
  href: string;
  requires?: string;
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
        code: "O7",
        label: "Έλεγχος ετοιμότητας",
        href: "/app/settings/readiness",
        requires: "settings.manage",
      },
    ],
  },
  {
    title: "Σύστημα",
    items: [{ code: "KIT", label: "Kit", href: "/app/kit" }],
  },
];

// Μόνο οι οθόνες που επιτρέπονται, και μόνο οι ενότητες που έχουν κάτι.
export const visibleNav = (
  allows: (requirement: string) => boolean,
): NavSection[] =>
  NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.requires || allows(item.requires),
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
