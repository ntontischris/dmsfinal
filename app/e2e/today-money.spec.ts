import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { card, clientIdByName, project, signIn } from "./sales-parts";

// Σήμερα Σδ (#183): ένα ληξιπρόθεσμο Τιμολόγιο φαίνεται στην κάρτα «Ληξιπρόθεσμα Τιμολόγια» της Σήμερα, και το
// «Άνοιγμα →» πηγαίνει στην I2 με το φίλτρο. Δικός του Πελάτης ανά project και στιγμή (service role, μόνο για τα δεδομένα).
// Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const OVERDUE = "Ληξιπρόθεσμα Τιμολόγια";
const WEEK = "Γυρίσματα των επόμενων 7 ημερών";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

// Πελάτης με ένα Τιμολόγιο που έληξε πριν από χρόνια, ώστε να είναι στα 3 πρώτα της κάρτας (παλαιότερη λήξη πρώτη).
// Διαφορετική λήξη ανά project, ώστε τα δύο projects να μη μοιράζονται θέση.
const DUE_DATE: Readonly<Record<string, string>> = {
  desktop: "2000-01-10",
  mobile: "2000-01-20",
};

async function seedOverdueInvoice(
  clientName: string,
  number: string,
): Promise<void> {
  const supabase = serviceClient();
  const { error: clientError } = await supabase.from("clients").insert({
    name: clientName,
    city: "Αθήνα",
    contact_name: "Μαρία Παπαδάκη",
    contact_email: `today-money-${Date.now()}@example.com`,
  });
  if (clientError) throw clientError;
  const { error } = await supabase.from("invoices").insert({
    client_id: await clientIdByName(clientName),
    kind: "invoice",
    number,
    issue_date: "2000-01-01",
    due_date: DUE_DATE[project()] ?? "2000-01-30",
    net: 100,
    vat: 24,
    total: 124,
    pdf_path: `e2e-today/${number}.pdf`,
  });
  if (error) throw error;
}

test("ο Ιδιοκτήτης βλέπει το ληξιπρόθεσμο στη Σήμερα και το «Άνοιγμα →» τον πάει στα ληξιπρόθεσμα", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const clientName = `Πελάτης Σήμερα ${project()} ${Date.now()}`;
  const number = `TD-${project()}-${Date.now().toString(36)}`;
  await seedOverdueInvoice(clientName, number);

  await signIn(page, "owner@example.com");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await expect(card(page, WEEK)).toBeVisible();

  const overdue = card(page, OVERDUE);
  await expect(overdue).toContainText(`${clientName}, ${number}`);
  await expect(overdue).toContainText("επείγον");
  await expect(overdue).toContainText("124,00");

  await overdue.getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/finance\/invoices\?filter=overdue$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Τιμολόγια" }),
  ).toBeVisible();
  await expect(page.locator("tr", { hasText: number })).toContainText(
    "ληξιπρόθεσμο",
  );
});
