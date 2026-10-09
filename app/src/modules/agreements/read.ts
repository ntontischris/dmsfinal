// Ίδιο μοτίβο ανάγνωσης με τα άλλα modules (δικό μας αντίγραφο: τα modules δεν εισάγουν εσωτερικά το ένα το άλλο). Το σφάλμα της βάσης καταγράφεται, ο χρήστης βλέπει «δεν φόρτωσε».

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
