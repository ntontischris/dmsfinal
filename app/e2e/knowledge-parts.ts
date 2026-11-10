import type { Locator, Page } from "@playwright/test";

import { signIn } from "./sales-parts";
// Όχι React hook: απλώς βάζει το cookie της εμφάνισης (το όνομα «use…» μπερδεύει τον κανόνα των hooks).
import { useSpacesLook as addSpacesCookie } from "./walkthrough/spaces";

// Βοηθητικά των e2e Γνώσης, Βοηθού και Ειδοποιήσεων στη νέα εμφάνιση (Χώροι).

// Αλλαγή Χρήστη: η «Έξοδος» ζει κρυμμένη στο μενού προφίλ, γι' αυτό σβήνουμε τη συνεδρία (cookies) και ξαναμπαίνουμε.
// Το cookie της εμφάνισης ξαναμπαίνει, ώστε ο νέος Χρήστης να βλέπει πάλι τους Χώρους.
export async function switchUser(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await addSpacesCookie(page.context());
  await signIn(page, email);
}

// Ένα πάνελ του kit (κεφαλίδα-ετικέτα h2) με τον τίτλο του.
export const panel = (page: Page, title: string): Locator =>
  page.locator(".kit-panel").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });

// Η φόρμα που περιέχει ένα πεδίο με αυτή την ετικέτα.
export const formWith = (page: Page, label: string | RegExp): Locator =>
  page.locator("form", { has: page.getByLabel(label) });
