import { expect, test, type Page } from "@playwright/test";

import {
  bookFilmingFromScreen,
  ensureSignedMonthlyAgreement,
  upcomingDay,
  visit,
} from "./filming-parts";
import { button, project, shot, signIn } from "./sales-parts";

// Στοιχεία χώρου (c9) και τι γίνεται με την Παροχή και τη χρέωση στο «έγινε»/«αναίρεση» (c7), στη σελίδα Γυρίσματος.
// Το Γύρισμα κλείνεται από την ίδια τη ροή, σε μέρα που δεν πέφτει πάνω στα filming.spec (15) και sheet.spec (20).
test.describe.configure({ mode: "serial", retries: 0 });
test.setTimeout(90_000);

const detailsPanel = (page: Page) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: "Στοιχεία χώρου", exact: true }),
  });

const outcomeList = (page: Page) =>
  page.getByRole("list", { name: "Τι γίνεται με την Παροχή και τη χρέωση" });

test("ο Ιδιοκτήτης γράφει επαφή και σύνδεσμο αρχείων, και βλέπει τι γίνεται με την Παροχή στο «έγινε» και στην αναίρεση", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await ensureSignedMonthlyAgreement(page, browser, P);
  await bookFilmingFromScreen(page, P, upcomingDay(24, 20));
  const filmingUrl = page.url();

  const panel = detailsPanel(page);
  await expect(
    panel.getByText("Δεν έχουν μπει στοιχεία χώρου.", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText(/^Google: /)).toBeVisible();

  await button(panel, "Αλλαγή στοιχείων χώρου").click();
  await panel.getByLabel("Επαφή στον χώρο").fill(`Κώστας ${P}`);
  await panel.getByLabel("Τηλέφωνο επαφής").fill("210 0000000");
  await panel
    .getByLabel("Σύνδεσμος αρχείων (https://…)")
    .fill("http://example.com/files");
  await button(panel, "Αποθήκευση στοιχείων").click();
  await expect(
    panel.getByText("Ο σύνδεσμος αρχείων πρέπει να ξεκινά με https://"),
  ).toBeVisible();

  await panel
    .getByLabel("Σύνδεσμος αρχείων (https://…)")
    .fill("https://example.com/files");
  await button(panel, "Αποθήκευση στοιχείων").click();
  await expect(
    panel.getByRole("link", { name: "άνοιγμα φακέλου" }),
  ).toHaveAttribute("href", "https://example.com/files");
  await expect(panel.getByText(`Κώστας ${P}`, { exact: true })).toBeVisible();
  await shot(page, "filming-e3-details");

  await button(page, "Έγινε (και πόσο κράτησε)").click();
  await expect(outcomeList(page)).toBeVisible();
  await page.getByLabel("Πόσο κράτησε στην πράξη (ώρες)").fill("3");
  await button(page, "Επιβεβαίωση «έγινε»").click();
  await expect(
    outcomeList(page).getByText("Το Γύρισμα ξαναγίνεται προγραμματισμένο."),
  ).toBeVisible();

  // Ο σύνδεσμος αρχείων αλλάζει και μετά το «έγινε» (τα αρχεία έρχονται μετά το γύρισμα).
  await visit(page, filmingUrl);
  await button(detailsPanel(page), "Αλλαγή στοιχείων χώρου").click();
  await detailsPanel(page)
    .getByLabel("Σύνδεσμος αρχείων (https://…)")
    .fill("https://example.com/final");
  await button(detailsPanel(page), "Αποθήκευση στοιχείων").click();
  await expect(
    detailsPanel(page).getByRole("link", { name: "άνοιγμα φακέλου" }),
  ).toHaveAttribute("href", "https://example.com/final");
});
