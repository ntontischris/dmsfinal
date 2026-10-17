import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { card, field, project, shot, signIn, tableRow } from "./sales-parts";

// N5 Ενσωματώσεις και συνδρομές (#209) από άκρη σε άκρη. Το CI δεν έχει κλειδιά παρόχων: με INTEGRATIONS_FAKE_PROVIDERS=1
// (workflow) οι τρεις συνδέσεις μετρούν ως στημένες και το «Έλεγχος τώρα» απαντά χωρίς καμία κλήση δικτύου.
// Τα δύο projects (desktop, mobile) μοιράζονται μία βάση και τρέχουν το ένα μετά το άλλο.
const PAGE = "/app/settings/integrations";

test.describe.configure({ retries: 0 });

// Το service role μόνο προετοιμάζει (καθαρίζει το όριο του ελέγχου, αδειάζει το μητρώο), ποτέ δεν κάνει το ίδιο το τεστ.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function clearCheck(connection: string) {
  const { error } = await serviceClient()
    .from("integration_checks")
    .delete()
    .eq("connection", connection);
  if (error) throw error;
}

async function clearSubscriptions() {
  const { error } = await serviceClient()
    .from("subscriptions")
    .delete()
    .not("id", "is", null);
  if (error) throw error;
}

const checkButton = (page: Page, title: string) =>
  card(page, title).getByRole("button", { name: "Έλεγχος τώρα" });

test("ο Ιδιοκτήτης βλέπει τις έξι κάρτες και κάνει «Έλεγχος τώρα» μία φορά το λεπτό", async ({
  page,
}) => {
  // Κάθε project ελέγχει δική του σύνδεση, ώστε το όριο του ενός λεπτού να μη μπλέκει τα δύο.
  const isDesktop = project() === "desktop";
  const title = isDesktop ? "Αποστολή email" : "AI (Βοηθός και αναζήτηση)";
  await clearCheck(isDesktop ? "email" : "ai");
  await signIn(page, "owner@example.com");
  await page.goto(PAGE);
  await expect(
    page.getByRole("heading", { name: "Ενσωματώσεις και συνδρομές" }),
  ).toBeVisible();
  for (const name of [
    "Google ημερολόγιο",
    "Αποστολή email",
    "AI (Βοηθός και αναζήτηση)",
    "Έλεγχος ανθρώπου",
    "Στατιστικά και διαφήμιση",
    "Καταγραφή σφαλμάτων",
  ])
    await expect(card(page, name)).toBeVisible();

  // Ό,τι μπαίνει με την Ιστοσελίδα: «δεν έχει στηθεί», τη στήνει ο developer, χωρίς έλεγχο.
  const turnstile = card(page, "Έλεγχος ανθρώπου");
  await expect(
    turnstile.getByText("δεν έχει στηθεί", { exact: true }),
  ).toBeVisible();
  await expect(turnstile.getByText("Τη στήνει ο developer")).toBeVisible();
  await expect(
    turnstile.getByRole("button", { name: "Έλεγχος τώρα" }),
  ).toHaveCount(0);
  // Τα μοντέλα AI, μόνο για ανάγνωση, και η χρήση απέναντι στο πλαφόν.
  const ai = card(page, "AI (Βοηθός και αναζήτηση)");
  await expect(ai.getByText("openai/gpt-4.1-mini")).toBeVisible();
  await expect(ai.getByRole("meter")).toBeVisible();
  await expect(card(page, "Αποστολή email").getByRole("meter")).toBeVisible();

  await checkButton(page, title).click();
  await expect(card(page, title).getByRole("status")).toContainText(
    "Η σύνδεση απαντά",
  );
  await expect(card(page, title).getByText(/απάντησε$/)).toBeVisible();
  await checkButton(page, title).click();
  await expect(card(page, title).getByRole("alert")).toContainText(
    "πριν από λιγότερο από ένα λεπτό",
  );
  await shot(page, "integrations-cards");
});

