// Η διεύθυνση της εφαρμογής για συνδέσμους στα email, για το σκούντημα της ουράς και για το λογότυπο.
// Όχι από το αίτημα: πίσω από proxies το αίτημα δεν λέει πάντα τη σωστή διεύθυνση.
// Σειρά: APP_ORIGIN (αν οριστεί)· production του Vercel· η διεύθυνση του deployment· τοπικά localhost.
export function appOriginFrom(env: Readonly<Record<string, string | undefined>>): string {
  if (env.APP_ORIGIN) return env.APP_ORIGIN.replace(/\/$/, "");
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const appOrigin = (): string => appOriginFrom(process.env);
