// Το ύφος ενός Είδους κλεισμένου χρόνου (σχέδιο «3B»): χρώμα από μικρή σταθερή παλέτα του σχεδίου και σύντομο εικονίδιο.
// Ίδια λίστα με το authz.is_blocked_kind_color (20261104150000_blocked_time_kind_style.sql). Οι αποχρώσεις ζουν στα
// tokens της νέας εμφάνισης (src/spaces/styles/brand.css, --kind-<κλειδί>), για σκοτεινό και φωτεινό θέμα.

export const KIND_COLORS = [
  "teal",
  "green",
  "amber",
  "violet",
  "grey",
  "blue",
  "pink",
  "red",
] as const;
export type KindColor = (typeof KIND_COLORS)[number];

export const DEFAULT_KIND_COLOR: KindColor = "grey";
export const KIND_ICON_LIMIT = 4;

// Τα εικονίδια που διαλέγει κανείς με ένα πάτημα στις Ρυθμίσεις. Ένα δικό σου (έως 4 χαρακτήρες) γράφεται στο «Δικό σου».
export const KIND_ICONS = [
  "🌙", "🏖", "🤝", "📞", "•", "🎬", "📷", "🎤", "✈", "🚗",
  "🏥", "🎓", "🏠", "☕", "💼", "📅", "⭐", "🔧", "🎉", "📦",
] as const;

export const KIND_COLOR_LABELS: Readonly<Record<KindColor, string>> = {
  teal: "Τιρκουάζ",
  green: "Πράσινο",
  amber: "Κεχριμπάρι",
  violet: "Μωβ",
  grey: "Γκρι",
  blue: "Μπλε",
  pink: "Ροζ",
  red: "Κόκκινο",
};

export const isKindColor = (value: unknown): value is KindColor =>
  typeof value === "string" &&
  (KIND_COLORS as readonly string[]).includes(value);

// Το χρώμα που φτάνει στην οθόνη: μόνο κλειδί της παλέτας, αλλιώς κανένα (ουδέτερο ύφος).
export const kindToneOf = (
  value: string | null | undefined,
): KindColor | null => (isKindColor(value) ? value : null);
