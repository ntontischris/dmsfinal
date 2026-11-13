import { expect, test, type Locator, type Page } from "@playwright/test";

import { panel } from "./catalogue-parts";
import {
  button,
  field,
  inspector,
  openNewLead,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";

// Πρόβλεψη του Pipeline (b3), αλλαγή Υπεύθυνου μίας Ευκαιρίας (b2) και φίλτρα ανά στήλη με σελίδες (b1). Φανταστικά
// στοιχεία· οι Πελάτες της λίστας έρχονται από το e2e/seed.mjs, η Ευκαιρία της πρόβλεψης γεννιέται εδώ.
const PIPELINE_URL = /\/app\/pipeline\/[0-9a-f-]{36}$/;

test.describe.configure({ retries: 0 });

// Μέρα του επόμενου μήνα, από σήμερα: το κλείσιμο δεν έχει περάσει ποτέ.
const nextMonth = (): string => {
  const date = new Date();
  date.setUTCDate(15);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const boardCard = (page: Page, title: string): Locator =>
  page.locator(".kcard", { hasText: title });

// Μία κάρτα της σειράς φίλτρων, με την ετικέτα της.
const filterCard = (page: Page, label: string): Locator =>
  page
    .getByRole("group", { name: "Φίλτρα", exact: true })
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: label }) });

async function newOpportunity(page: Page, P: string, title: string) {
  const form = await openNewLead(page);
  await field(form, "Όνομα πελάτη ή επιχείρησης").fill(`Πρόβλεψη Α.Ε. ${P}`);
  await field(form, "Κύριο πρόσωπο").fill("Ιωάννα Πρόβλεψη");
  await field(form, "Email").fill(`forecast.${P}@provlepsi.example.gr`);
  await form.locator('textarea[name="title"]').fill(title);
  await field(form, "Πηγή").selectOption({ label: "Instagram" });
  await field(form, "Επόμενο βήμα").fill("Αποστολή πρότασης");
  await form.locator('input[name="nextStepDue"]').fill("2099-01-08");
  await button(form, "Δημιουργία Πελάτη και Ευκαιρίας").click();
  await expect(page).toHaveURL(PIPELINE_URL);
}

test("πρόβλεψη και αλλαγή Υπεύθυνου: ο Ιδιοκτήτης γράφει Αξία, Πιθανότητα και κλείσιμο, μετά δίνει την Ευκαιρία στον Νίκο", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const title = `Εταιρικό βίντεο πρόβλεψης ${P}`;
  await signIn(page, "owner@example.com");
  await newOpportunity(page, P, title);

  const forecast = panel(page, "Πρόβλεψη");
  const editor = forecast.locator("form");
  await expect(async () => {
    if (!(await editor.isVisible()))
      await forecast
        .locator("summary", { hasText: "Αλλαγή πρόβλεψης" })
        .click();
    await expect(editor).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await editor.locator('input[name="value"]').fill("5000");
  await editor.locator('input[name="probability"]').fill("60");
  await editor.locator('input[name="expectedClose"]').fill(nextMonth());
  await button(editor, "Αποθήκευση πρόβλεψης").click();
  await expect(page.getByText("Η πρόβλεψη αποθηκεύτηκε.")).toBeVisible();
  await expect(forecast).toContainText("60% (δική της)");
  await expect(forecast).toContainText("(εκτίμηση)");
  await shot(page, "b4-forecast");

  // b2: ο Υπεύθυνος της Ευκαιρίας αλλάζει με την επιλογή, χωρίς κουμπί.
  await inspector(page)
    .getByLabel("Υπεύθυνος Ευκαιρίας")
    .selectOption({ label: "Νίκος Πωλήσεις" });
  await expect(page.getByText("Ο Υπεύθυνος άλλαξε.")).toBeVisible();

  // b3: στο Pipeline η κάρτα λέει την πρόβλεψη· το φίλτρο Υπεύθυνου κρατά μόνο του Νίκου.
  await page.goto(
    `/app/pipeline?owner=${encodeURIComponent("Νίκος Πωλήσεις")}`,
  );
  await expect(page.getByText("Σταθμισμένη πρόβλεψη")).toBeVisible();
  await expect(boardCard(page, title)).toContainText("60% · σταθμ.");
  await expect(boardCard(page, `Βίντεο εγκαινίων ${P}`)).toHaveCount(0);
  await expect(filterCard(page, "Κλείσιμο")).toBeVisible();
  await shot(page, "b3-forecast");
});

test("φίλτρα ανά στήλη στους Πελάτες: Υπεύθυνος από τη διεύθυνση και από την κάρτα, σελίδα πέρα από το τέλος", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await page.goto(`/app/clients?owner=${encodeURIComponent("Άννα Πωλήσεις")}`);
  await expect(tableRow(page, `Κυψέλη Καφέ ${P}`)).toBeVisible();
  await expect(tableRow(page, `Ταβέρνα Αρμύρα ${P}`)).toHaveCount(0);

  const owner = filterCard(page, "Υπεύθυνος");
  await expect(owner).toBeVisible();
  await expect(filterCard(page, "Ευκαιρίες")).toBeVisible();

  // Σελίδα πέρα από το τέλος δείχνει την τελευταία, όχι κενό πίνακα.
  await page.goto("/app/clients?page=999");
  await expect(page.locator("table.b1-table tbody tr").first()).toBeVisible();
  await expect(page.getByText("Εμφανίζονται οι πρώτοι 100")).toHaveCount(0);
  await shot(page, "b1-column-filters");
});

test("Ρυθμίσεις › Πωλήσεις: η Διαχείριση ορίζει την Πιθανότητα ενός Σταδίου", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/sales");
  const stages = panel(page, "Στάδια");
  const input = stages.getByLabel("Πιθανότητα %: Νέα", { exact: true });
  await expect(input).toBeVisible();
  // Ίδια τιμή με αυτή που έχει: το τεστ δεν αλλάζει την πρόβλεψη των άλλων.
  const current = (await input.inputValue()) || "10";
  await input.fill(current);
  await button(stages.locator("form", { has: input }), "Ορισμός").click();
  await expect(
    stages.getByText(`Το Στάδιο «Νέα» έχει πια Πιθανότητα ${current}%.`),
  ).toBeVisible();
});
