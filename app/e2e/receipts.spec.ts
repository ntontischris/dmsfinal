import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { openTab, tabLink } from "./finance-parts";
import { button, card, project, signIn } from "./sales-parts";

// Εισπράξεις (I4) και Τρόποι είσπραξης από άκρη σε άκρη (#150). Τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε
// Πελάτης και Τρόπος παίρνει όνομα με το project και τη στιγμή. Σειριακά, χωρίς retries. Στη νέα εμφάνιση (Χώροι).
test.describe.configure({ retries: 0 });


const SETTINGS_PATH = "/app/settings/finance";
const RECEIPTS_PATH = "/app/finance/receipts";
const MONEY = "Χρήματα";
const RECEIPTS_TAB = "Εισπράξεις";
const METHODS_CARD = "Τρόποι είσπραξης";
const RECEIPT_CARD = "Νέα Είσπραξη";
const PREVIEW = ".i245-preview";

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

  await page.goto(SETTINGS_PATH);
  const methods = card(page, METHODS_CARD);
  await button(methods, "+ Νέα τιμή").click();
  await methods.getByLabel("Νέος τρόπος").fill(METHOD);
  await button(methods, "Προσθήκη τρόπου").click();
  await expect(methods.getByRole("status")).toContainText(
    "Ο τρόπος αποθηκεύτηκε.",
  );

  await openTab(page, MONEY, RECEIPTS_TAB);
  await expect(page).toHaveURL(new RegExp(`${RECEIPTS_PATH}$`));
  const form = card(page, RECEIPT_CARD);
  await form.getByLabel("Πελάτης").selectOption({ label: CLIENT });
  await form.getByLabel("Ποσό (€, με ΦΠΑ)").fill("400");
  await expect(page.locator(PREVIEW)).toContainText("υπέρ του πελάτη");
  await form.getByLabel("Τρόπος").selectOption({ label: METHOD });
  await button(form, "Καταχώρηση Είσπραξης").click();
  const done = form.getByRole("status");
  await expect(done).toContainText(/Καταχωρήθηκε 400\s€ από/);
  await expect(done).toContainText(CLIENT);

  const row = page.locator("tr", { hasText: CLIENT });
  await expect(row).toContainText("400");

  await button(row, "Διόρθωση").click();
  await row.getByLabel("Ποσό (€, με ΦΠΑ)").fill("450");
  await row.getByPlaceholder("Λόγος διόρθωσης (υποχρεωτικός)").fill("Λάθος ποσό");
  await button(row, "Επιβεβαίωση").click();
  await expect(row).toContainText("Ίχνος: διόρθωση");
  await expect(row).toContainText("Λόγος: Λάθος ποσό");

  // Μετά τη διόρθωση η γραμμή δείχνει τη νέα τιμή και ξαναδέχεται ενέργεια.
  await page.reload();
  await expect(row).toContainText("450");
  await button(row, "Διαγραφή").click();
  await row
    .getByPlaceholder("Λόγος διαγραφής (υποχρεωτικός)")
    .fill("Καταχωρήθηκε δύο φορές");
  await button(row, "Επιβεβαίωση").click();
  await expect(page.locator("tr", { hasText: CLIENT })).toContainText(
    "Λόγος: Καταχωρήθηκε δύο φορές",
  );
  await page.reload();
  await expect(page.locator("tr", { hasText: CLIENT })).toContainText(
    "Διαγράφηκε. Λόγος: Καταχωρήθηκε δύο φορές",
  );
});

test("οι Πωλήσεις δεν βλέπουν τις Εισπράξεις", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await page.goto(RECEIPTS_PATH);
  await expect(
    page.getByText("Οι Εισπράξεις είναι για την ομάδα και τον Λογιστή", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(tabLink(page, MONEY, RECEIPTS_TAB)).toHaveCount(0);
});
