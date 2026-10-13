// Είναι διαθέσιμο το AI; Σήμερα: υπάρχει περιβάλλον Gateway (στο Vercel το OIDC δίνεται αυτόματα· τοπικά με
// «vercel env pull» ή AI_GATEWAY_API_KEY). Τοπικά και στο CI όχι: η ουρά μένει «σε αναμονή» και η αναζήτηση πέφτει σε full-text.
// Το Lγ θα το επεκτείνει με το πλαφόν (στο 100% όχι AI).
export function aiAvailableFrom(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return Boolean(
    env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.VERCEL === "1",
  );
}

export const aiAvailable = (): boolean => aiAvailableFrom(process.env);
