// Στοιχεία του λογαριασμού υπηρεσίας Google (ADR 0016, τροποποίηση 2026-10-11): μόνο από το περιβάλλον του Vercel.
// Χωρίς αυτά, όλη η ενσωμάτωση είναι no-op και δεν γίνεται καμία κλήση στο Google.

export interface GoogleConfig {
  email: string;
  privateKey: string;
}

type Env = Readonly<Record<string, string | undefined>>;

// Το κλειδί έρχεται από το Vercel με «\n» ως κείμενο· εδώ γίνεται αληθινή αλλαγή γραμμής.
export function readGoogleConfig(env: Env = process.env): GoogleConfig | null {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) return null;
  return { email, privateKey: key.replace(/\\n/g, "\n") };
}

export const isGoogleConfigured = (env: Env = process.env): boolean =>
  readGoogleConfig(env) !== null;
