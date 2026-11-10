import type { Browser, Page } from "@playwright/test";

import { signIn } from "./sales-parts";
// Μετονομασία: δεν είναι React hook, απλώς βάζει το cookie της εμφάνισης.
import { useSpacesLook as addSpacesCookie } from "./walkthrough/spaces";

// Ένας άλλος Χρήστης σε δικό του browser context, στη νέα εμφάνιση (Χώροι)· κλείνει πάντα όταν τελειώσει το βήμα.
export async function inSpacesContext(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await addSpacesCookie(context);
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Αλλαγή Χρήστη στην ίδια σελίδα: σβήνει τη συνεδρία (cookies), ξαναβάζει τη νέα εμφάνιση και μπαίνει ως ο άλλος.
// Χωρίς το μενού προφίλ, ώστε το βήμα να μην εξαρτάται από το πού ζει η «Έξοδος».
export async function switchUserInSpaces(
  page: Page,
  email: string,
): Promise<void> {
  await page.context().clearCookies();
  await addSpacesCookie(page.context());
  await signIn(page, email);
}
