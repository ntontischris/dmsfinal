import { expect, type Locator, type Page } from "@playwright/test";

// Βοηθητικά του e2e/productions.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Τα πεδία ταιριάζουν με την ετικέτα-τίτλο (`span`), γιατί οι ετικέτες των select έχουν τις επιλογές μέσα τους.

export const PRODUCTION_URL = /\/app\/productions\/[0-9a-f-]{36}$/;

export const fieldOf = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select, textarea");

// Η σελίδα της Παραγωγής, από τη λίστα G1. Ο σύνδεσμος έχει τον τίτλο της.
export async function openProduction(page: Page, title: string): Promise<void> {
  await page.goto("/app/productions");
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(PRODUCTION_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
}

// Το «Νέα Εσωτερική Παραγωγή» είναι κλειστό `details`· ανοίγει με το summary και δίνει τη φόρμα του.
export async function openNewInternal(page: Page): Promise<Locator> {
  await page.getByText("Νέα Εσωτερική Παραγωγή", { exact: true }).click();
  return page.locator("details", {
    hasText: "Στοιχεία νέας Εσωτερικής Παραγωγής",
  });
}
