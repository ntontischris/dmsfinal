// Η πλοήγηση της εφαρμογής: ενότητες με τα modules τους. Κάθε module προσθέτει εδώ τις οθόνες του όταν χτιστεί.
// Ο κωδικός είναι αυτός του Blueprint (κεφ. 8), για να αντιστοιχίζεται με το prototype.

export interface NavItem {
  code: string;
  label: string;
  href: string;
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
    title: "Σύστημα",
    items: [{ code: "KIT", label: "Kit", href: "/app/kit" }],
  },
];
