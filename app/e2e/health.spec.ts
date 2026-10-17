import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { card, project, signIn } from "./sales-parts";

// Υγεία συστήματος (P2, #215) από άκρη σε άκρη. Οι αποτυχημένες αποστολές και το Γεγονός που κόλλησε μπαίνουν με service
// role (μόνο προετοιμασία), με το όνομα του project, γιατί τα δύο projects μοιράζονται μία βάση. Οι ενέργειες γίνονται
// από την οθόνη. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const PATH = "/app/health";
const TITLE = "Υγεία συστήματος";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

// Ένα δοκιμαστικό email που απέτυχε οριστικά τώρα (μέσα στις 7 μέρες της Υγείας, όποια μέρα κι αν τρέχει το τεστ).
async function failedSend(name: string): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient()
    .from("email_outbox")
    .insert({
      kind: "test",
      to_name: name,
      to_email: "owner@example.com",
      status: "failed",
      attempts: 5,
      last_error: "Ο πάροχος απέρριψε τη διεύθυνση",
      handled_at: now,
      created_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

// Ένα Γεγονός χωρίς Αυτοματισμούς (φόρμα ενδιαφέροντος) με 5 αποτυχημένες προσπάθειες: δεν στέλνει τίποτα όταν ξανατρέξει.
async function stuckEvent(P: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("events")
    .insert({
      type: "opportunity.form_submitted",
      entity: "opportunities",
      case_key: `opportunity.form_submitted:e2e-health-${P}-${Date.now()}`,
      payload: {},
      attempts: 5,
      last_error: `Κόλλησε ${P}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

async function confirm(page: Page, scope: string, label: string) {
  const item = page.locator(scope);
  await item.getByRole("button", { name: label, exact: true }).click();
  await item.getByRole("button", { name: `Ναι: ${label}` }).click();
  await expect(item).toHaveCount(0);
}

test("ο Ιδιοκτήτης βλέπει τη μπάρα, αγνοεί, ξαναστέλνει και ξαναδοκιμάζει", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const ignored = `Υγεία Αγνόησε ${P}`;
  const ignoreId = await failedSend(ignored);
  const resendId = await failedSend(`Υγεία Ξαναστείλε ${P}`);
  const eventId = await stuckEvent(P);

  await signIn(page, "owner@example.com");
  await page.goto(PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Σύνοψη Υγείας" }),
  ).toContainText(/θέλ(ει|ουν) προσοχή/);
  await expect(page.getByTestId("external-not-set-up")).toBeVisible();
  await expect(
    card(page, "Αποστολές που απέτυχαν").getByText("θέλει προσοχή"),
  ).toBeVisible();

  await confirm(page, `[data-send="${ignoreId}"]`, "Αγνόησε");
  await confirm(page, `[data-send="${resendId}"]`, "Ξαναστείλε");
  await confirm(page, `[data-event="${eventId}"]`, "Ξαναδοκίμασε");

  // Η αγνοημένη αποστολή μένει στο Ιστορικό αποστολών.
  await page.goto("/app/settings/sends?channel=email");
  await expect(page.locator("tr", { hasText: ignored }).first()).toContainText(
    "αγνοήθηκε",
  );
});

test("οι Πωλήσεις δεν βλέπουν την Υγεία ούτε τη γραμμή της στο μενού", async ({
  page,
}) => {
  await signIn(page, "sales@example.com");
  await page.goto(PATH);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: TITLE })).toHaveCount(0);
});

test("η κάρτα Υγείας στο Σήμερα ανοίγει την Υγεία συστήματος", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await card(page, TITLE).getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/health$/);
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();
});
