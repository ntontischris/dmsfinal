import { expect, test, type Page } from "@playwright/test";

import { project, signIn } from "./sales-parts";

// Σήμερα (A1, #180) από άκρη σε άκρη. Ο Ιδιοκτήτης και ο Χρήστης πελάτη «client.{project}@example.com» (Πλήρης) έρχονται
// από το seed. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση (και τις Προτιμήσεις του Ιδιοκτήτη).
test.describe.configure({ mode: "serial", retries: 0 });

const HEALTH = "Υγεία συστήματος";

const healthCard = (page: Page) =>
  page.getByRole("heading", { level: 2, name: HEALTH, exact: true });

const customizePanel = (page: Page) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: "Προσαρμογή της «Σήμερα»" }),
  });

async function openCustomize(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Προσαρμογή", exact: true }).click();
  await expect(customizePanel(page)).toBeVisible();
}

// Ό,τι άφησε ένα προηγούμενο τρέξιμο: πίσω στην προεπιλογή.
async function startFromDefault(page: Page): Promise<void> {
  await openCustomize(page);
  const reset = page.getByRole("button", { name: "Επαναφορά προεπιλογής" });
  if (await reset.isVisible()) {
    await reset.click();
    await expect(customizePanel(page)).toHaveCount(0);
  } else {
    await page.getByRole("link", { name: "Κλείσιμο" }).click();
  }
  await expect(page).toHaveURL(/\/app$/);
}

test("ο Ιδιοκτήτης βλέπει την Υγεία, την κρύβει, μένει κρυμμένη μετά από ανανέωση και η Επαναφορά τη φέρνει πίσω", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await expect(page.getByRole("heading", { level: 1, name: "Σήμερα" })).toBeVisible();
  await startFromDefault(page);
  await expect(healthCard(page)).toBeVisible();

  await openCustomize(page);
  await customizePanel(page).getByRole("button", { name: `Κρύψε: ${HEALTH}` }).click();
  await customizePanel(page).getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(customizePanel(page)).toHaveCount(0);
  await expect(healthCard(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Σήμερα" })).toBeVisible();
  await expect(healthCard(page)).toHaveCount(0);

  await openCustomize(page);
  await expect(customizePanel(page).getByRole("button", { name: `Εμφάνισε: ${HEALTH}` })).toBeVisible();
  await customizePanel(page).getByRole("button", { name: "Επαναφορά προεπιλογής" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(healthCard(page)).toBeVisible();
});

test("ο Χρήστης πελάτη ανοίγει τη Σήμερα χωρίς Υγεία", async ({ page }) => {
  await signIn(page, `client.${project()}@example.com`);
  await expect(page.getByRole("heading", { level: 1, name: "Σήμερα" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Όλα καθαρά" })).toBeVisible();
  await expect(healthCard(page)).toHaveCount(0);
});
