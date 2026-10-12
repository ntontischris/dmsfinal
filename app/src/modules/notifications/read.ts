// Ίδιο μοτίβο ανάγνωσης με τα άλλα modules: το σφάλμα της βάσης καταγράφεται, ο χρήστης βλέπει «δεν φόρτωσε».

export type ReadResult<T> = { ok: true; data: T } | { ok: false };

export async function read<T>(
  label: string,
  query: PromiseLike<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>,
  parse: (data: unknown) => T,
): Promise<ReadResult<T | null>> {
  const { data, error } = await query;
  // 42501: ο θεατής δεν έχει Ειδοποιήσεις (ούτε ομάδα ούτε Πελάτης)· δεν είναι σφάλμα.
  if (error?.code === "42501") return { ok: true, data: null };
  if (error) {
    console.error(`${label}:`, error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(data) };
}
