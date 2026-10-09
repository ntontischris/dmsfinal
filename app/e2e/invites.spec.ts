import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { card, field, listItem, project, signIn } from "./sales-parts";

// Προσκλήσεις (N1, N2, N3), Χρήστες πελάτη και Ενσωματώσεις (O8) από άκρη σε άκρη. Φανταστικά στοιχεία.
// Οι προσκεκλημένοι μπαίνουν με σύνδεσμο επαναφοράς από το admin API (η πρόσκληση ξεκινά από το σύστημα·
// το email δεν διαβάζεται από τα Mailpit). Ο σύνδεσμος επαναφοράς οδηγεί στο set-password, όπως η πρόσκληση.
const NEW_PASSWORD = "e2e-new-password-456";

// Τα τεστ γράφουν στην ίδια βάση· μια επανάληψη θα έβρισκε μισοαλλαγμένα δεδομένα.
test.describe.configure({ retries: 0 });

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function recoveryPath(email: string): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.generateLink({ type: "recovery", email });
  const hash = data.properties?.hashed_token;
  if (error || !hash) throw new Error("Δεν βγήκε σύνδεσμος για το τεστ");
  return `/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=recovery`;
}

// Ο προσκεκλημένος ανοίγει τον σύνδεσμο, ορίζει κωδικό και μπαίνει στο σύστημα (σε δική του συνεδρία).
async function acceptInvite(context: BrowserContext, email: string): Promise<Page> {
  const guest = await context.newPage();
  await guest.goto(await recoveryPath(email));
  await expect(guest).toHaveURL(/\/auth\/set-password/);
  await field(guest, "Νέος κωδικός").fill(NEW_PASSWORD);
  await field(guest, "Ξανά ο κωδικός").fill(NEW_PASSWORD);
  await guest.getByRole("button", { name: "Αποθήκευση και είσοδος" }).click();
  await expect(guest).toHaveURL(/\/app$/);
  return guest;
}

async function clientForOwner(name: string): Promise<string> {
  const admin = serviceClient();
  const { data: owner, error: ownerError } = await admin
    .from("team_users")
    .select("user_id")
    .eq("email", "owner@example.com")
    .single();
  if (ownerError || !owner) throw new Error("Ο Ιδιοκτήτης του τεστ λείπει");
  const { data, error } = await admin
    .from("clients")
    .insert({ name, city: "Αθήνα", contact_name: "Επαφή", contact_email: `${name.length}.${Date.now()}@example.com`, contact_phone: "", manager_id: owner.user_id })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Ο Πελάτης του τεστ δεν φτιάχτηκε: ${error?.message ?? ""}`);
  return String(data.id);
}

test("ο Ιδιοκτήτης προσκαλεί Χρήστη ομάδας, ο προσκεκλημένος μπαίνει και η πρόσκληση γίνεται Αποδεκτή", async ({
  page,
  browser,
}) => {
  const P = project();
  const email = `team.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await page.goto("/app/team");
  await field(page, "Ονοματεπώνυμο").fill(`Χρήστης ${P}`);
  await field(page, "Email").fill(email);
  await page.getByLabel("Πωλήσεις", { exact: true }).check();
  await page.getByRole("button", { name: "Πρόσκληση", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Η πρόσκληση στάλθηκε");
  await expect(listItem(page, email)).toContainText("Εκκρεμεί");

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  await expect(guest.getByRole("navigation", { name: "Οθόνες" }).getByRole("link", { name: /Πελάτες/ })).toBeVisible();
  await context.close();

  await page.reload();
  await expect(listItem(page, email)).toContainText("Αποδεκτή");
});

test("ο Ιδιοκτήτης προσκαλεί Χρήστη πελάτη και ο πελάτης βλέπει μόνο τον δικό του Πελάτη", async ({
  page,
  browser,
}) => {
  const P = project();
  const clientName = `Πελάτης Πρόσβασης ${P} ${Date.now()}`;
  const clientId = await clientForOwner(clientName);
  const email = `client.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await page.goto(`/app/clients/${clientId}`);
  const invite = card(page, "Πρόσκληση Χρήστη πελάτη");
  await field(invite, "Ονοματεπώνυμο").fill(`Επαφή ${P}`);
  await field(invite, "Email").fill(email);
  await invite.getByRole("button", { name: "Πρόσκληση Χρήστη πελάτη" }).click();
  await expect(page.getByRole("status")).toContainText("Η πρόσκληση στάλθηκε");

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  const nav = guest.getByRole("navigation", { name: "Οθόνες" });
  // Τα ονόματα των συνδέσμων περιέχουν και τον κωδικό της οθόνης («N3 Συνάδελφοι»)· γι' αυτό ταιριάζουμε με regex.
  await expect(nav.getByRole("link", { name: /Συνάδελφοι/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Ομάδα/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /Πελάτες/ })).toHaveCount(0);
  await context.close();
});

test("ο Ιδιοκτήτης στέλνει δοκιμαστικό email και φαίνεται στο Ιστορικό", async ({ page }) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/integrations");
  const sentRows = () => listItem(page, "owner@example.com").filter({ hasText: "στάλθηκε" });
  const before = await sentRows().count();
  await page.getByRole("button", { name: "Δοκιμαστικό email στον εαυτό μου" }).click();
  await expect(page.getByRole("status")).toContainText("μπήκε στην ουρά");
  await expect
    .poll(
      async () => {
        await page.reload();
        return sentRows().count();
      },
      { timeout: 60_000, intervals: [2_000] },
    )
    .toBeGreaterThan(before);
});
