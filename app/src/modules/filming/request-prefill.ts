import { z } from "zod";

// Το «Κλείσιμο Γυρίσματος από το Αίτημα» (Μηνύματα, Μ11): ο σύνδεσμος φέρνει το Μήνυμα του Αιτήματος και τον Πελάτη του.
// Ό,τι δεν είναι σωστό δεν προσυμπληρώνει τίποτα (η φόρμα ανοίγει κανονικά, χωρίς Αίτημα).

export interface FilmingFromRequest {
  messageId: string;
  clientId: string | null;
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parseFromRequest(
  query: Readonly<Record<string, string | string[] | undefined>>,
): FilmingFromRequest | null {
  const message = z.uuid().safeParse(first(query.fromRequest));
  if (!message.success) return null;
  const client = z.uuid().safeParse(first(query.client));
  return { messageId: message.data, clientId: client.success ? client.data : null };
}
