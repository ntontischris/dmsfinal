import { createHmac } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { card, field, listItem, project, signIn } from "./sales-parts";

// Προσκλήσεις (N1, N2, N3), Χρήστες πελάτη, Ενσωματώσεις (O8) και Send Email Hook από άκρη σε άκρη. Φανταστικά στοιχεία.
// Οι προσκεκλημένοι μπαίνουν με σύνδεσμο επαναφοράς από το admin API (το email δεν διαβάζεται από τα Mailpit).
// Η συμμετοχή δίνεται μόνο όταν ο ίδιος μπαίνει (claim_invitation), γι' αυτό κάθε τεστ κάνει την είσοδο.
const NEW_PASSWORD = "e2e-new-password-456";

// Τα τεστ γράφουν στην ίδια βάση· μια επανάληψη θα έβρισκε μισοαλλαγμένα δεδομένα.
test.describe.configure({ retries: 0 });

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function recoveryHash(email: string): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const hash = data.properties?.hashed_token;
  if (error || !hash) throw new Error("Δεν βγήκε σύνδεσμος για το τεστ");
  return hash;
}

// Ο προσκεκλημένος ανοίγει τον σύνδεσμο, ορίζει κωδικό και μπαίνει στο σύστημα (σε δική του συνεδρία).
async function acceptInvite(
  context: BrowserContext,
  email: string,
): Promise<Page> {
  const guest = await context.newPage();
  await guest.goto(
    `/auth/confirm?token_hash=${encodeURIComponent(await recoveryHash(email))}&type=recovery`,
  );
  await expect(guest).toHaveURL(/\/auth\/set-password/);
  await field(guest, "Νέος κωδικός").fill(NEW_PASSWORD);
  await field(guest, "Ξανά ο κωδικός").fill(NEW_PASSWORD);
  await guest.getByRole("button", { name: "Αποθήκευση και είσοδος" }).click();
  await expect(guest).toHaveURL(/\/app$/);
  return guest;
}

async function ownerId(): Promise<string> {
  const { data, error } = await serviceClient()
    .from("team_users")
    .select("user_id")
    .eq("email", "owner@example.com")
    .single();
  if (error || !data) throw new Error("Ο Ιδιοκτήτης του τεστ λείπει");
  return String(data.user_id);
}

async function clientForOwner(name: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("clients")
    .insert({
      name,
      city: "Αθήνα",
      contact_name: "Επαφή",
      contact_email: `${Date.now()}@example.com`,
      contact_phone: "",
      manager_id: await ownerId(),
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(
      `Ο Πελάτης του τεστ δεν φτιάχτηκε: ${error?.message ?? ""}`,
    );
  return String(data.id);
}

// Μια Εσωτερική Παραγωγή (χωρίς Πελάτη): ο Πελάτης δεν πρέπει να τη δει ποτέ.
async function internalProduction(title: string): Promise<void> {
  const { error } = await serviceClient()
    .from("productions")
    .insert({ title, owner_id: await ownerId() });
  if (error)
    throw new Error(`Η Παραγωγή του τεστ δεν φτιάχτηκε: ${error.message}`);
}

async function inviteTeamMember(
  page: Page,
  email: string,
  name: string,
): Promise<void> {
  await page.goto("/app/team");
  await field(page, "Ονοματεπώνυμο").fill(name);
  await field(page, "Email").fill(email);
  await page.getByLabel("Πωλήσεις", { exact: true }).check();
  await page.getByRole("button", { name: "Πρόσκληση", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Η πρόσκληση στάλθηκε");
}

test("ο Ιδιοκτήτης προσκαλεί Χρήστη ομάδας, ο προσκεκλημένος μπαίνει και η πρόσκληση γίνεται Αποδεκτή", async ({
  page,
  browser,
}) => {
  const P = project();
  const email = `team.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await inviteTeamMember(page, email, `Χρήστης ${P}`);
  await expect(listItem(page, email)).toContainText("Εκκρεμεί");

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  await expect(
    guest
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: /Πελάτες/ }),
  ).toBeVisible();
  await context.close();

  await page.reload();
  await expect(listItem(page, email)).toContainText("Αποδεκτή");
});

test("η ακυρωμένη πρόσκληση δεν δίνει πρόσβαση", async ({ page, browser }) => {
  const P = project();
  const email = `cancel.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await inviteTeamMember(page, email, `Ακύρωση ${P}`);
  await listItem(page, email)
    .getByRole("button", { name: "Ακύρωση", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Η πρόσκληση ακυρώθηκε");

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  await expect(
    guest
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: /Ομάδα/ }),
  ).toHaveCount(0);
  await guest.goto("/app/team");
  await expect(guest.getByText("Την Ομάδα τη βλέπει όποιος")).toBeVisible();
  await context.close();
});

test("ο Ιδιοκτήτης προσκαλεί Χρήστη πελάτη και ο πελάτης βλέπει μόνο τον δικό του Πελάτη", async ({
  page,
  browser,
}) => {
  const P = project();
  const internalTitle = `Εσωτερική ${P} ${Date.now()}`;
  await internalProduction(internalTitle);
  const clientId = await clientForOwner(`Πελάτης Πρόσβασης ${P} ${Date.now()}`);
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
  await guest.goto("/app/productions");
  await expect(guest.getByRole("heading", { name: "Παραγωγές" })).toBeVisible();
  await expect(guest.getByText(internalTitle)).toHaveCount(0);
  await context.close();
});

test("ο Ιδιοκτήτης στέλνει δοκιμαστικό email και φαίνεται στο Ιστορικό", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/integrations");
  const sentRows = () =>
    listItem(page, "owner@example.com").filter({ hasText: "στάλθηκε" });
  const before = await sentRows().count();
  await page
    .getByRole("button", { name: "Δοκιμαστικό email στον εαυτό μου" })
    .click();
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

// Το πραγματικό Send Email Hook: υπογεγραμμένο αίτημα όπως της Supabase, και η γραμμή στο Ιστορικό.
// Το μυστικό του CI είναι φανταστικό (σχόλιο στο workflow)· στην παραγωγή είναι το δικό του.
test("το Send Email Hook στέλνει την πρόσκληση και το Ιστορικό το δείχνει ως στάλθηκε", async ({
  page,
  request,
}) => {
  const P = project();
  const email = `hook.${P}.${Date.now()}@example.com`;
  const { data, error } = await serviceClient().auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { name: `Hook ${P}`, locale: "el" } },
  });
  const tokenHash = data.properties?.hashed_token;
  if (error || !tokenHash)
    throw new Error("Δεν βγήκε token για το τεστ του hook");

  const body = JSON.stringify({
    user: { email, user_metadata: { name: `Hook ${P}`, locale: "el" } },
    email_data: {
      token_hash: tokenHash,
      email_action_type: "invite",
      redirect_to: "",
      site_url: "http://localhost:3000",
    },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const id = `msg_${Date.now()}`;
  const key = Buffer.from(
    (process.env.SEND_EMAIL_HOOK_SECRET ?? "").split("whsec_")[1] ?? "",
    "base64",
  );
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const response = await request.post("/api/hooks/send-email", {
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    data: body,
  });
  expect(response.status()).toBe(200);

  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/integrations");
  await expect(
    listItem(page, email).filter({ hasText: "στάλθηκε" }),
  ).toHaveCount(1);
});
