// Ίδιο μοτίβο ανάγνωσης με τα άλλα modules: το σφάλμα της βάσης καταγράφεται, ο χρήστης βλέπει «δεν φόρτωσε».

export type ReadResult<T> = { ok: true; data: T } | { ok: false };

export async function read<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  parse: (data: unknown) => T,
): Promise<ReadResult<T>> {
  const { data, error } = await query;
  if (error) {
    console.error(`${label}:`, error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(data) };
}

// Η βάση απαντά «δεν βρέθηκε» (P0001) ή «χωρίς Δικαίωμα» (42501) για άλλου id: και τα δύο είναι η ίδια οθόνη.
const NOT_FOUND_CODES = new Set(["42501", "P0001"]);

export const missingWhenNotFound = async (
  query: PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
): Promise<{ data: unknown; error: { message: string } | null }> => {
  const { data, error } = await query;
  if (error && NOT_FOUND_CODES.has(error.code ?? "")) return { data: null, error: null };
  return { data, error };
};
