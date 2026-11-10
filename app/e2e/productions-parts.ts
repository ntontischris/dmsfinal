import { expect, type Locator, type Page } from "@playwright/test";

import { visit } from "./filming-parts";
import { card } from "./sales-parts";

// Βοηθητικά του e2e/productions.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Οι οθόνες των Παραγωγών (G1, G2, G3) είναι στη νέα εμφάνιση (Χώροι).

export const PRODUCTION_URL = /\/app\/productions\/[0-9a-f-]{36}$/;
export const COSTS_URL = /\/app\/productions\/costs\?production=[0-9a-f-]{36}$/;

// Οι κλασικές φόρμες με ετικέτα-τίτλο (`span`): τις χρησιμοποιούν ακόμα τα e2e άλλων οθονών (Τιμολόγια, Καθολικό).
export const fieldOf = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select, textarea");

// Η σελίδα της Παραγωγής (G2), από τη λίστα G1. Ο σύνδεσμος έχει τον τίτλο της.
export async function openProduction(page: Page, title: string): Promise<void> {
  await visit(page, "/app/productions");
  await page.getByRole("link", { name: title, exact: true }).first().click();
  await expect(page).toHaveURL(PRODUCTION_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
}

// Το «Νέα Εσωτερική Παραγωγή» της G1 ανοίγει τη φόρμα από πάνω· το κουμπί ζωντανεύει μόλις φορτώσει η σελίδα,
// οπότε ξαναπατιέται μέχρι να φανεί η φόρμα. Επιστρέφει τη φόρμα (πεδία `title` και `ownerId`).
export async function openNewInternal(page: Page): Promise<Locator> {
  const form = page.locator("form", {
    has: page.getByRole("heading", {
      name: "Νέα Εσωτερική Παραγωγή",
      exact: true,
    }),
  });
  const open = page.getByRole("button", {
    name: "Νέα Εσωτερική Παραγωγή",
    exact: true,
  });
  await expect(async () => {
    if (!(await form.isVisible())) await open.click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return form;
}

// Νέα Εσωτερική Παραγωγή από τη G1, με Υπεύθυνο· μετά τη δημιουργία ανοίγει η σελίδα της (G2).
export async function createInternal(
  page: Page,
  title: string,
  owner: string,
): Promise<void> {
  await visit(page, "/app/productions");
  const form = await openNewInternal(page);
  const titleBox = form.locator('input[name="title"]');
  // Οι τιμές ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η φόρμα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await titleBox.fill(title);
    await expect(titleBox).toHaveValue(title, { timeout: 1_000 });
  }).toPass();
  await form.locator('select[name="ownerId"]').selectOption({ label: owner });
  await form.getByRole("button", { name: "Δημιουργία", exact: true }).click();
  await expect(page).toHaveURL(PRODUCTION_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
}

// Η φόρμα με υποχρεωτικό λόγο του πάνελ «Κατάσταση» (Παράδοση, Επανάνοιγμα, Ακύρωση): ανοίγει από το κουμπί της,
// γράφεται ο λόγος και επιβεβαιώνεται με το κουμπί της φόρμας (που μπορεί να έχει το ίδιο όνομα με το κουμπί που την ανοίγει).
export async function confirmWithReason(
  page: Page,
  step: { open: string; label: string; confirm: string; reason: string },
): Promise<void> {
  const state = card(page, "Κατάσταση");
  const form = state.locator(".g2-form", { has: page.getByLabel(step.label) });
  await expect(async () => {
    if (!(await form.isVisible()))
      await state
        .getByRole("button", { name: step.open, exact: true })
        .first()
        .click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form.getByLabel(step.label).fill(step.reason);
  await form.getByRole("button", { name: step.confirm, exact: true }).click();
}
