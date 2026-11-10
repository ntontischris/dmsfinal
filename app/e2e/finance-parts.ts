import { expect, type Locator, type Page } from "@playwright/test";

import { signIn } from "./sales-parts";
// Με άλλο όνομα: δεν είναι React hook (ο κανόνας των hooks κοιτά μόνο το όνομα).
import { useSpacesLook as addSpacesCookie } from "./walkthrough/spaces";

// Κοινά βήματα των e2e των Οικονομικών και των Αναφορών στη νέα εμφάνιση (Χώροι).

// Ένας Χώρος στην πλοήγηση (πάνω στο desktop, κάτω στο κινητό· φαίνεται μόνο η μία).
export const spaceLink = (page: Page, space: string): Locator =>
  page
    .getByRole("navigation", { name: "Χώροι" })
    .getByRole("link", { name: space, exact: true });

// Μια καρτέλα του Χώρου, στην κεφαλίδα της οθόνης.
export const tabLink = (page: Page, space: string, tab: string): Locator =>
  page
    .getByRole("navigation", { name: space, exact: true })
    .getByRole("link", { name: tab, exact: true });

// Ανοίγει τον Χώρο από την πλοήγηση και μετά την καρτέλα του, όπως ο Χρήστης.
export async function openTab(
  page: Page,
  space: string,
  tab: string,
): Promise<void> {
  await spaceLink(page, space).click();
  await tabLink(page, space, tab).click();
  await expect(tabLink(page, space, tab)).toHaveAttribute(
    "aria-current",
    "page",
  );
}

// Μια κάρτα φίλτρου («Κατάσταση», «Περίοδος», «Πελάτης»…) της σειράς φίλτρων.
export const filterCard = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator("details.kit-fb-card")
    .filter({ has: scope.locator(`.kit-fb-label:text-is("${label}")`) });

// Ανοίγει την κάρτα και διαλέγει την επιλογή που αρχίζει με το κείμενο (με αναζήτηση, όταν η κάρτα την έχει).
export async function pickFilter(
  scope: Page | Locator,
  label: string,
  option: string,
): Promise<void> {
  const card = filterCard(scope, label);
  await card.locator("summary").click();
  const search = card.getByRole("searchbox");
  if ((await search.count()) > 0) await search.fill(option);
  await card
    .locator("a.kit-fb-opt")
    .filter({
      has: scope.locator(".kit-fb-name", { hasText: startsWith(option) }),
    })
    .first()
    .click();
}

// Κείμενο που αρχίζει με αυτό (π.χ. «Αυτός ο μήνας» για «Αυτός ο μήνας (01/11–30/11/2026) · ως σήμερα»).
export const startsWith = (text: string): RegExp =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

// Έξοδος από το μενού προφίλ και είσοδος ως άλλος Χρήστης, στην ίδια εμφάνιση.
export async function switchUserInSpaces(
  page: Page,
  email: string,
): Promise<void> {
  await page.getByRole("button", { name: /^Προφίλ:/ }).click();
  await page.getByRole("button", { name: "Έξοδος", exact: true }).click();
  await page.waitForURL(/\/login/);
  await addSpacesCookie(page.context());
  await signIn(page, email);
}
