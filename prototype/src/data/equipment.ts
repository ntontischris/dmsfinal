// Φανταστικά δεδομένα του module «5 Εξοπλισμός»: μητρώο αντικειμένων, Κατηγορίες, Πρότυπα εξοπλισμού.
// Τα Γυρίσματα (filming.ts) δεσμεύουν αντικείμενα με το id τους. Πηγή: κεφ. 3.4, «Εξοπλισμός: μητρώο, Δέσμευση, Πρότυπα».

export type EquipmentStatus = "διαθέσιμο" | "σε επισκευή" | "αποσυρμένο";

export const EQUIPMENT_STATUSES: readonly EquipmentStatus[] = [
  "διαθέσιμο",
  "σε επισκευή",
  "αποσυρμένο",
];

// Λίστα που αλλάζει όποιος «Διαχειρίζεται απόθεμα». Τιμή που χρησιμοποιήθηκε δεν σβήνεται, αποσύρεται.
export interface EquipmentCategory {
  id: string;
  name: string;
  isRetired: boolean;
}

export const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  { id: "cat-camera", name: "Κάμερες", isRetired: false },
  { id: "cat-lens", name: "Φακοί", isRetired: false },
  { id: "cat-light", name: "Φωτισμός", isRetired: false },
  { id: "cat-sound", name: "Ήχος", isRetired: false },
  { id: "cat-support", name: "Στήριξη και σταθεροποίηση", isRetired: false },
  { id: "cat-drone", name: "Drone", isRetired: false },
];

export interface EquipmentEvent {
  when: string;
  by: string;
  text: string;
}

// Ένα αντικείμενο = ό,τι δεσμεύεται ολόκληρο. Ένα σετ (π.χ. δύο ασύρματα) είναι ένα αντικείμενο.
export interface EquipmentItem {
  id: string;
  name: string;
  categoryId: string;
  code?: string;
  note?: string;
  status: EquipmentStatus;
  statusNote?: string;
  history: readonly EquipmentEvent[];
}

const added = (when: string): EquipmentEvent => ({
  when,
  by: "Γιώργος Μαυρίδης",
  text: "Προστέθηκε στο μητρώο.",
});

export const EQUIPMENT: readonly EquipmentItem[] = [
  {
    id: "eq-cam-a",
    name: "Κάμερα A (full frame)",
    categoryId: "cat-camera",
    code: "CAM-01",
    note: "Δύο μπαταρίες και δύο κάρτες στη θήκη.",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-cam-b",
    name: "Κάμερα B (compact)",
    categoryId: "cat-camera",
    code: "CAM-02",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-cam-old",
    name: "Παλιά κάμερα (APS-C)",
    categoryId: "cat-camera",
    code: "CAM-00",
    status: "αποσυρμένο",
    statusNote: "Πουλήθηκε",
    history: [
      added("2025-03-01"),
      {
        when: "2026-02-10",
        by: "Γιώργος Μαυρίδης",
        text: "Αποσύρθηκε: Πουλήθηκε.",
      },
    ],
  },
  {
    id: "eq-lens-2470",
    name: "Φακός 24–70",
    categoryId: "cat-lens",
    code: "LEN-01",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-lens-50",
    name: "Φακός 50mm f/1.8",
    categoryId: "cat-lens",
    code: "LEN-02",
    status: "διαθέσιμο",
    history: [added("2026-04-02")],
  },
  {
    id: "eq-led-kit",
    name: "Κιτ φωτισμού LED (3 φώτα)",
    categoryId: "cat-light",
    code: "LGT-01",
    note: "Με τα τρία stand και τα softbox.",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-mics",
    name: "Ασύρματα μικρόφωνα (2)",
    categoryId: "cat-sound",
    code: "SND-01",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-shotgun",
    name: "Μικρόφωνο shotgun",
    categoryId: "cat-sound",
    code: "SND-02",
    status: "διαθέσιμο",
    history: [added("2026-05-20")],
  },
  {
    id: "eq-gimbal",
    name: "Gimbal",
    categoryId: "cat-support",
    code: "SUP-01",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-tripod",
    name: "Τρίποδο βίντεο",
    categoryId: "cat-support",
    code: "SUP-02",
    status: "διαθέσιμο",
    history: [added("2026-01-12")],
  },
  {
    id: "eq-drone",
    name: "Drone",
    categoryId: "cat-drone",
    code: "DRN-01",
    status: "σε επισκευή",
    statusNote: "Σπασμένη έλικα, επιστρέφει γύρω στις 25/9",
    history: [
      added("2026-02-01"),
      {
        when: "2026-09-16",
        by: "Δημήτρης Ιωάννου",
        text: "Σε επισκευή: Σπασμένη έλικα, επιστρέφει γύρω στις 25/9.",
      },
    ],
  },
];

export const findEquipment = (
  id: string | undefined,
): EquipmentItem | undefined => EQUIPMENT.find((item) => item.id === id);

export const equipmentName = (id: string): string =>
  findEquipment(id)?.name ?? "—";

export const categoryName = (id: string): string =>
  EQUIPMENT_CATEGORIES.find((category) => category.id === id)?.name ?? "—";

// Μόνο τα διαθέσιμα προσφέρονται για νέα Δέσμευση.
export const isReservable = (id: string): boolean =>
  findEquipment(id)?.status === "διαθέσιμο";

export interface EquipmentTemplate {
  id: string;
  name: string;
  itemIds: readonly string[];
  note: string;
  uses: number;
}

export const EQUIPMENT_TEMPLATES: readonly EquipmentTemplate[] = [
  {
    id: "et-social",
    name: "Social: ελαφρύ",
    itemIds: ["eq-cam-b", "eq-gimbal", "eq-mics"],
    note: "Για μηνιαία social σε χώρο πελάτη.",
    uses: 11,
  },
  {
    id: "et-podcast",
    name: "Podcast: δύο κάμερες",
    itemIds: [
      "eq-cam-a",
      "eq-cam-b",
      "eq-lens-2470",
      "eq-led-kit",
      "eq-shotgun",
      "eq-tripod",
    ],
    note: "Στατικό στήσιμο, δύο γωνίες.",
    uses: 4,
  },
  {
    id: "et-aerial",
    name: "Εξωτερικό με drone",
    itemIds: ["eq-drone", "eq-cam-b", "eq-gimbal"],
    note: "Ακίνητα και εκδηλώσεις σε ανοιχτό χώρο.",
    uses: 2,
  },
];
