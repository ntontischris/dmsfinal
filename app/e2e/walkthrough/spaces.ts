import type { BrowserContext } from "@playwright/test";

// Οι διαδρομές της Περιήγησης ρόλου τρέχουν στη νέα εμφάνιση (Χώροι)· τα υπόλοιπα e2e μένουν στην παλιά.
export async function useSpacesLook(context: BrowserContext): Promise<void> {
  await context.addCookies([
    { name: "dms-look", value: "spaces", url: "http://localhost:3000" },
  ]);
}
