import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { clientName, opportunityTitle, signedMonthlyAgreement, visit } from "./filming-parts";
import { inContext, project, shot, signIn } from "./sales-parts";

// Προς τιμολόγηση (I1) από άκρη σε άκρη. Η Συμφωνία γράφεται από τις οθόνες· το cron της ουράς δεν τρέχει μέσα στο e2e,
// οπότε η γεννήτρια καλείται εδώ με το service role, όπως θα την καλούσε το cron. Σειριακά και χωρίς retries.
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

// Η υπογραφή εκτός συστήματος δηλώνει τον τρέχοντα μήνα «τιμολογημένο» και Περίοδοι πριν από τον μήνα καταγραφής δεν
// χρεώνονται. Η καταγραφή «πάει» έναν μήνα πίσω, ώστε η Περίοδος του προηγούμενου μήνα να γεννήσει Τιμολογητέο.
async function backdateSignature(P: string): Promise<void> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("agreements")
    .select("id, opportunities!inner(title)")
    .eq("opportunities.title", opportunityTitle(P))
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  const monthAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const { error: updateError } = await admin
    .from("agreement_signatures")
    .update({ recorded_at: monthAgo })
    .eq("agreement_id", data.id);
  if (updateError) throw updateError;
}

async function runBillablesGenerator(): Promise<void> {
  const { error } = await serviceClient().rpc("billables_generate");
  if (error) throw error;
}

test("ο Ιδιοκτήτης βλέπει το Τιμολογητέο της υπογεγραμμένης μηνιαίας Συμφωνίας στο «Προς τιμολόγηση»", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await signedMonthlyAgreement(page, browser, P);
  await backdateSignature(P);
  await runBillablesGenerator();

  await inContext(browser, "owner@example.com", async (owner) => {
    await visit(owner, TO_INVOICE_PATH);
    await expect(
      owner.getByRole("heading", { level: 1, name: "Προς τιμολόγηση" }),
    ).toBeVisible();
    await expect(
      owner.getByText(NOT_A_DEBT_TEXT, { exact: false }),
    ).toBeVisible();
    await expect(
      owner.getByText(clientName(P), { exact: true }).first(),
    ).toBeVisible();
    await shot(owner, "i1-owner");
  });
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
