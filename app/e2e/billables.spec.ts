import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { signOutsideSystem } from "./agreements-flows-parts";
import { visit } from "./filming-parts";
import { project, shot, signIn } from "./sales-parts";

// Προς τιμολόγηση (I1) από άκρη σε άκρη. Δικός του Πελάτης και Ευκαιρία (service role), ώστε να μην αγγίζει τα δεδομένα
// άλλων specs. Η Συμφωνία γράφεται από τις οθόνες· το cron της ουράς δεν τρέχει μέσα στο e2e, οπότε η γεννήτρια
// καλείται εδώ με το service role, όπως θα την καλούσε το cron. Σειριακά και χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const TO_INVOICE_PATH = "/app/finance/to-invoice";
const TO_INVOICE_LINK = /Προς τιμολόγηση$/;
const NO_ACCESS_TEXT = "Το «Προς τιμολόγηση» το βλέπουν μόνο όσοι";
const NOT_A_DEBT_TEXT = "Τα Τιμολογητέα δεν είναι οφειλή";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function idOf(table: string, column: string, value: string): Promise<string> {
  const { data, error } = await serviceClient().from(table).select("id").eq(column, value).single();
  if (error) throw error;
  return data.id as string;
}

// Πελάτης και Ευκαιρία σε στάδιο «Πρόταση», με μοναδικά ονόματα ανά project και στιγμή.
async function seedOpportunity(clientName: string, title: string): Promise<void> {
  const admin = serviceClient();
  const { data: owner, error: ownerError } = await admin
    .from("team_users").select("user_id").eq("email", "owner@example.com").single();
  if (ownerError) throw ownerError;
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      name: clientName,
      city: "Αθήνα",
      contact_name: "Μαρία Παπαδάκη",
      contact_email: `billables-${Date.now()}@example.com`,
      contact_phone: "",
      manager_id: owner.user_id,
    })
    .select("id")
    .single();
  if (clientError) throw clientError;
  const { error } = await admin.from("opportunities").insert({
    client_id: client.id,
    manager_id: owner.user_id,
    stage_id: await idOf("sales_stages", "code", "proposal"),
    source_id: await idOf("sales_sources", "code", "phone"),
    title,
    next_step: "Πρόταση",
    next_step_due: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
  });
  if (error) throw error;
}

async function runBillablesGenerator(): Promise<void> {
  const { error } = await serviceClient().rpc("billables_generate");
  if (error) throw error;
}

test("ο Ιδιοκτήτης βλέπει το Τιμολογητέο της υπογεγραμμένης μηνιαίας Συμφωνίας στο «Προς τιμολόγηση»", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const stamp = Date.now().toString(36);
  const clientName = `Πελάτης Τιμολογητέων ${P} ${stamp}`;
  const title = `Τιμολογητέα ${P} ${stamp}`;
  await seedOpportunity(clientName, title);

  // Έναρξη τον προηγούμενο μήνα, ο τρέχων ΔΕΝ τιμολογήθηκε εκτός: η Περίοδος του τρέχοντος μήνα γεννά Τιμολογητέο.
  await signIn(page, "owner@example.com");
  await draftProposal(page, { title, kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await signOutsideSystem(page, P, { invoiced: false });
  await runBillablesGenerator();

  await visit(page, TO_INVOICE_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Προς τιμολόγηση" })).toBeVisible();
  await expect(page.getByText(NOT_A_DEBT_TEXT, { exact: false })).toBeVisible();
  await expect(page.getByText(clientName, { exact: true }).first()).toBeVisible();
  await shot(page, "i1-owner");
});

test("οι Πωλήσεις δεν βλέπουν το «Προς τιμολόγηση»", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: TO_INVOICE_LINK }),
  ).toHaveCount(0);

  await visit(page, TO_INVOICE_PATH);
  await expect(page.getByText(NO_ACCESS_TEXT, { exact: false })).toBeVisible();
});
