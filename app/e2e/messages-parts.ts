import type { Browser, Page } from "@playwright/test";

import { signIn } from "./sales-parts";

// Ένας άλλος Χρήστης σε δικό του browser context, στη νέα εμφάνιση (Χώροι)· κλείνει πάντα όταν τελειώσει το βήμα.
export async function inSpacesContext(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Αλλαγή Χρήστη στην ίδια σελίδα: σβήνει τη συνεδρία (cookies) και μπαίνει ως ο άλλος.
// Χωρίς το μενού προφίλ, ώστε το βήμα να μην εξαρτάται από το πού ζει η «Έξοδος».
export async function switchUserInSpaces(
  page: Page,
  email: string,
): Promise<void> {
  await page.context().clearCookies();
  await signIn(page, email);
}
