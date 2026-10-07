// Η λογική των Δικαιωμάτων για την οθόνη (κεφ. 1). Ίδια με της βάσης (authz.can_grant_role), ώστε η οθόνη
// να δείχνει κλειδωμένο ό,τι η βάση θα αρνηθεί. Η απόφαση μένει στη βάση.

export type Scope = "all" | "mine";
export type Grants = Readonly<Record<string, Scope>>;

export const isScope = (value: unknown): value is Scope => value === "all" || value === "mine";

// Το Εύρος μου καλύπτει αυτό που χρειάζεται; «Όλα» καλύπτει τα πάντα, «με αφορά» μόνο «με αφορά».
export const covers = (mine: Scope | undefined, needed: Scope): boolean =>
  mine === "all" || (mine === "mine" && needed === "mine");

// Τα Δικαιώματα ενός Ρόλου που δεν καλύπτω: όσο υπάρχει έστω ένα, δεν μπορώ να δώσω τον Ρόλο.
export const missingFor = (role: Grants, mine: Grants): string[] =>
  Object.entries(role)
    .filter(([permission, needed]) => !covers(mine[permission], needed))
    .map(([permission]) => permission);

export interface GrantChange {
  permission: string;
  before: Scope | null;
  after: Scope | null;
}

// Τι αλλάζει ανάμεσα σε δύο εκδοχές ενός Ρόλου: για την προεπισκόπηση και για την αποθήκευση.
export const diffGrants = (before: Grants, after: Grants): GrantChange[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((permission) => before[permission] !== after[permission])
    .map((permission) => ({ permission, before: before[permission] ?? null, after: after[permission] ?? null }));

export interface LockInput {
  role: { isOwner: boolean; grants: Grants };
  viewer: { isOwner: boolean; grants: Grants };
  isTargetOwner: boolean;
  labelOf: (permission: string) => string;
}

// Γιατί δεν μπορείς να δώσεις ή να αφαιρέσεις αυτόν τον Ρόλο (null = μπορείς). Ίδιοι κανόνες με τη βάση.
export const lockReason = ({ role, viewer, isTargetOwner, labelOf }: LockInput): string | null => {
  if (viewer.isOwner) return null;
  if (role.isOwner) return "τον Ρόλο Ιδιοκτήτης τον δίνει μόνο Ιδιοκτήτης";
  if (isTargetOwner) return "τους Ρόλους ενός Ιδιοκτήτη τους αλλάζει μόνο Ιδιοκτήτης";
  const missing = missingFor(role.grants, viewer.grants);
  if (missing.length === 0) return null;
  const names = missing.slice(0, 2).map((permission) => `«${labelOf(permission)}»`).join(", ");
  return `σου λείπει ${names}${missing.length > 2 ? ` και ${missing.length - 2} ακόμα` : ""}`;
};
