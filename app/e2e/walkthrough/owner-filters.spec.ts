import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { project, signIn } from "../sales-parts";

// Περιήγηση Ιδιοκτήτη: φίλτρα σε κάρτες σε μία σειρά πάνω από τα αποτελέσματα (παραλλαγή 1, 2026-11-04). Στις Αποστολές
// ο Πελάτης «Πελάτης Αποστολών {project}» και η «Ελένη Αποστολών» έρχονται από το seed· ένα Μήνυμα της ομάδας και ο
// επεξεργαστής της ουράς γράφουν μία αποστολή. Στους Πελάτες ο πίνακας κρατά όλο το πλάτος.
const OWNER = "owner@example.com";
const SENDS_PATH = "/app/settings/sends";

test.describe.configure({ mode: "serial" });

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function clientIdOf(
  admin: SupabaseClient,
  name: string,
): Promise<string> {
  const { data, error } = await admin
    .from("clients")
    .select("id")
    .eq("name", name)
    .single();
  if (error) throw error;
  return String(data.id);
}

async function ownerIdOf(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from("team_users")
    .select("user_id")
    .eq("email", OWNER)
    .single();
  if (error) throw error;
  return String(data.user_id);
}

// Μία αποστολή για τον Πελάτη, ώστε να είναι στη λίστα «Πελάτης» των Αποστολών.
async function sendFor(clientName: string): Promise<string> {
  const admin = adminClient();
  const clientId = await clientIdOf(admin, clientName);
  const ownerId = await ownerIdOf(admin);
  const { error } = await admin.from("messages").insert({
    client_id: clientId,
    author_id: ownerId,
    author_kind: "team",
    body: `Φίλτρα σε κάρτες ${project()}`,
  });
  if (error) throw error;
  const { error: processError } = await admin.rpc("events_process");
  if (processError) throw processError;
  return clientId;
}

// Μία κάρτα της σειράς «Φίλτρα», με την ετικέτα της.
function cardOf(page: Page, label: string) {
  return page
    .getByRole("group", { name: "Φίλτρα", exact: true })
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: label }) });
}

test.beforeEach(async ({ page }) => {
  await signIn(page, OWNER);
});

test("φίλτρα · στις Αποστολές ο Ιδιοκτήτης ανοίγει την κάρτα «Πελάτης», ψάχνει, διαλέγει και καθαρίζει", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const clientName = `Πελάτης Αποστολών ${project()}`;
  const clientId = await sendFor(clientName);

  await page.goto(SENDS_PATH);
  // Κλειστές κάρτες με την τρέχουσα τιμή: η Κατάσταση στα «Στάλθηκαν», ο Πελάτης στο «όλοι».
  const status = cardOf(page, "Κατάσταση");
  const client = cardOf(page, "Πελάτης");
  await expect(status.locator("summary")).toContainText("Στάλθηκαν");
  await expect(client.locator("summary")).toContainText("όλοι");
  await expect(
    page.getByRole("link", { name: "Καθαρισμός φίλτρων" }),
  ).toHaveCount(0);

  // Ανοίγει μία κάρτα κάθε φορά, και κλείνει με Escape (μόλις ζωντανέψει η σελίδα).
  await status.locator("summary").click();
  await expect(status).toHaveAttribute("open", "");
  await client.locator("summary").click();
  await expect(client).toHaveAttribute("open", "");
  await expect(status).not.toHaveAttribute("open", "");
  await expect(async () => {
    if ((await client.getAttribute("open")) === null)
      await client.locator("summary").click();
    await page.keyboard.press("Escape");
    await expect(client).not.toHaveAttribute("open", "", { timeout: 1_000 });
  }).toPass();

  await client.locator("summary").click();
  const search = client.getByRole("searchbox", { name: "Αναζήτηση: Πελάτης" });
  const options = client.getByRole("link");
  // Η αναζήτηση φιλτράρει: μένουν το «όλοι» και ο Πελάτης.
  await expect(async () => {
    await search.fill(clientName);
    await expect(options).toHaveCount(2, { timeout: 1_000 });
  }).toPass();
  await options.filter({ hasText: clientName }).click();

  await expect(page).toHaveURL(new RegExp(`client=${clientId}`));
  // Η κάρτα κλείνει και δείχνει τον Πελάτη στην ετικέτα της.
  await expect(client).not.toHaveAttribute("open", "");
  await expect(client.locator("summary")).toContainText(clientName);
  await expect(
    page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: "Ελένη Αποστολών" })
      .first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Καθαρισμός φίλτρων" }).click();
  await expect(page).not.toHaveURL(/client=/);
  await expect(client.locator("summary")).toContainText("όλοι");
  await expect(
    page.getByRole("link", { name: "Καθαρισμός φίλτρων" }),
  ).toHaveCount(0);
});

test("φίλτρα · στους Πελάτες η σειρά φίλτρων είναι πάνω από τον πίνακα και ο πίνακας κρατά όλο το πλάτος", async ({
  page,
}) => {
  await page.goto("/app/clients");
  const search = page.getByRole("searchbox", { name: "Αναζήτηση πελάτη" });
  const table = page.locator("table.b1-table");
  await expect(table).toBeVisible();
  const searchBox = await search.boundingBox();
  const tableBox = await table.boundingBox();
  if (!searchBox || !tableBox) throw new Error("Λείπει η αναζήτηση ή ο πίνακας");
  // Η σειρά είναι πάνω από τον πίνακα, όχι στήλη δίπλα του: ίδια αριστερή άκρη.
  expect(Math.abs(tableBox.x - searchBox.x)).toBeLessThan(4);
  expect(tableBox.y).toBeGreaterThan(searchBox.y + searchBox.height);
  if (project() === "mobile") return;
  // Σε φαρδιά οθόνη οι κάρτες ξεκινούν στη σειρά της αναζήτησης· κάθε στήλη είναι φίλτρο (b1), οπότε
  // όσες δεν χωρούν πάνε από κάτω, πάντα πάνω από τον πίνακα.
  const tops = await page
    .getByRole("group", { name: "Φίλτρα", exact: true })
    .locator("summary")
    .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  expect(tops.length).toBeGreaterThanOrEqual(3);
  expect(Math.abs(tops[0]! - searchBox.y)).toBeLessThan(searchBox.height);
  for (const top of tops) expect(top).toBeLessThan(tableBox.y);
});
