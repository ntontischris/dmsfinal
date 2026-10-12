import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { switchUser } from "./booking-parts";
import { project, signIn } from "./sales-parts";

// Ειδοποιήσεις (A2, #170) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Ειδοποιήσεων {project}» (Υπεύθυνος ο Ιδιοκτήτης) και ο
// Χρήστης πελάτη «notify.{project}@example.com» (Πλήρης) έρχονται από το seed. Σειριακά, χωρίς retries· τα δύο projects
// μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_EMAIL = (P: string): string => `notify.${P}@example.com`;
const NOTIFICATIONS_PATH = "/app/notifications";
const MESSAGES_PATH = "/app/messages";

// Το service role χρησιμεύει μόνο για να τρέξει ο επεξεργαστής της ουράς, όπως κάνει το cron κάθε λεπτού.
async function runEventsProcessor(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.rpc("events_process");
  if (error) throw error;
}

const bell = (page: Page) =>
  page.getByRole("button", { name: /^Ειδοποιήσεις:/ });

// Ο Ιδιοκτήτης ξεκινά χωρίς αδιάβαστες: ό,τι άφησαν τα άλλα τεστ σημειώνεται διαβασμένο.
async function startFromZero(page: Page): Promise<void> {
  await page.goto(NOTIFICATIONS_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ειδοποιήσεις" }),
  ).toBeVisible();
  const markAll = page.getByRole("button", { name: "Όλες διαβασμένες" });
  if (await markAll.isEnabled()) {
    await markAll.click();
    await expect(page.getByRole("status")).toContainText("διαβασμέν");
  }
  await expect(bell(page)).toHaveAccessibleName(
    "Ειδοποιήσεις: καμία αδιάβαστη",
  );
}

test("ο πελάτης γράφει, ο Ιδιοκτήτης βλέπει «1» στο καμπανάκι, ανοίγει την Ειδοποίηση και φτάνει στη Συνομιλία", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const question = `Ερώτηση για το καμπανάκι ${P}`;

  // 0. Ό,τι περίμενε στην ουρά επεξεργάζεται πρώτα· ο Ιδιοκτήτης ξεκινά από το μηδέν.
  await runEventsProcessor();
  await signIn(page, "owner@example.com");
  await startFromZero(page);

  // 1. Ο Χρήστης πελάτη στέλνει Μήνυμα.
  await switchUser(page, CLIENT_EMAIL(P));
  await page.goto(MESSAGES_PATH);
  const composer = page.getByRole("region", { name: "Νέο Μήνυμα" });
  await composer.getByLabel("Μήνυμα προς την ομάδα").fill(question);
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(
    "Το Μήνυμα στάλθηκε.",
  );

  // 2. Τρέχει ο επεξεργαστής (όπως το cron της ουράς).
  await runEventsProcessor();

  // 3. Ο Ιδιοκτήτης (Υπεύθυνος του Πελάτη) βλέπει «1» στο καμπανάκι.
  await switchUser(page, "owner@example.com");
  await expect(bell(page)).toHaveAccessibleName("Ειδοποιήσεις: 1 αδιάβαστη");
  await expect(bell(page)).toContainText("1");

  // 4. Ανοίγει το καμπανάκι και την Ειδοποίηση: καταλήγει στη Συνομιλία του Πελάτη.
  await bell(page).click();
  await expect(bell(page)).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: new RegExp(question) }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);
  await expect(page.locator("article", { hasText: question })).toBeVisible();

  // 5. Ο μετρητής μηδενίζει.
  await expect(bell(page)).toHaveAccessibleName(
    "Ειδοποιήσεις: καμία αδιάβαστη",
  );
});

test("η σελίδα Ειδοποιήσεων δείχνει κενή κατάσταση στις αδιάβαστες και τη διαβασμένη στις «Όλες»", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await startFromZero(page);
  await expect(
    page.getByRole("heading", { name: "Καμία Ειδοποίηση", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Οι Ειδοποιήσεις κρατιούνται 90 μέρες."),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Ποιες Ειδοποιήσεις" })
    .getByRole("link", { name: "Όλες", exact: true })
    .click();
  await expect(page).toHaveURL(/show=all/);
  await expect(
    page.getByRole("main").getByText(`Ερώτηση για το καμπανάκι ${P}`).first(),
  ).toBeVisible();
});