test("ο Ιδιοκτήτης αλλάζει GA4 και Meta Pixel με έλεγχο μορφής", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto(PAGE);
  const analytics = card(page, "Στατιστικά και διαφήμιση");
  const ga4 = field(analytics, "Google Analytics, Measurement ID");
  const pixel = field(analytics, "Meta Pixel ID");
  const save = analytics.getByRole("button", {
    name: "Αποθήκευση αναγνωριστικών",
  });

  await ga4.fill("UA-12345-1");
  await save.click();
  await expect(analytics.getByRole("alert")).toContainText("G-XXXXXXXXXX");

  await ga4.fill("g-e2e123abcd");
  await pixel.fill("12ab");
  await save.click();
  await expect(analytics.getByRole("alert")).toContainText("μόνο ψηφία");

  await pixel.fill("123456789012345");
  await save.click();
  await expect(analytics.getByRole("status")).toContainText("αποθηκεύτηκαν");
  await page.reload();
  await expect(
    field(
      card(page, "Στατιστικά και διαφήμιση"),
      "Google Analytics, Measurement ID",
    ),
  ).toHaveValue("G-E2E123ABCD");
  await expect(
    field(card(page, "Στατιστικά και διαφήμιση"), "Meta Pixel ID"),
  ).toHaveValue("123456789012345");
});

async function addSubscription(
  page: Page,
  values: { provider: string; cost: string; currency: string },
) {
  await card(page, "Συνδρομές")
    .getByRole("link", { name: "Νέα συνδρομή" })
    .click();
  const form = page.getByRole("region", { name: "Νέα συνδρομή" });
  await field(form, "Πάροχος").fill(values.provider);
  await field(form, "Πλάνο").fill("Pro");
  await field(form, "Μηνιαίο κόστος").fill(values.cost);
  await field(form, "Νόμισμα").fill(values.currency);
  await form.getByRole("button", { name: "Προσθήκη συνδρομής" }).click();
  await expect(form.getByRole("status")).toContainText("προστέθηκε");
  await expect(tableRow(page, values.provider)).toBeVisible();
}

test("ο Ιδιοκτήτης κρατά το μητρώο συνδρομών με σύνολα ανά νόμισμα", async ({
  page,
}) => {
  await clearSubscriptions();
  const P = project();
  await signIn(page, "owner@example.com");
  await page.goto(PAGE);
  await expect(
    card(page, "Συνδρομές").getByText("Δεν έχει καταγραφεί καμία συνδρομή"),
  ).toBeVisible();

  await addSubscription(page, {
    provider: `Domain ${P}`,
    cost: "10",
    currency: "eur",
  });
  await addSubscription(page, {
    provider: `Hosting ${P}`,
    cost: "20",
    currency: "USD",
  });
  await addSubscription(page, {
    provider: `Email ${P}`,
    cost: "5,50",
    currency: "USD",
  });

  const totals = card(page, "Συνδρομές").getByLabel("Σύνολα ανά νόμισμα");
  await expect(totals).toContainText("Σύνολο μηνιαίως σε EUR");
  await expect(totals).toContainText("10,00 EUR");
  await expect(totals).toContainText("25,50 USD");
  await expect(
    card(page, "Συνδρομές").getByText(
      "Τα νομίσματα δεν αθροίζονται μεταξύ τους.",
    ),
  ).toBeVisible();

  // Αλλαγή: το πλάνο άλλαξε στον πάροχο και καταγράφεται εδώ.
  await tableRow(page, `Email ${P}`)
    .getByRole("link", { name: `Επεξεργασία: Email ${P}` })
    .click();
  const edit = page.getByRole("region", { name: `Επεξεργασία: Email ${P}` });
  await field(edit, "Μηνιαίο κόστος").fill("4,50");
  await field(edit, "Πλάνο").fill("Free");
  await edit.getByRole("button", { name: "Αποθήκευση συνδρομής" }).click();
  await expect(edit.getByRole("status")).toContainText("αποθηκεύτηκε");
  await expect(totals).toContainText("24,50 USD");
  await expect(tableRow(page, `Email ${P}`)).toContainText("Free");
  await shot(page, "integrations-subscriptions");
});

test("η Διαχείριση δεν βλέπει τις Ενσωματώσεις και τις συνδρομές", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto(PAGE);
  await expect(
    page.getByText(
      "Τις Ενσωματώσεις και τις συνδρομές τις βλέπει μόνο ο Ιδιοκτήτης.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Έλεγχος τώρα" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { name: "Συνδρομές" })).toHaveCount(0);
});
