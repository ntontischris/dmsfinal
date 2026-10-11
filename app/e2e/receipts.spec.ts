import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { fieldOf } from "./productions-parts";
import { button, card, project, signIn } from "./sales-parts";

// Εισπράξεις (I4) και Τρόποι είσπραξης από άκρη σε άκρη (#150). Τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε
// Πελάτης και Τρόπος παίρνει όνομα με το project και τη στιγμή. Σειριακά, χωρίς retries.
test.describe.configure({ retries: 0 });

const SETTINGS_PATH = "/app/settings/finance";
const RECEIPTS_PATH = "/app/finance/receipts";
const NAV_RECEIPTS_LINK = /Εισπράξεις$/;
const METHODS_CARD = "Τρόποι είσπραξης";
const RECEIPT_CARD = "Νέα Είσπραξη";
const PREVIEW = 'section[aria-label="Θα εξοφλήσει"]';

// Το service role μόνο για να φτιάξει τον Πελάτη του τεστ, όπως κάνει και το e2e/sales-parts.ts.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function seedClient(name: string): Promise<void> {
  const { error } = await serviceClient()
    .from("clients")
    .insert({
      name,
      city: "Αθήνα",
      contact_name: "Μαρία Παπαδάκη",
      contact_email: `receipts-${Date.now()}@example.com`,
    });
  if (error) throw error;
}

const stamp = () => `${project()} ${Date.now()}`;

test("ο Ιδιοκτήτης προσθέτει τρόπο, καταχωρεί, διορθώνει και διαγράφει Είσπραξη με λόγο", async ({
  page,
}) => {
  const METHOD = `Τρόπος ${stamp()}`;
  const CLIENT = `Πελάτης Εισπράξεων ${stamp()}`;
  await seedClient(CLIENT);

  await signIn(page, "owner@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: NAV_RECEIPTS_LINK }),
  ).toBeVisible();

  await page.goto(SETTINGS_PATH);
  const methods = card(page, METHODS_CARD);
  await fieldOf(methods, "Νέος τρόπος").fill(METHOD);
  await button(methods, "Προσθήκη τρόπου").click();
  await expect(methods.getByRole("status")).toContainText(
    "Ο τρόπος αποθηκεύτηκε.",
  );

  await page.goto(RECEIPTS_PATH);
  const form = card(page, RECEIPT_CARD);
  await fieldOf(form, "Πελάτης").selectOption({ label: CLIENT });
  await fieldOf(form, "Ποσό (€, με ΦΠΑ)").fill("400");
  await expect(page.locator(PREVIEW)).toContainText("υπέρ του πελάτη");
  await fieldOf(form, "Τρόπος").selectOption({ label: METHOD });
  await button(form, "Καταχώρηση Είσπραξης").click();
  await expect(form.getByRole("status")).toContainText(
    "Η Είσπραξη καταχωρήθηκε.",
  );

  const row = page.locator("tr", { hasText: CLIENT });
  await expect(row).toContainText("400,00");

  await row.getByText("Διόρθωση", { exact: true }).click();
  await fieldOf(row, "Ποσό (€, με ΦΠΑ)").fill("450");
  await fieldOf(row, "Λόγος διόρθωσης (υποχρεωτικός)").fill("Λάθος ποσό");
  await button(row, "Αποθήκευση διόρθωσης").click();
  await expect(row.getByRole("status")).toContainText(
    "Η διόρθωση αποθηκεύτηκε.",
  );

  await row.getByText("Διαγραφή", { exact: true }).click();
  await fieldOf(row, "Λόγος διαγραφής (υποχρεωτικός)").fill(
    "Καταχωρήθηκε δύο φορές",
  );
  await button(row, "Επιβεβαίωση διαγραφής").click();
  await expect(page.locator("tr", { hasText: CLIENT })).toContainText(
    "Λόγος: Καταχωρήθηκε δύο φορές",
  );
});

test("οι Πωλήσεις δεν βλέπουν τις Εισπράξεις", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: NAV_RECEIPTS_LINK }),
  ).toHaveCount(0);

  await page.goto(RECEIPTS_PATH);
  await expect(
    page.getByText("Οι Εισπράξεις είναι για την ομάδα και τον Λογιστή", {
      exact: false,
    }),
  ).toBeVisible();
});
