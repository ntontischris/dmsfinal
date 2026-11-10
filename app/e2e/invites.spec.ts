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


// Οι προσκλήσεις σε εκκρεμότητα και οι Χρήστες ομάδας της N1.
const pendingInvites = (page: Page) =>
  card(page, "Προσκλήσεις σε εκκρεμότητα").last();
const teamUsers = (page: Page) => card(page, "Χρήστες ομάδας").last();

// Σύνδεσμος της μπάρας των Χώρων ή του μενού προφίλ, και κλειστός: μετράμε τη διεύθυνση, όχι αν φαίνεται.
const linkTo = (page: Page, href: string) => page.locator(`a[href="${href}"]`);

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

// Ο προσκεκλημένος ανοίγει τον σύνδεσμο, ορίζει κωδικό και μπαίνει στο σύστημα (σε δική του συνεδρία, στους Χώρους).
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
  const form = page.locator("#n1-invite");
  await form.getByLabel("Ονοματεπώνυμο", { exact: true }).fill(name);
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByLabel("Ρόλος Πωλήσεις", { exact: true }).check();
  await form.getByRole("button", { name: "Αποστολή πρόσκλησης" }).click();
  await expect(form.getByRole("status")).toContainText("Η πρόσκληση στάλθηκε");
}

test("ο Ιδιοκτήτης προσκαλεί Χρήστη ομάδας, ο προσκεκλημένος μπαίνει και η πρόσκληση γίνεται Αποδεκτή", async ({
  page,
  browser,
}) => {
  const P = project();
  const email = `team.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await inviteTeamMember(page, email, `Χρήστης ${P}`);
  await expect(listItem(pendingInvites(page), email)).toContainText("εκκρεμεί");

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  await expect(linkTo(guest, "/app/clients")).not.toHaveCount(0);
  await context.close();

  // Αποδεκτή: φεύγει από τις εκκρεμείς και ο Χρήστης είναι ενεργός στην Ομάδα.
  await page.reload();
  await expect(listItem(pendingInvites(page), email)).toHaveCount(0);
  await expect(listItem(teamUsers(page), email)).toContainText("ενεργός");
});

test("η ακυρωμένη πρόσκληση δεν δίνει πρόσβαση", async ({ page, browser }) => {
  const P = project();
  const email = `cancel.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  await inviteTeamMember(page, email, `Ακύρωση ${P}`);
  await listItem(pendingInvites(page), email)
    .getByRole("button", { name: "Ακύρωση", exact: true })
    .click();
  // Το revalidation ξαναφορτώνει τη λίστα: ελέγχουμε τη λίστα, όχι το μήνυμα. Οι ακυρωμένες δεν μένουν σε αυτήν.
  await expect(listItem(pendingInvites(page), email)).toHaveCount(0);

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  await expect(linkTo(guest, "/app/team")).toHaveCount(0);
  await guest.goto("/app/team");
  await expect(
    guest.getByText("Την Ομάδα τη διαχειρίζονται όσοι έχουν"),
  ).toBeVisible();
  await context.close();
});

test("ο Ιδιοκτήτης προσκαλεί Χρήστη πελάτη και ο πελάτης βλέπει μόνο τον δικό του Πελάτη", async ({
  page,
  browser,
}) => {
  const P = project();
  // Όχι «Εσωτερική {project}»: αυτόν τον τίτλο τον ψάχνει το productions.spec.
  const internalTitle = `Κρυφή Παραγωγή ${P} ${Date.now()}`;
  await internalProduction(internalTitle);
  const clientId = await clientForOwner(`Πελάτης Πρόσβασης ${P} ${Date.now()}`);
  const email = `client.${P}.${Date.now()}@example.com`;
  await signIn(page, "owner@example.com");
  // Οι Χρήστες πελάτη είναι στην καρτέλα «users» της Σελίδας Πελάτη.
  await page.goto(`/app/clients/${clientId}?tab=users`);
  const invite = card(page, "Πρόσκληση Χρήστη πελάτη").last();
  await field(invite, "Ονοματεπώνυμο").fill(`Επαφή ${P}`);
  await field(invite, "Email").fill(email);
  await invite.getByRole("button", { name: "Αποστολή πρόσκλησης" }).click();
  await expect(invite.getByRole("status")).toContainText(
    "Η πρόσκληση στάλθηκε",
  );

  const context = await browser.newContext();
  const guest = await acceptInvite(context, email);
  // Οι Συνάδελφοι ζουν στο μενού προφίλ· Ομάδα και Πελάτες δεν υπάρχουν πουθενά για τον πελάτη.
  await expect(linkTo(guest, "/app/colleagues")).not.toHaveCount(0);
  await expect(linkTo(guest, "/app/team")).toHaveCount(0);
  await expect(linkTo(guest, "/app/clients")).toHaveCount(0);
  await guest.goto("/app/productions");
  await expect(
    guest
      .getByRole("navigation", { name: "Η δουλειά μου" })
      .getByRole("link", { name: "Παραγωγές" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(guest.getByText(internalTitle)).toHaveCount(0);
  await context.close();
});

// «Πότε» του Ιστορικού αποστολών: ώρα Ελλάδας, όπως τη γράφει το K3 («15:23» μπροστά, «12/10/2026» στη δεύτερη γραμμή).
const athensMinute = (time: number): RegExp => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("el-GR", {
      timeZone: "Europe/Athens",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(time))
      .map((part) => [part.type, part.value]),
  );
  return new RegExp(
    `${parts.hour}:${parts.minute}[\\s\\S]*${parts.day}/${parts.month}/${parts.year}`,
  );
};

// Μια γραμμή του Ιστορικού αποστολών (K3).
const sendRows = (page: Page) => page.locator("li.part-row");

test("ο Ιδιοκτήτης στέλνει δοκιμαστικό email και φαίνεται στο Ιστορικό", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/integrations");
  const clickedAt = Date.now();
  await page
    .getByRole("button", { name: "Δοκιμαστικό email στον εαυτό μου" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "μπήκε στην ουρά" }),
  ).toBeVisible();
  // Το Ιστορικό αποστολών (K3, #174): η γραμμή του δοκιμαστικού αυτού του λεπτού, ως «στάλθηκε». Οι ώρες δεν έχουν
  // ειδικούς χαρακτήρες regex.
  const minutes = [clickedAt - 60_000, clickedAt, clickedAt + 60_000].map(
    athensMinute,
  );
  const sentNow = sendRows(page)
    .filter({ hasText: "Δοκιμαστικό email" })
    .filter({ hasText: "owner@example.com" })
    .filter({ hasText: "στάλθηκε" })
    .filter({ hasText: new RegExp(minutes.map((m) => m.source).join("|")) });
  await expect
    .poll(
      async () => {
        await page.goto("/app/settings/sends?channel=email");
        return sentNow.count();
      },
      { timeout: 60_000, intervals: [2_000] },
    )
    .toBeGreaterThan(0);
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
  await page.goto("/app/settings/sends?channel=email");
  await expect(
    sendRows(page).filter({ hasText: email }).filter({ hasText: "στάλθηκε" }),
  ).toHaveCount(1);
});
