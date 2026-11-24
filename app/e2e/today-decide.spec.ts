import { expect, test, type Page } from "@playwright/test";

import { inSpacesContext } from "./messages-parts";
import { clientIdByName, project, signIn } from "./sales-parts";
import { clickUntil } from "./today-parts";

// Σήμερα Σβ (#181) στην τελική όψη: η κάρτα «Χωρίς υπεύθυνο» ανήκει στην ομάδα «Περιμένω από εξωτερικούς» της Σήμερα.
// Ο πωλητής κάνει ένα Αίτημα πρόσβασης· ο Ιδιοκτήτης το βλέπει να μετρά στην ομάδα, και ο σύνδεσμος της ουράς
// «Χωρίς υπεύθυνο» τον πάει εκεί, όπου το απορρίπτει (ώστε να μη μείνει τίποτα πίσω). Σειριακά, χωρίς retries· τα δύο projects μοιράζονται
// μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const GROUP_HREF = "/app?g=externals";
const groupCount = (page: Page) =>
  page.locator(`a.money-reel[href="${GROUP_HREF}"] .money-reel-count`);

// Το πλήθος της ομάδας «Περιμένω από εξωτερικούς» στη σειρά καρτών της Σήμερα· 0 αν η ομάδα είναι άδεια (δεν φαίνεται).
async function decisionsCount(page: Page): Promise<number> {
  await page.goto(GROUP_HREF);
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await expect(page.locator("nav.today-deck")).toBeVisible();
  if ((await groupCount(page).count()) === 0) return 0;
  return Number.parseInt((await groupCount(page).textContent()) ?? "0", 10);
}

test("ένα Αίτημα πρόσβασης μετρά στις αποφάσεις της Σήμερα και ο σύνδεσμος πάει στην ουρά «Χωρίς υπεύθυνο»", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const topic = `Σήμερα απόφαση ${P}`;

  await signIn(page, "owner@example.com");
  const before = await decisionsCount(page);

  // Η Πηγή δεν ρωτιέται πια: η βάση δίνει στο αίτημα την Πηγή του Πελάτη.
  await inSpacesContext(browser, "sales@example.com", async (seller) => {
    await seller.goto(
      `/app/clients/${await clientIdByName(`Ταβέρνα Αρμύρα ${P}`)}`,
    );
    const about = seller.getByRole("textbox", { name: "Τι αφορά η Ευκαιρία" });
    await clickUntil(
      seller.getByRole("button", { name: "Αίτημα πρόσβασης", exact: true }),
      about,
    );
    await about.fill(topic);
    await seller.getByRole("button", { name: "Αποστολή αιτήματος" }).click();
    await expect(
      seller.getByText("Το αίτημα στάλθηκε στη Διαχείριση"),
    ).toBeVisible();
  });

  await page.reload();
  await expect(groupCount(page)).toHaveText(String(before + 1));
  await page
    .locator(
      "section.a1-zone[data-zone='externals'] a[href^='/app/unassigned']",
    )
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/unassigned$/);

  const request = page.getByRole("listitem").filter({ hasText: topic });
  await expect(request).toContainText(`Ταβέρνα Αρμύρα ${P}`);
  const comment = request.getByRole("textbox", { name: "Σχόλιο απόρριψης" });
  await clickUntil(
    request.getByRole("button", { name: "Απόρριψη", exact: true }),
    comment,
  );
  await comment.fill("Τον Πελάτη τον έχει ήδη ο Νίκος");
  await request
    .getByRole("button", { name: "Επιβεβαίωση απόρριψης", exact: true })
    .click();
  await expect(request).toHaveCount(0);
});
