import { GoogleApiError } from "./client";

const TIMEOUT_NAMES = new Set(["TimeoutError", "AbortError"]);

// Μήνυμα για τη βάση και τα logs: μόνο κωδικός ή είδος σφάλματος, ποτέ URL, id ή token.
export function describeError(error: unknown): string {
  if (error instanceof GoogleApiError) return `Google ${error.status}`;
  if (error instanceof Error && TIMEOUT_NAMES.has(error.name)) return "Google: λήξη χρόνου";
  return "Google: σφάλμα δικτύου ή σχήματος";
}
