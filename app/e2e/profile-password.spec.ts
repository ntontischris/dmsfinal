import { expect, test, type Page } from "@playwright/test";

import { field, project, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Αλλαγή κωδικού από το Προφίλ (A3 › Είσοδος): ζητά τον τωρινό κωδικό. Φανταστικά στοιχεία, δικός του Χρήστης
// ανά project (e2e/seed.mjs), και στο τέλος ο κωδικός γυρίζει στον αρχικό του seed.
const SEED_PASSWORD = "e2e-password-123";
const NEW_PASSWORD = "e2e-changed-password-789";

// Το τεστ αλλάζει τον κωδικό του Χρήστη· μια επανάληψη θα ξεκινούσε με άλλον κωδικό.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

async function changePassword(page: Page, current: string, next: string) {
  await field(page, "Τωρινός κωδικός").fill(current);
  await field(page, "Νέος κωδικός").fill(next);
  await field(page, "Ξανά ο κωδικός").fill(next);
  await page.getByRole("button", { name: "Αλλαγή κωδικού" }).click();
}

test("η αλλαγή κωδικού από το Προφίλ ζητά τον τωρινό και δεν δέχεται τον ίδιο", async ({ page }) => {
  await signIn(page, `password.${project()}@example.com`);
  await page.goto("/app/settings/profile");
  await page.getByRole("link", { name: "Αλλαγή κωδικού" }).click();
  await expect(page).toHaveURL(/\/auth\/set-password$/);
  await expect(page.getByRole("heading", { name: "Αλλαγή κωδικού" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Στείλε μου σύνδεσμο αλλαγής" })).toBeVisible();

  await changePassword(page, SEED_PASSWORD, NEW_PASSWORD);
  await expect(page.getByRole("status").filter({ hasText: "Ο κωδικός άλλαξε." })).toBeVisible();

  await changePassword(page, NEW_PASSWORD, NEW_PASSWORD);
  await expect(page.getByRole("alert")).toHaveText("Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τωρινό.");

  // Επαναφορά στον κωδικό του seed.
  await changePassword(page, NEW_PASSWORD, SEED_PASSWORD);
  await expect(page.getByRole("status").filter({ hasText: "Ο κωδικός άλλαξε." })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
