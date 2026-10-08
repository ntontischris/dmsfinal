import { expect, type Locator, type Page } from "@playwright/test";

import { button, card, tableRow } from "./sales-parts";

// Βοηθητικά του e2e/catalogue.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Τα ποσά ταιριάζουν πάντα με `\s`: το Intl βάζει κενό χωρίς αλλαγή γραμμής πριν το «€».

export const ITEM_URL = /\/app\/catalogue\/[0-9a-f-]{36}$/;

// Το πεδίο με μια ετικέτα, όποια κι αν είναι η δομή της: ετικέτα που τυλίγει το πεδίο (Field) ή ετικέτα με `for` (FormRow).
// Το getByLabel(…, { exact: true }) μόνο του δεν πιάνει select ούτε πεδίο με υπόδειξη μέσα στην ετικέτα, γι' αυτό η ένωση.
export const control = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select, textarea")
    .or(scope.getByLabel(label, { exact: true }));

// Το Panel με τον τίτλο του. Το `.last()` κρατά το πιο εσωτερικό `section` αν ένα περιβάλλον πάνελ έχει κι αυτό τον τίτλο μέσα του.
export const panel = (scope: Page, title: string): Locator =>
  card(scope, title).last();

// Η κεφαλίδα της οθόνης (αυτή με το h1): εκεί μπαίνουν τα σήματα «Δημόσιο», «Αρχειοθετημένο», «Μόνο ανάγνωση».
export const screenHeader = (page: Page): Locator =>
  page.locator("header", { has: page.getByRole("heading", { level: 1 }) });

export async function openItem(page: Page, name: string): Promise<void> {
  await page.goto("/app/catalogue");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(ITEM_URL);
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
}

// Το Πακέτο που διαλέγει το «Νέο Πακέτο», με μία Παροχή `reel`. Η τιμή 900 κρατά τον Κατάλογο έτοιμο.
export async function fillNewPackage(page: Page, name: string): Promise<void> {
  await control(page, "Όνομα").fill(name);
  await control(page, "Τιμή χωρίς ΦΠΑ").fill("900");
  await page.getByRole("button", { name: "Προσθήκη Παροχής" }).click();
  await control(page, "Είδος Παροχής").selectOption({ label: "reel" });
  await control(page, "Ποσότητα").fill("4");
}

// Δημόσιο (πρώτα χωρίς κείμενο, μετά με), αρχειοθέτηση και επαναφορά του Πακέτου της σελίδας `itemUrl`.
// Μετά την επαναφορά το Πακέτο δεν είναι δημόσιο: η επαναφορά δεν το ξαναβγάζει στην Ιστοσελίδα.
export async function publishArchiveRestore(
  page: Page,
  item: { itemUrl: string; name: string },
): Promise<void> {
  const { itemUrl, name } = item;
  await page.goto(itemUrl);
  const pub = panel(page, "Δημόσιο");
  await pub.getByRole("checkbox", { name: /^Δημόσιο/ }).check();
  await button(pub, "Αποθήκευση").click();
  await expect(pub.getByRole("alert")).toContainText(
    "Ένα δημόσιο Πακέτο θέλει σύντομη περιγραφή στα ελληνικά.",
  );
  await control(pub, "Σύντομη περιγραφή").fill("Μηνιαίο πακέτο για δοκιμή.");
  await button(pub, "Αποθήκευση").click();
  await expect(pub.getByRole("status")).toContainText("Αποθηκεύτηκε");
  const header = screenHeader(page);
  await expect(header.getByText("Δημόσιο", { exact: true })).toBeVisible();

  await button(page, "Αρχειοθέτηση").click();
  await expect(
    header.getByText("Αρχειοθετημένο", { exact: true }),
  ).toBeVisible();
  await expect(header.getByText("Δημόσιο", { exact: true })).toHaveCount(0);

  await page.goto("/app/catalogue");
  await expect(tableRow(page, name)).toHaveCount(0);
  await page.getByRole("checkbox", { name: "και αρχειοθετημένα" }).check();
  await expect(tableRow(page, name)).toContainText("Αρχειοθετημένο");

  await page.goto(itemUrl);
  await button(page, "Επαναφορά").click();
  await expect(header.getByText("Αρχειοθετημένο", { exact: true })).toHaveCount(
    0,
  );
  await expect(header.getByText("Δημόσιο", { exact: true })).toHaveCount(0);
}
