// Οι 7 όψεις της εναλλαγής ρόλου. Οι έξι πρώτοι είναι οι έτοιμοι Ρόλοι (ADR 0001),
// ο Επισκέπτης είναι όποιος δεν έχει λογαριασμό.

export const ROLE_IDS = [
  "owner",
  "admin",
  "production",
  "sales",
  "accountant",
  "client",
  "visitor",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export interface Role {
  id: RoleId;
  label: string;
  short: string;
  isTeam: boolean;
}

export const ROLES: readonly Role[] = [
  { id: "owner", label: "Ιδιοκτήτης", short: "Ιδ", isTeam: true },
  { id: "admin", label: "Διαχείριση", short: "Δι", isTeam: true },
  { id: "production", label: "Παραγωγή", short: "Πα", isTeam: true },
  { id: "sales", label: "Πωλήσεις", short: "Πω", isTeam: true },
  { id: "accountant", label: "Λογιστής", short: "Λο", isTeam: true },
  { id: "client", label: "Πλήρης (πελάτη)", short: "Πλ", isTeam: false },
  { id: "visitor", label: "Επισκέπτης", short: "Επ", isTeam: false },
];

export const isRoleId = (value: string): value is RoleId =>
  (ROLE_IDS as readonly string[]).includes(value);

export const findRole = (id: RoleId): Role =>
  ROLES.find((role) => role.id === id) ?? ROLES[0];
