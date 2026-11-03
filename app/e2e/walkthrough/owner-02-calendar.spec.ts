import { expect, test } from "@playwright/test";

import { project, signIn } from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομή 02: Ημερολόγιο και Ρεπό / Άδεια (docs/walkthrough/owner.md).
const OWNER = "owner@example.com";
const DAY = "2027-03-10";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context, page }) => {
  await useSpacesLook(context);
  await signIn(page, OWNER);
});

test("02 · οι Ρυθμίσεις έχουν τα Είδη κλεισμένου χρόνου", async ({ page }) => {
  await page.goto("/app/settings/filming?part=calendar");
  for (const kind of ["Ρεπό", "Άδεια", "Ραντεβού", "Τηλεφώνημα", "Άλλο"])
    await expect(page.getByLabel(`Νέα ονομασία: ${kind}`, { exact: true })).toBeVisible();
});

test("02 · το Ημερολόγιο έχει Επόμενα βήματα, Προθεσμίες και φίλτρο ατόμου", async ({ page }) => {
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  await page.locator(".a5-filters > summary").click();
  for (const label of ["Γυρίσματα", "Ρεπό, άδειες", "Επόμενα βήματα", "Προθεσμίες", "Εγώ", "Όλοι"])
    await expect(page.locator(".a5-filters").getByRole("link", { name: label, exact: true })).toBeVisible();
});

test("02 · ο Ιδιοκτήτης κλείνει «Ραντεβού», το βλέπει με το Είδος του και το σβήνει", async ({ page }) => {
  const title = `Ραντεβού δοκιμής ${project()}`;
  await page.goto(`/app/calendar/blocked/new?date=${DAY}`);
  const titleBox = page.getByLabel("Τίτλος");
  // Οι τιμές της φόρμας ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await page.getByLabel("Είδος").selectOption({ label: "Ραντεβού" });
    await page.getByLabel("Μερικές ώρες (π.χ. γιατρός)").check();
    await page.getByLabel("Μέρα", { exact: true }).fill(DAY);
    await page.getByLabel("Από", { exact: true }).fill("10:00");
    await page.getByLabel("Έως", { exact: true }).fill("11:00");
    await titleBox.fill(title);
    await expect(titleBox).toHaveValue(title, { timeout: 1_000 });
    await expect(page.getByLabel("Από", { exact: true })).toHaveValue("10:00", { timeout: 1_000 });
  }).toPass();
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/app\/calendar/);

  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  const item = page.getByRole("link", { name: new RegExp(title) });
  await expect(item).toBeVisible();
  await expect(page.locator(".a5-mark", { hasText: "Ραντεβού" }).first()).toBeVisible();

  await item.click();
  await expect(page.getByLabel("Τίτλος")).toHaveValue(title);
  const confirm = page.getByRole("alertdialog");
  await expect(async () => {
    if (!(await confirm.isVisible())) await page.getByRole("button", { name: "Διαγραφή", exact: true }).click();
    await expect(confirm).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await confirm.getByRole("button", { name: "Διαγραφή", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/calendar/);
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
});
