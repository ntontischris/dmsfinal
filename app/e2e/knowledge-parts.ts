import { expect, type Locator, type Page } from "@playwright/test";

import { signIn } from "./sales-parts";

// Βοηθητικά των e2e Γνώσης, Βοηθού και Ειδοποιήσεων στη νέα εμφάνιση (Χώροι).

// Αλλαγή Χρήστη: η «Έξοδος» ζει κρυμμένη στο μενού προφίλ, γι' αυτό σβήνουμε τη συνεδρία (cookies) και ξαναμπαίνουμε.
export async function switchUser(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await signIn(page, email);
}

// Ένα κουτί (section με h2) με τον τίτλο του.
export const panel = (page: Page, title: string): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });

// Ανοίγει ένα κλειστό κουτί (details.ml-box) και το επιστρέφει.
export async function openBox(page: Page, title: string): Promise<Locator> {
  const box = panel(page, title);
  const details = box.locator("details.ml-box").first();
  await expect(async () => {
    if ((await details.getAttribute("open")) === null)
      await details.locator("> summary").click();
    await expect(details).toHaveAttribute("open", "", { timeout: 1_000 });
  }).toPass();
  return box;
}

// Η φόρμα που περιέχει ένα πεδίο με αυτή την ετικέτα.
export const formWith = (page: Page, label: string | RegExp): Locator =>
  page.locator("form", { has: page.getByLabel(label) });
