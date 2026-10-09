// Το μήνυμα ενός σφάλματος RPC για τον Χρήστη. Οι κανόνες της βάσης (P0001) είναι ήδη γραμμένοι για αυτόν.
export function rpcMessage(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την ενέργεια.";
  console.error(fallback, error.message);
  return fallback;
}
