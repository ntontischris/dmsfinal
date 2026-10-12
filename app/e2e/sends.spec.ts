import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { project, signIn } from "./sales-parts";

// Ιστορικό αποστολών (K3, #174) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Αποστολών {project}» (Υπεύθυνος ο Ιδιοκτήτης) και ο
// Χρήστης πελάτη «Ελένη Αποστολών» (Πλήρης) έρχονται από το seed. Ένα Μήνυμα της ομάδας μπαίνει με service role και τρέχει
// ο επεξεργαστής της ουράς, όπως κάνει το cron κάθε λεπτού: η Ειδοποίηση «Νέο Μήνυμα» πάει στον πελάτη και γράφεται στο
// Ιστορικό. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const SENDS_PATH = "/app/settings/sends";
const RECIPIENT = "Ελένη Αποστολών";

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function clientIdOf(admin: SupabaseClient, P: string): Promise<string> {
  const { data, error } = await admin
    .from("clients")
    .select("id")
    .eq("name", `Πελάτης Αποστολών ${P}`)
    .single();
  if (error) throw error;
  return String(data.id);
}

async function ownerIdOf(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from("team_users")
    .select("user_id")
    .eq("email", "owner@example.com")
    .single();
  if (error) throw error;
  return String(data.user_id);
}

// Η ομάδα γράφει στη Συνομιλία του Πελάτη και τρέχει ο επεξεργαστής: μία Ειδοποίηση στον Χρήστη πελάτη.
async function teamMessageProcessed(P: string): Promise<string> {
  const admin = adminClient();
  const clientId = await clientIdOf(admin, P);
  const ownerId = await ownerIdOf(admin);
  const { error } = await admin.from("messages").insert({
    client_id: clientId,
    author_id: ownerId,
    author_kind: "team",
    body: `Καλημέρα από την ομάδα ${P}`,
  });
  if (error) throw error;
  const { error: processError } = await admin.rpc("events_process");
  if (processError) throw processError;
  return clientId;
}

test("ο Ιδιοκτήτης βλέπει την αποστολή στο K3, φιλτράρει ανά Πελάτη και τη βρίσκει στην καρτέλα «Αποστολές» του Πελάτη", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const clientId = await teamMessageProcessed(P);
  const clientName = `Πελάτης Αποστολών ${P}`;

  await signIn(page, "owner@example.com");
  await page.goto(SENDS_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ιστορικό αποστολών" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Ιστορικό αποστολών" })
      .getByRole("link", { name: "Στάλθηκαν" }),
  ).toHaveAttribute("aria-current", "page");

  // Φίλτρο Πελάτη: μόνο οι αποστολές του.
  await page
    .getByLabel("Πελάτης", { exact: true })
    .selectOption({ label: clientName });
  await page.getByRole("button", { name: "Εφαρμογή" }).click();
  await expect(page).toHaveURL(new RegExp(`client=${clientId}`));
  const row = page.locator("tr").filter({ hasText: RECIPIENT }).first();
  await expect(row).toContainText("Νέο Μήνυμα");
  await expect(row).toContainText("Ειδοποίηση");
  await expect(row).toContainText("στάλθηκε");
  await expect(page.getByRole("main")).not.toContainText(
    `Καλημέρα από την ομάδα ${P}`,
  );

  // Η καρτέλα «Αποστολές» του Πελάτη.
  await page.goto(`/app/clients/${clientId}`);
  await page
    .getByRole("navigation", { name: "Καρτέλες Πελάτη" })
    .getByRole("link", { name: "Αποστολές" })
    .click();
  await expect(page).toHaveURL(/tab=sends/);
  const panel = page.getByRole("main");
  await expect(
    panel.getByText("Αποστολές προς τους Χρήστες του Πελάτη"),
  ).toBeVisible();
  await expect(
    panel.locator("tr").filter({ hasText: RECIPIENT }).first(),
  ).toContainText("Νέο Μήνυμα");
});

test("χωρίς Δικαίωμα δεν φαίνεται ούτε το K3 ούτε η γραμμή του στο μενού", async ({
  page,
}) => {
  await signIn(page, "sales@example.com");
  await page.goto(SENDS_PATH);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ιστορικό αποστολών" }),
  ).toHaveCount(0);
});
