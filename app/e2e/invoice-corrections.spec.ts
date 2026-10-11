import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { fieldOf } from "./productions-parts";
import { card, clientIdByName, project, shot, signIn, tableRow } from "./sales-parts";

// Διόρθωση και ακύρωση καταχώρισης Τιμολογίου (Iε, #154) από άκρη σε άκρη. Δικός του Πελάτης ανά project και στιγμή
// (service role). Το PDF είναι φανταστικό (e2e/fixtures). Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const INVOICES_PATH = "/app/finance/invoices";
const NEW_PATH = `${INVOICES_PATH}/new`;
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const SUBMIT = "Επιβεβαίωση και καταχώρηση";
const NEW_DUE = "2099-01-15";
const VOID_REASON = "ανέβηκε δύο φορές";

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
      contact_email: `corrections-${Date.now()}@example.com`,
    });
  if (error) throw error;
  return clientIdByName(name);
}

test("ο Ιδιοκτήτης διορθώνει τη λήξη και μετά ακυρώνει την καταχώριση με λόγο", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const stamp = `${project()} ${Date.now()}`;
  const clientName = `Πελάτης Διορθώσεων ${stamp}`;
  const number = `COR-${project()}-${Date.now().toString(36)}`;
  const clientId = await seedClient(clientName);

  await signIn(page, "owner@example.com");
  await page.goto(`${NEW_PATH}?client=${clientId}`);
  await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
  await fieldOf(page, "Αριθμός").fill(number);
  await fieldOf(page, "Καθαρό (€)").fill("1000");
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Καταχωρήθηκε το" }),
  ).toContainText(number);

  await page.goto(INVOICES_PATH);
  await tableRow(page, number)
    .getByRole("link", { name: /^Διόρθωση/ })
    .click();
  await expect(page).toHaveURL(/new\?invoice=[0-9a-f-]{36}/);
  await expect(card(page, `Ίχνος καταχώρισης: ${number}`)).toContainText(
    "Καταχωρήθηκε",
  );

  await expect(
    page.getByRole("button", { name: "Αποθήκευση διόρθωσης" }),
  ).toHaveCount(0);
  await fieldOf(page, "Λήξη").fill(NEW_DUE);
  await page.getByRole("button", { name: "Αποθήκευση διόρθωσης" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Η διόρθωση αποθηκεύτηκε" }),
  ).toBeVisible();
  await expect(card(page, `Ίχνος καταχώρισης: ${number}`)).toContainText(
    "15/01/2099",
  );
  await shot(page, "i3-correct");

  await page.locator("summary", { hasText: "Ακύρωση καταχώρισης" }).click();
  await fieldOf(page, "Λόγος ακύρωσης (υποχρεωτικός)").fill(VOID_REASON);
  await page.getByRole("button", { name: "Επιβεβαίωση ακύρωσης" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Η καταχώριση ακυρώθηκε" }),
  ).toBeVisible();

  await page.goto(INVOICES_PATH);
  await expect(tableRow(page, number)).toHaveCount(0);
  const voided = card(page, "Ακυρωμένες καταχωρίσεις");
  await expect(voided).toContainText(number);
  await expect(voided).toContainText(VOID_REASON);
  await shot(page, "i2-voided");
});
