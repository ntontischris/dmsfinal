// Ανάγνωση σε κομμάτια (b1): η βάση δίνει έως 100 Πελάτες ανά κλήση, η λίστα όμως θέλει όλους για να φιλτράρει κάθε στήλη.
// Καθαρές συναρτήσεις με την ανάγνωση ως είσοδο, ώστε να δοκιμάζονται χωρίς βάση.

import type { ReadResult } from "./read";

export const CHUNK = 100;
// Ανώτατο όριο ασφαλείας: 50 κομμάτια = 5.000 Πελάτες.
export const MAX_CHUNKS = 50;

// Διαβάζει σελίδα-σελίδα μέχρι να έρθει μισή σελίδα· αποτυχία οπουδήποτε = αποτυχία όλης.
export async function collectPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<ReadResult<T[]>>,
): Promise<ReadResult<T[]>> {
  const collected: T[] = [];
  for (let chunk = 0; chunk < MAX_CHUNKS; chunk += 1) {
    const page = await fetchPage(chunk * CHUNK, CHUNK);
    if (!page.ok) return page;
    collected.push(...page.data);
    if (page.data.length < CHUNK) break;
  }
  return { ok: true, data: collected };
}

// Ίδια ανάγνωση για πολλά ids, σε κομμάτια των 100, μαζί στο τέλος.
export async function collectChunks<T>(
  ids: readonly string[],
  fetchChunk: (ids: readonly string[]) => Promise<ReadResult<T[]>>,
): Promise<ReadResult<T[]>> {
  const groups = Array.from({ length: Math.ceil(ids.length / CHUNK) }, (_, i) =>
    ids.slice(i * CHUNK, (i + 1) * CHUNK),
  );
  const results = await Promise.all(groups.map(fetchChunk));
  return results.every((result) => result.ok)
    ? {
        ok: true,
        data: results.flatMap((result) => (result.ok ? result.data : [])),
      }
    : { ok: false };
}
