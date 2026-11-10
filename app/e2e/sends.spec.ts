import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { card, project, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Ιστορικό αποστολών (K3, #174) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Αποστολών {project}» (Υπεύθυνος ο Ιδιοκτήτης) και ο
// Χρήστης πελάτη «Ελένη Αποστολών» (Πλήρης) έρχονται από το seed. Ένα Μήνυμα της ομάδας μπαίνει με service role και τρέχει
// ο επεξεργαστής της ουράς, όπως κάνει το cron κάθε λεπτού: η Ειδοποίηση «Νέο Μήνυμα» πάει στον πελάτη και γράφεται στο
// Ιστορικό. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const SENDS_PATH = "/app/settings/sends";

const filtersRow = (page: Page) =>
  page.getByRole("group", { name: "Φίλτρα", exact: true });

// Μια κάρτα φίλτρου ανοίγει με το summary της· ξαναδοκιμάζει ώσπου η σελίδα να ζωντανέψει.
async function openFilterCard(page: Page, label: string) {
  const card = filtersRow(page)
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: label }) });
  await expect(async () => {
    if ((await card.getAttribute("open")) === null)
      await card.locator("summary").click();
    await expect(card).toHaveAttribute("open", "", { timeout: 1_000 });
  }).toPass();
  return card;
}
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
    page
      .getByRole("navigation", { name: "Αυτοματισμοί και αποστολές" })
      .getByRole("link", { name: "Ιστορικό αποστολών" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    filtersRow(page)
      .locator("summary", { hasText: "Κατάσταση" })
      .locator(".kit-fb-chip"),
  ).toHaveText("Στάλθηκαν");

  // Φίλτρο Πελάτη: μόνο οι αποστολές του.
  const clientCard = await openFilterCard(page, "Πελάτης");
  await clientCard
    .getByRole("searchbox", { name: "Αναζήτηση: Πελάτης" })
    .fill(clientName);
  await clientCard.getByRole("link", { name: clientName }).click();
  await expect(page).toHaveURL(new RegExp(`client=${clientId}`));
  const row = page
    .locator("li.part-row")
    .filter({ hasText: RECIPIENT })
    .first();
  await expect(row).toContainText("Νέο Μήνυμα");
  await expect(row).toContainText("Ειδοποίηση");
  await expect(row).toContainText("στάλθηκε");
  await expect(page.getByRole("main")).not.toContainText(
    `Καλημέρα από την ομάδα ${P}`,
  );

  // «Τι στάλθηκε στον Πελάτη», στην καρτέλα «Επικοινωνία» του Πελάτη.
  await page.goto(`/app/clients/${clientId}`);
  await page
    .getByRole("navigation", { name: "Ενότητες Πελάτη" })
    .getByRole("link", { name: "Επικοινωνία" })
    .click();
  await expect(page).toHaveURL(/tab=comms/);
  const panel = card(page, "Τι στάλθηκε στον Πελάτη");
  await expect(panel).toBeVisible();
  await expect(
    panel.locator("li.part-row").filter({ hasText: RECIPIENT }).first(),
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
  await expect(page.locator("li.part-row")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ιστορικό αποστολών" }),
  ).toHaveCount(0);
});
