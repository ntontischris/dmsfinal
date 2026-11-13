import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { signOutsideSystem } from "./agreements-flows-parts";
import { control, panel } from "./catalogue-parts";
import { button, inContext, project, shot } from "./sales-parts";

// Λήξη και συνέχεια μιας υπογεγραμμένης μηνιαίας Συμφωνίας (b8, b9, b12): υπογεγραμμένο αρχείο, «Χωρίς συνέχιση»,
// Λύση με ακύρωση και ανανέωση τώρα. Δικός του Πελάτης και Ευκαιρία (service role), ώστε να μην αγγίζει άλλα specs.
test.describe.configure({ mode: "serial", retries: 0 });

const LIFECYCLE = "Λήξη και συνέχεια";
const DAY_MS = 86_400_000;

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

const daysFromToday = (days: number): string =>
  new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

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
      contact_email: `lifecycle-${Date.now()}@example.com`,
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
    next_step_due: daysFromToday(3),
  });
  if (error) throw error;
}

async function openToggle(scope: Locator, label: string, opened: string) {
  await button(scope, label).click();
  await expect(control(scope, opened)).toBeVisible();
}

async function uploadSignedFile(owner: Page, scope: Locator) {
  await openToggle(scope, "Ανέβασμα υπογεγραμμένου", "Υπογεγραμμένο αρχείο");
  await control(scope, "Υπογεγραμμένο αρχείο").setInputFiles("e2e/fixtures/sample-invoice.pdf");
  await button(scope, "Ανέβασμα").click();
  await expect(owner.getByText("Το υπογεγραμμένο αρχείο αποθηκεύτηκε.")).toBeVisible();
  await expect(scope.getByRole("link", { name: "sample-invoice.pdf" })).toBeVisible();
  await expect(button(scope, "Αντικατάσταση αρχείου")).toBeVisible();
}

async function stopAndResume(owner: Page, scope: Locator) {
  await openToggle(scope, "Χωρίς συνέχιση", "Σημείωση (προαιρετικό)");
  await control(scope, "Σημείωση (προαιρετικό)").fill("Ο πελάτης κλείνει τη χρονιά");
  await button(scope, "Δεν συνεχίζει μετά τη Λήξη").click();
  await expect(scope.getByText(/Χωρίς συνέχιση: τελειώνει στη Λήξη · Ο πελάτης κλείνει τη χρονιά/)).toBeVisible();
  await button(scope, "Συνεχίζει κανονικά").click();
  await expect(owner.getByText("Η Συμφωνία συνεχίζει ξανά μετά τη Λήξη.")).toBeVisible();
  await expect(scope.getByText(/Χωρίς συνέχιση: τελειώνει/)).toHaveCount(0);
}

async function dissolveAndCancel(owner: Page, scope: Locator) {
  await openToggle(scope, "Λύση", "Ημερομηνία Λύσης");
  await control(scope, "Ημερομηνία Λύσης").fill(daysFromToday(7));
  await control(scope, "Λόγος Λύσης").fill("Αλλαγή στρατηγικής");
  await button(scope, "Καταχώριση Λύσης").click();
  await expect(scope.getByText(/Λύση στις .* · Αλλαγή στρατηγικής/)).toBeVisible();
  await shot(owner, "d2-lifecycle-dissolved");
  await button(scope, "Ακύρωση Λύσης").click();
  await expect(owner.getByText("Η Λύση ακυρώθηκε· η Συμφωνία συνεχίζει κανονικά.")).toBeVisible();
  await expect(scope.getByText(/Λύση στις/)).toHaveCount(0);
}

test("ο Ιδιοκτήτης ανεβάζει το υπογεγραμμένο, σταματά και ξαναδίνει συνέχεια, καταχωρίζει και ακυρώνει Λύση και ανανεώνει", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const P = project();
  const stamp = Date.now().toString(36);
  const title = `Κύκλος Συμφωνίας ${P} ${stamp}`;
  await seedOpportunity(`Πελάτης Κύκλου ${P} ${stamp}`, title);

  await inContext(browser, "owner@example.com", async (owner) => {
    await draftProposal(owner, { title, kind: "μηνιαία" });
    await addCatalogueLine(owner, `Μηνιαία Παρουσία ${P}`);
    await signOutsideSystem(owner, P, { invoiced: false });

    const scope = panel(owner, LIFECYCLE);
    await expect(scope).toBeVisible();
    await uploadSignedFile(owner, scope);
    await stopAndResume(owner, scope);
    await dissolveAndCancel(owner, scope);

    await button(scope, "Ανανέωση τώρα").click();
    await expect(owner.getByText("Άνοιξε Ευκαιρία ανανέωσης με νέα πρόταση στις τρέχουσες τιμές.")).toBeVisible();
    await expect(scope.getByText("Ευκαιρία ανανέωσης:")).toBeVisible();
    await expect(scope.getByRole("link", { name: "Νέα πρόταση" })).toBeVisible();
    await expect(button(scope, "Ανανέωση τώρα")).toHaveCount(0);
    await shot(owner, "d2-lifecycle");
  });
});
