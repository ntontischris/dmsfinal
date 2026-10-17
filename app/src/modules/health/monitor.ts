// Ο εξωτερικός έλεγχος έχει στηθεί; Ο developer γράφει στο Vercel τη διεύθυνση του ελέγχου στο Better Stack
// (HEALTH_MONITOR_URL, https). Δεν είναι μυστικό· ο server ελέγχει μόνο ότι είναι έγκυρη διεύθυνση https.
type Env = Readonly<Record<string, string | undefined>>;

export function monitorUrl(env: Env = process.env): string | null {
  const value = env.HEALTH_MONITOR_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
