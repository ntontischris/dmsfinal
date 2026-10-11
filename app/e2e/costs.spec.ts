import { expect, test } from "@playwright/test";

import { fieldOf, openProduction } from "./productions-parts";
import { button, card, project, shot, signIn } from "./sales-parts";

// Κόστος και ώρες (G3, G1 «Θέλουν ώρες») από άκρη σε άκρη. Η Εσωτερική «Showreel {project}» του seed είναι ανοιχτή και
// χωρίς ώρες: αρχικά στην ομάδα «Οι υπόλοιπες». Τα τεστ γράφουν στην ίδια βάση, σειριακά, χωρίς retries.
test.describe.configure({ retries: 0 });

const COSTS_PATH = "/app/productions/costs";
const COST_LINK = /^Κόστος και ώρες$/;
const NAV_COST_LINK = /Κόστος και ώρες$/; // στη πλοήγηση το όνομα έχει μπροστά τον κωδικό G3
const EDIT_HOURS = "14,5";
const SUMMARY_HOURS = "14,5 ώρες";

test("ο Ιδιοκτήτης βλέπει την Παραγωγή στο G3, γράφει ώρες μοντάζ και τις επιβεβαιώνει", async ({ page }) => {
  const TITLE = `Showreel ${project()}`;

  await signIn(page, "owner@example.com");
  await expect(page.getByRole("navigation", { name: "Οθόνες" }).getByRole("link", { name: NAV_COST_LINK })).toBeVisible();

  await page.goto(`${COSTS_PATH}?group=rest`);
  await expect(page.getByRole("heading", { level: 1, name: "Κόστος και ώρες" })).toBeVisible();
  await page.getByRole("link", { name: TITLE, exact: true }).click();
  await page.getByRole("link", { name: COST_LINK }).click();
  await expect(page).toHaveURL(/\/app\/productions\/[0-9a-f-]{36}\/costs$/);
  await shot(page, "g3-owner-detail");

  const hours = card(page, "Ώρες και άμεσο κόστος");
  await fieldOf(hours, "Ώρες μοντάζ").fill(EDIT_HOURS);
  await fieldOf(hours, "Επιβεβαίωση μοντάζ").check();
  await button(hours, "Αποθήκευση").click();
  await expect(page.getByRole("status")).toContainText("Αποθηκεύτηκε.");
  await expect(card(page, "Κόστος")).toContainText(SUMMARY_HOURS);
  await shot(page, "g3-owner-saved");
});

test("η Διαχείριση βλέπει το κόστος αλλά δεν γράφει", async ({ page }) => {
  const TITLE = `Showreel ${project()}`;

  await signIn(page, "admin@example.com");
  await openProduction(page, TITLE);
  await page.getByRole("link", { name: COST_LINK }).click();
  await expect(card(page, "Κόστος")).toBeVisible();
  await expect(page.getByText("Μόνο ανάγνωση", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Αποθήκευση", exact: true })).toHaveCount(0);
});

test("οι Πωλήσεις δεν βλέπουν το G3", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(page.getByRole("navigation", { name: "Οθόνες" }).getByRole("link", { name: NAV_COST_LINK })).toHaveCount(0);

  await page.goto(COSTS_PATH);
  await expect(page.getByText("Το κόστος το βλέπουν μόνο όσοι", { exact: false })).toBeVisible();
});
