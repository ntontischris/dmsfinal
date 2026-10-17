import { aiConfiguredFrom } from "@/lib/ai/available";
import { isGoogleConfigured } from "@/lib/google/config";

import type { ConfiguredMap } from "./connections";

// Ποιες συνδέσεις έχουν στηθεί: ο server ελέγχει ΜΟΝΟ αν υπάρχει η μεταβλητή περιβάλλοντος, ποτέ δεν επιστρέφει την τιμή.
type Env = Readonly<Record<string, string | undefined>>;

// Σημείο ελέγχου για τα e2e (το CI δεν έχει κλειδιά): με INTEGRATIONS_FAKE_PROVIDERS=1 οι τρεις συνδέσεις μετρούν ως
// στημένες και το «Έλεγχος τώρα» απαντά χωρίς δίκτυο. Δεν ισχύει ποτέ στην παραγωγή του Vercel.
export const usesFakeProviders = (env: Env = process.env): boolean =>
  env.INTEGRATIONS_FAKE_PROVIDERS === "1" && env.VERCEL_ENV !== "production";

export function configuredFrom(env: Env = process.env): ConfiguredMap {
  if (usesFakeProviders(env)) return { google: true, email: true, ai: true };
  return {
    google: isGoogleConfigured(env),
    email: Boolean(env.RESEND_API_KEY),
    ai: aiConfiguredFrom(env, "chat") && aiConfiguredFrom(env, "embedding"),
  };
}
