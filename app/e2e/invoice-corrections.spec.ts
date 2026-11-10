import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { fieldOf } from "./productions-parts";
import { card, clientIdByName, project, shot, signIn, tableRow } from "./sales-parts";

// Διόρθωση και ακύρωση καταχώρισης Τιμολογίου (Iε, #154) από άκρη σε άκρη. Δικός του Πελάτης ανά project και στιγμή
// (service role). Το PDF είναι φανταστικό (e2e/fixtures). Σειριακά, χωρίς retries. Στη νέα εμφάνιση (Χώροι).
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
  // Η φόρμα έρχεται μετά τον σκελετό αναμονής: πρώτα να φανεί, μετά να γραφτεί (όπως στο invoices.spec).
  await expect(
    page.getByRole("heading", { name: "Βήμα 1: Ανέβασμα PDF" }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
  await fieldOf(page, "Αριθμός").fill(number);
  await fieldOf(page, "Καθαρό (€)").fill("1000");
  await expect(fieldOf(page, "Σύνολο (€)")).toHaveValue("1240");
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

  // Η διόρθωση αποθηκεύεται μόνο όταν κάτι άλλαξε.
  const correction = card(page, "Διόρθωση ή ακύρωση καταχώρισης");
  const save = correction.getByRole("button", { name: "Αποθήκευση διόρθωσης" });
  await expect(save).toBeDisabled();
  await fieldOf(correction, "Λήξη").fill(NEW_DUE);
  await save.click();
  await expect(
    correction.getByRole("status").filter({ hasText: "Η διόρθωση αποθηκεύτηκε" }),
  ).toBeVisible();
  await expect(card(page, `Ίχνος καταχώρισης: ${number}`)).toContainText(
    "15/01/2099",
  );
  await shot(page, "i3-correct");

  // Η ακύρωση θέλει λόγο: χωρίς αυτόν το κουμπί δεν πατιέται.
  const voidButton = correction.getByRole("button", {
    name: "Ακύρωση καταχώρισης",
  });
  await expect(voidButton).toBeDisabled();
  await fieldOf(correction, "Λόγος ακύρωσης (υποχρεωτικός)").fill(VOID_REASON);
  await voidButton.click();
  // Μετά την ακύρωση η φόρμα φεύγει και η σελίδα δείχνει την ακυρωμένη καταχώριση με τον λόγο.
  const voidedNotice = page
    .getByRole("heading", { name: "Η καταχώριση είναι ακυρωμένη" })
    .locator("xpath=ancestor::section[1]");
  await expect(voidedNotice).toBeVisible();
  await expect(voidedNotice).toContainText(VOID_REASON);

  await page.goto(INVOICES_PATH);
  await expect(tableRow(page, number)).toHaveCount(0);
  const voided = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Ακυρωμένες καταχωρίσεις" }) });
  await voided.locator("summary").click();
  await expect(voided).toContainText(number);
  await expect(voided).toContainText(VOID_REASON);
  await shot(page, "i2-voided");
});
