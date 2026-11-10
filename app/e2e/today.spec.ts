import { expect, test, type Page } from "@playwright/test";

import { project, signIn } from "./sales-parts";
import { clickUntil } from "./today-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Σήμερα (A1, #180) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Ο Ιδιοκτήτης και ο Χρήστης πελάτη
// «client.{project}@example.com» (Πλήρης) έρχονται από το seed. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία
// βάση (και τις Προτιμήσεις του Ιδιοκτήτη).
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const HEALTH = "Υγεία συστήματος";

// Η Υγεία φαίνεται πάνω ως κάρτα όταν κάτι χάλασε, αλλιώς ως ήσυχη γραμμή μέσα στο «Και άλλα». Πάντα σε ένα από τα δύο.
const health = (page: Page) =>
  page
    .getByRole("heading", { level: 2, name: HEALTH, exact: true })
    .or(
      page
        .locator("details.a1-others")
        .getByRole("link", { name: HEALTH, exact: true }),
    );

const todayHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Σήμερα" });

const customizePanel = (page: Page) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: "Προσαρμογή της «Σήμερα»" }),
  });

const healthRow = (page: Page) =>
  customizePanel(page).locator("li", { hasText: HEALTH });

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
  } else {
    await customizePanel(page).getByRole("link", { name: "Κλείσιμο" }).click();
  }
  await expect(page).toHaveURL(/\/app$/);
  await expect(customizePanel(page)).toHaveCount(0);
}

test("ο Ιδιοκτήτης βλέπει την Υγεία, την κρύβει, μένει κρυμμένη μετά από ανανέωση και η Επαναφορά τη φέρνει πίσω", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await expect(todayHeading(page)).toBeVisible();
  await startFromDefault(page);
  await expect(health(page)).toHaveCount(1);

  await openCustomize(page);
  await clickUntil(
    healthRow(page).getByRole("button", { name: "Κρύψε", exact: true }),
    healthRow(page).getByRole("button", { name: "Εμφάνισε", exact: true }),
  );
  await customizePanel(page).getByRole("button", { name: "Τέλος" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(customizePanel(page)).toHaveCount(0);
  await expect(health(page)).toHaveCount(0);

  await page.reload();
  await expect(todayHeading(page)).toBeVisible();
  await expect(health(page)).toHaveCount(0);

  await openCustomize(page);
  await expect(
    healthRow(page).getByRole("button", { name: "Εμφάνισε", exact: true }),
  ).toBeVisible();
  await customizePanel(page)
    .getByRole("button", { name: "Επαναφορά προεπιλογής" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(customizePanel(page)).toHaveCount(0);
  await expect(health(page)).toHaveCount(1);
});

test("ο Χρήστης πελάτη ανοίγει τη Σήμερα χωρίς Υγεία", async ({ page }) => {
  await signIn(page, `client.${project()}@example.com`);
  await expect(todayHeading(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Όλα καθαρά" })).toBeVisible();
  await expect(health(page)).toHaveCount(0);
});
