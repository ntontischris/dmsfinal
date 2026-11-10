import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { clientIdByName, project, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Σήμερα Σδ (#183) στη νέα εμφάνιση (Χώροι): ένα ληξιπρόθεσμο Τιμολόγιο φαίνεται στα «Χρήματα» της Σήμερα (οφειλέτης και
// ποσό), και το «Όλα τα τιμολόγια →» πηγαίνει στην I2 με το φίλτρο. Δικός του Πελάτης ανά project και στιγμή (service role,
// μόνο για τα δεδομένα). Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

// Τα «Χρήματα» δείχνουν τους 3 μεγαλύτερους οφειλέτες: ποσό πολύ πάνω από κάθε οφειλή του seed, ώστε ο Πελάτης να είναι εκεί.
// Λήξη πριν από χρόνια, διαφορετική ανά project.
const DUE_DATE: Readonly<Record<string, string>> = {
  desktop: "2000-01-10",
  mobile: "2000-01-20",
};
const TOTAL_EUROS = /4\.960\.000\s€/;

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
    net: 4_000_000,
    vat: 960_000,
    total: 4_960_000,
    pdf_path: `e2e-today/${number}.pdf`,
  });
  if (error) throw error;
}

test("ο Ιδιοκτήτης βλέπει το ληξιπρόθεσμο στη Σήμερα και το «Όλα τα τιμολόγια →» τον πάει στα ληξιπρόθεσμα", async ({
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
  await expect(
    page.locator("[data-part='programme']").getByRole("heading", {
      name: "Το πρόγραμμα",
    }),
  ).toBeVisible();

  const money = page.locator("[data-part='money']");
  const debtor = money.getByRole("listitem").filter({ hasText: clientName });
  await expect(debtor).toContainText(/έληξε πριν από \d+ ημέρες/);
  await expect(debtor).toContainText(TOTAL_EUROS);

  await money.getByRole("link", { name: "Όλα τα τιμολόγια →" }).click();
  await expect(page).toHaveURL(/\/app\/finance\/invoices\?filter=overdue$/);
  await expect(
    page
      .locator("details.kit-fb-card", { hasText: "Κατάσταση" })
      .locator(".kit-fb-chip"),
  ).toHaveText(/^ληξιπρόθεσμα/);
  await expect(page.locator("tr", { hasText: number })).toContainText(
    "ληξιπρόθεσμο",
  );
});
