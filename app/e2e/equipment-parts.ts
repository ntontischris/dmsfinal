import { expect, type Locator, type Page } from "@playwright/test";

// Βοηθητικά του e2e/equipment.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Τα πεδία ταιριάζουν με την ετικέτα-τίτλο (`span`), γιατί μερικές ετικέτες έχουν υπόδειξη μέσα τους.

export const ITEM_URL = /\/app\/equipment\/[0-9a-f-]{36}$/;

export const fieldOf = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select, textarea");

// Το «Νέο αντικείμενο» είναι κλειστό `details`· ανοίγει με το summary και δίνει τη φόρμα του.
export async function openNewItem(page: Page): Promise<Locator> {
  await page.getByText("Νέο αντικείμενο", { exact: true }).click();
  return page.locator("details", { hasText: "Στοιχεία νέου αντικειμένου" });
}

// Το «Νέο Πρότυπο» κάνει το ίδιο στη F3.
export async function openNewTemplate(page: Page): Promise<Locator> {
  await page.getByText("Νέο Πρότυπο", { exact: true }).click();
  return page.locator("details", { hasText: "Στοιχεία νέου Προτύπου" });
}

// Η σελίδα του αντικειμένου, από τη λίστα της F1. Ο σύνδεσμος έχει το όνομα του αντικειμένου.
export async function openItemFromRegistry(
  page: Page,
  name: string,
): Promise<void> {
  await page.goto("/app/equipment");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(ITEM_URL);
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
}
