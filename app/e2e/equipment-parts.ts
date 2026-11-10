import { expect, type Locator, type Page } from "@playwright/test";

import { visit } from "./filming-parts";
import { button, card } from "./sales-parts";

// Βοηθητικά του e2e/equipment.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Οι οθόνες του Εξοπλισμού (F1, F2, F3) είναι στη νέα εμφάνιση (Χώροι): τα πάνελ είναι `section` με τίτλο h2.

export const ITEM_URL = /\/app\/equipment\/[0-9a-f-]{36}$/;

// Ένα κουμπί που ανοίγει πάνελ: πριν ζωντανέψει η σελίδα το κλικ χάνεται, οπότε ξαναπατιέται μέχρι να φανεί το πάνελ.
async function openPanel(page: Page, opener: string, title: string): Promise<Locator> {
  const panel = card(page, title);
  await expect(async () => {
    if (!(await panel.isVisible())) await button(page, opener).click();
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return panel;
}

// Το «Νέο αντικείμενο» της F1 ανοίγει το πάνελ της φόρμας του.
export const openNewItem = (page: Page): Promise<Locator> =>
  openPanel(page, "Νέο αντικείμενο", "Νέο αντικείμενο");

// Το «Νέο Πρότυπο» κάνει το ίδιο στη F3.
export const openNewTemplate = (page: Page): Promise<Locator> =>
  openPanel(page, "Νέο Πρότυπο", "Νέο Πρότυπο εξοπλισμού");

// Το «Περισσότερα» των καρτελών του Χώρου «Παραγωγή»: εκεί ζουν οι οθόνες χωρίς καρτέλα (π.χ. τα Πρότυπα εξοπλισμού).
export async function openMoreScreens(page: Page): Promise<Locator> {
  const nav = page.getByRole("navigation", { name: "Παραγωγή", exact: true });
  const more = nav.getByRole("button", { name: "Περισσότερες οθόνες", exact: true });
  await expect(async () => {
    if ((await more.getAttribute("aria-expanded")) !== "true") await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass();
  return nav;
}

// Η σελίδα του αντικειμένου, από το μητρώο της F1. Ο σύνδεσμος και ο τίτλος του πάνελ έχουν το όνομα του αντικειμένου.
export async function openItemFromRegistry(
  page: Page,
  name: string,
): Promise<void> {
  await visit(page, "/app/equipment");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(ITEM_URL);
  await expect(card(page, name)).toBeVisible();
}
