// PROTOTYPE — throwaway, branch prototype/clients-three-levels.
// Πέντε παραλλαγές (A–E) των οθονών Πελατών στο πρότυπο των τριών επιπέδων: «Μπροστά σου», «Ένα κλικ»,
// «Όταν το ψάξεις». Ανοίγουν με ?variant=A..E· χωρίς αυτό η σημερινή οθόνη μένει ίδια.

export const VARIANTS = [
  { id: "A", label: "Ουρά" },
  { id: "B", label: "Πλακίδια" },
  { id: "C", label: "Αναζήτηση πρώτα" },
  { id: "D", label: "Λωρίδες" },
  { id: "E", label: "Ερωτήσεις" },
] as const;

export type Variant = (typeof VARIANTS)[number]["id"];

export const parseVariant = (value: unknown): Variant | null =>
  VARIANTS.find((v) => v.id === value)?.id ?? null;

// Κάθε σύνδεσμος της παραλλαγής κρατά το ?variant=, ώστε λίστα και Σελίδα Πελάτη να μένουν στην ίδια.
export const withVariant = (
  href: string,
  variant: Variant,
  extra: Readonly<Record<string, string | undefined>> = {},
): string => {
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("variant", variant);
  Object.entries(extra).forEach(([key, value]) =>
    value === undefined ? params.delete(key) : params.set(key, value),
  );
  return `${path}?${params.toString()}`;
};

// Ό,τι φέρνει η διεύθυνση στις δύο οθόνες (ακατέργαστο, το διαβάζει η οθόνη).
export interface PrototypeParams {
  variant?: string;
  pick?: string;
  isAll?: boolean;
  // Ο διακόπτης φαίνεται εκτός production (VERCEL_ENV), από τη σελίδα.
  showSwitcher: boolean;
}
