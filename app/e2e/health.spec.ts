import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { card, project, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Υγεία συστήματος (P2, #215) από άκρη σε άκρη. Οι αποτυχημένες αποστολές και το Γεγονός που κόλλησε μπαίνουν με service
// role (μόνο προετοιμασία), με το όνομα του project, γιατί τα δύο projects μοιράζονται μία βάση. Οι ενέργειες γίνονται
// από την οθόνη. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const PATH = "/app/health";
const TITLE = "Υγεία συστήματος";

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

// Η γραμμή μιας αποστολής ή ενός Γεγονότος, από το κείμενό της (όνομα παραλήπτη ή λόγος με το όνομα του project).
async function confirm(page: Page, text: string, label: string) {
  const item = page.locator("li.part-row", { hasText: text });
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
  const resent = `Υγεία Ξαναστείλε ${P}`;
  await failedSend(ignored);
  await failedSend(resent);
  await stuckEvent(P);

  await signIn(page, "owner@example.com");
  await page.goto(PATH);
  await expect(
    page.getByRole("navigation", { name: "Εταιρεία" }).getByRole("link", {
      name: "Υγεία",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("status", { name: "Σύνοψη Υγείας" }),
  ).toContainText(/θέλ(ει|ουν) προσοχή/);
  await expect(page.getByTestId("external-not-set-up")).toBeVisible();
  await expect(
    card(page, "Αποστολές που απέτυχαν").getByText("θέλει προσοχή").first(),
  ).toBeVisible();

  await confirm(page, ignored, "Αγνόησε");
  await confirm(page, resent, "Ξαναστείλε");
  await confirm(page, `Κόλλησε ${P}`, "Ξαναδοκίμασε");

  // Η αγνοημένη αποστολή μένει στο Ιστορικό αποστολών.
  await page.goto("/app/settings/sends?channel=email");
  await expect(
    page.locator("li.part-row", { hasText: ignored }).first(),
  ).toContainText("αγνοήθηκε");
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
  await expect(
    page.getByRole("link", { name: "Υγεία", exact: true }),
  ).toHaveCount(0);
});

test("η κάρτα Υγείας στο Σήμερα ανοίγει την Υγεία συστήματος", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.waitForLoadState("networkidle");
  // Με κάτι προς προσοχή η κάρτα στέκεται πάνω-πάνω· αλλιώς η Υγεία είναι μια γραμμή στο «Και άλλα».
  const alert = card(page, TITLE).getByRole("link", {
    name: new RegExp(`: ${TITLE}$`),
  });
  if ((await alert.count()) > 0) await alert.click();
  else {
    const more = page.locator("details.a1-others");
    await more.locator("summary").click();
    await more.getByRole("link", { name: TITLE, exact: true }).click();
  }
  await expect(page).toHaveURL(/\/app\/health$/);
  // Οι Χώροι δεν έχουν τίτλο h1 στη σελίδα· η Υγεία φαίνεται από την κάρτα του εξωτερικού ελέγχου, που υπάρχει πάντα.
  await expect(
    page.getByText("Εξωτερικός έλεγχος", { exact: true }),
  ).toBeVisible();
});
