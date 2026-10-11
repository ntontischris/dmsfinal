import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { fieldOf } from "./productions-parts";
import { clientIdByName, project, shot, signIn, tableRow } from "./sales-parts";

// Τιμολόγια (I2) και Καταχώρηση (I3) από άκρη σε άκρη (#152). Δικός του Πελάτης ανά project και στιγμή (service role),
// ώστε να μην αγγίζει δεδομένα άλλων specs. Το PDF είναι φανταστικό (e2e/fixtures). Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const INVOICES_PATH = "/app/finance/invoices";
const NEW_PATH = `${INVOICES_PATH}/new`;
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const CTA = "Καταχώρηση Τιμολογίου";
const SUBMIT = "Επιβεβαίωση και καταχώρηση";
const NAV_LINK = /Τιμολόγια$/;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function seedClient(name: string): Promise<string> {
  const { error } = await serviceClient()
    .from("clients")
    .insert({
      name,
      city: "Αθήνα",
      contact_name: "Μαρία Παπαδάκη",
      contact_email: `invoices-${Date.now()}@example.com`,
    });
  if (error) throw error;
  return clientIdByName(name);
}

test("ο Ιδιοκτήτης καταχωρεί τιμολόγιο με PDF και το βλέπει ως ανεξόφλητο", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = `${project()} ${Date.now()}`;
  const clientName = `Πελάτης Τιμολογίων ${stamp}`;
  const number = `E2E-${project()}-${Date.now().toString(36)}`;
  const clientId = await seedClient(clientName);

  await signIn(page, "owner@example.com");
  await page.goto(INVOICES_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Τιμολόγια" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: CTA })).toBeVisible();

  await page.goto(`${NEW_PATH}?client=${clientId}`);
  await expect(
    page.getByRole("heading", { level: 1, name: CTA }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
  await fieldOf(page, "Αριθμός").fill(number);
  await fieldOf(page, "Καθαρό (€)").fill("1000");
  await expect(fieldOf(page, "Σύνολο (€)")).toHaveValue("1240");
  await expect(
    page.getByRole("list", { name: "Προειδοποιήσεις" }),
  ).toContainText("Προς τιμολόγηση");
  await shot(page, "i3-owner");
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Καταχωρήθηκε το" }),
  ).toContainText(number);

  await page.goto(INVOICES_PATH);
  const row = tableRow(page, number);
  await expect(row).toContainText(clientName);
  await expect(row).toContainText("ανεξόφλητο");
  await expect(row).toContainText("1.240,00");
  await shot(page, "i2-owner");

  const pdfLink = row.getByRole("link", { name: /^PDF/ });
  const href = await pdfLink.getAttribute("href");
  expect(href).toMatch(/\/app\/finance\/invoices\/[0-9a-f-]{36}\/pdf$/);
  const pdf = await page.request.get(href ?? "", { maxRedirects: 0 });
  expect(pdf.status()).toBe(307);
  expect(pdf.headers().location).toContain("/object/sign/invoices/");

  await page
    .getByRole("navigation", { name: "Φίλτρο Τιμολογίων" })
    .getByRole("link", { name: /ανεξόφλητα/ })
    .click();
  await expect(page).toHaveURL(/filter=unpaid/);
  await expect(tableRow(page, number)).toBeVisible();
});

test("η Διαχείριση δεν βλέπει την Καταχώρηση Τιμολογίου", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: NAV_LINK }),
  ).toBeVisible();

  await page.goto(INVOICES_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Τιμολόγια" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: CTA })).toHaveCount(0);

  await page.goto(NEW_PATH);
  await expect(
    page.getByText("Μόνο όποιος καταχωρεί Τιμολόγια", { exact: false }),
  ).toBeVisible();
});

test("οι Πωλήσεις δεν βλέπουν τα Τιμολόγια", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: NAV_LINK }),
  ).toHaveCount(0);

  await page.goto(INVOICES_PATH);
  await expect(
    page.getByText("Τα Τιμολόγια τα βλέπουν μόνο όσοι", { exact: false }),
  ).toBeVisible();
});
