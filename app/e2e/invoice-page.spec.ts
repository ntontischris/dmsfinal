import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { switchUserInSpaces } from "./finance-parts";
import { button, card, clientIdByName, project, signIn } from "./sales-parts";

// Παρακράτηση φόρου, Είσπραξη από γραμμή Τιμολογίου και σελίδα Τιμολογίου (d3, d4, d6) στη νέα εμφάνιση (Χώροι). Δικός
// του Πελάτης, Τιμολόγιο και ποσοστό ανά project και στιγμή (service role μόνο για τα δεδομένα). Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const SETTINGS_PATH = "/app/settings/finance";
const UNPAID_PATH = "/app/finance/invoices?filter=unpaid";
const RATES_CARD = "Παρακράτηση φόρου";
const RECEIPT_CARD = "Νέα Είσπραξη";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

// Ημερομηνία ISO μετρημένη από σήμερα.
const isoFromToday = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// Τιμολόγιο 1.000 € καθαρά + 240 € ΦΠΑ, έκδοση σήμερα, λήξη σε 30 ημέρες. Επιστρέφει το id του.
async function seedInvoice(
  clientName: string,
  number: string,
): Promise<string> {
  const supabase = serviceClient();
  const { error: clientError } = await supabase.from("clients").insert({
    name: clientName,
    city: "Αθήνα",
    contact_name: "Νίκος Γεωργίου",
    contact_email: `invoice-page-${Date.now()}@example.com`,
  });
  if (clientError) throw clientError;
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      client_id: await clientIdByName(clientName),
      kind: "invoice",
      number,
      issue_date: isoFromToday(0),
      due_date: isoFromToday(30),
      net: 1000,
      vat: 240,
      total: 1240,
      pdf_path: `e2e-invoice-page/${number}.pdf`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

const stamp = () => `${project()} ${Date.now()}`;
let invoicePath = "";

test("ο Ιδιοκτήτης βάζει ποσοστό, εισπράττει από τη γραμμή με παρακράτηση και βλέπει το Τιμολόγιο εξοφλημένο", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const RATE = `Παρακράτηση e2e ${stamp()}`;
  const CLIENT = `Πελάτης Τιμολογίου ${stamp()}`;
  const NUMBER = `IP-${project()}-${Date.now().toString(36)}`;
  invoicePath = `/app/finance/invoices/${await seedInvoice(CLIENT, NUMBER)}`;

  await signIn(page, "owner@example.com");
  await page.goto(SETTINGS_PATH);
  const rates = card(page, RATES_CARD);
  await button(rates, "+ Νέο ποσοστό").click();
  await rates.getByLabel("Ονομασία παρακράτησης").fill(RATE);
  await rates.getByLabel("Ποσοστό (%)").fill("20");
  await button(rates, "Προσθήκη ποσοστού").click();
  await expect(rates.getByRole("status")).toContainText(
    "Το ποσοστό αποθηκεύτηκε.",
  );
  await expect(rates).toContainText(`${RATE} · 20%`);

  // Από τη γραμμή του Τιμολογίου: Πελάτης και Τιμολόγιο έρχονται έτοιμα.
  await page.goto(UNPAID_PATH);
  const row = page.locator("tr", { hasText: NUMBER });
  await row.getByRole("link", { name: "Είσπραξη", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/finance\/receipts\?/);
  const form = card(page, RECEIPT_CARD);
  await expect(
    form.getByRole("checkbox", { name: new RegExp(NUMBER) }),
  ).toBeChecked();
  await expect(form.getByLabel("Ποσό (€, με ΦΠΑ)")).toHaveValue("1240");

  // Παρακράτηση 20% του καθαρού (200 €): το ποσό που μπήκε γίνεται 1.040 €.
  await form
    .getByRole("combobox", { name: /^Παρακράτηση/ })
    .selectOption({ label: RATE });
  await expect(form.getByLabel("Ποσό παρακράτησης (€)")).toHaveValue("200");
  await expect(form.getByLabel("Ποσό (€, με ΦΠΑ)")).toHaveValue("1040");
  await button(form, "Καταχώρηση Είσπραξης").click();
  await expect(form.getByRole("status")).toContainText(
    `Το ${NUMBER} είναι πλέον εξοφλημένο.`,
  );

  // Η σελίδα του Τιμολογίου: η πληρωμή, η παρακράτηση και τίποτα να μένει.
  await page.goto(UNPAID_PATH.replace("unpaid", "all"));
  await page
    .locator("tr", { hasText: NUMBER })
    .getByRole("link", { name: NUMBER })
    .click();
  await expect(page).toHaveURL(new RegExp(`${invoicePath}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(NUMBER);
  const payments = card(page, "Πληρωμές");
  await expect(payments).toContainText("συνδεδεμένη με αυτό");
  await expect(payments).toContainText(RATE);
  await expect(card(page, "Αφορά")).toContainText(CLIENT);
  await expect(
    page.getByRole("link", { name: "Καταχώρηση Είσπραξης" }),
  ).toHaveCount(0);
});

test("οι Πωλήσεις δεν ανοίγουν τη σελίδα Τιμολογίου", async ({ page }) => {
  test.skip(invoicePath === "", "χρειάζεται το Τιμολόγιο του προηγούμενου");
  await switchUserInSpaces(page, "sales@example.com");
  await page.goto(invoicePath);
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();
});
