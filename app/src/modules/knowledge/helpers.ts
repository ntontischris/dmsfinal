import type { Audience, ItemKind, ItemStatus } from "./view-schema";

// Βοηθητικά της Γνώσης: διαδρομές, φίλτρα, Κοινό, έλεγχος δημοσίευσης. Ο ίδιος κανόνας ζει στη βάση· εδώ για άμεση ένδειξη.

export const KNOWLEDGE_PATH = "/app/knowledge";
export const MANAGE_PATH = "/app/knowledge/manage";

export const itemHref = (id: string): string => `${KNOWLEDGE_PATH}/${id}`;
export const editHref = (id: string): string => `${MANAGE_PATH}/${id}`;
export const fileHref = (id: string): string => `${KNOWLEDGE_PATH}/${id}/file`;

export type ManageTab = "items" | "sections";

export const parseManageTab = (value: string | undefined): ManageTab =>
  value === "sections" ? "sections" : "items";

export const parseStatusFilter = (
  value: string | undefined,
): ItemStatus | null =>
  value === "draft" || value === "published" ? value : null;

export const parseQuery = (value: string | undefined): string =>
  (value ?? "").trim().slice(0, 200);

export interface PublishCheck {
  kind: ItemKind;
  summary: string;
  body: string | null;
  hasFile: boolean;
  audience: Audience;
}

// Τι λείπει για να δημοσιευτεί ένα πρόχειρο (ίδια σειρά με το knowledge_item_publish).
export const publishBlockers = (item: PublishCheck): string[] => [
  ...(item.summary.trim() === "" ? ["Λείπει η Περίληψη."] : []),
  ...(!item.audience.isPublic && item.audience.roles.length === 0
    ? ["Λείπει το Κοινό."]
    : []),
  ...(item.kind === "article" && (item.body ?? "").trim() === ""
    ? ["Λείπει το κείμενο του Άρθρου."]
    : []),
  ...(item.kind === "file" && !item.hasFile ? ["Λείπει το Αρχείο."] : []),
];

// Το Κοινό σε μία γραμμή: «δημόσιο», ή τα ονόματα των Ρόλων, ή «—».
export const audienceText = (audience: Audience): string => {
  const parts = [
    ...(audience.isPublic ? ["δημόσιο"] : []),
    ...audience.roles.map((role) =>
      role.kind === "client" ? `${role.name} (πελάτη)` : role.name,
    ),
  ];
  return parts.length > 0 ? parts.join(", ") : "—";
};

export interface AudienceInput {
  roles: string[];
  isPublic: boolean;
}

// Το Κοινό από τη φόρμα: τα τσεκαρισμένα `roles` (χωρίς διπλά) και το «δημόσιο».
export const audienceFromForm = (form: FormData): AudienceInput => ({
  roles: [
    ...new Set(
      form
        .getAll("roles")
        .map(String)
        .filter((id) => id !== ""),
    ),
  ],
  isPublic: form.get("isPublic") === "on",
});

const DATE_FORMAT = new Intl.DateTimeFormat("el-GR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Athens",
});

export const formatDate = (iso: string): string =>
  DATE_FORMAT.format(new Date(iso));
