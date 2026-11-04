import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { project, signIn } from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη: φίλτρα σε μαλακές κάρτες (παραλλαγή 2), στις Αποστολές. Ο Πελάτης «Πελάτης Αποστολών {project}»
// και η «Ελένη Αποστολών» έρχονται από το seed· ένα Μήνυμα της ομάδας και ο επεξεργαστής της ουράς γράφουν μία αποστολή.
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

// Σε στενή οθόνη η στήλη φίλτρων κρύβεται πίσω από το «Φίλτρα»· το κουμπί ζωντανεύει μόλις φορτώσει η σελίδα.
async function filtersSide(page: Page) {
  const side = page.getByRole("complementary", { name: "Φίλτρα" });
  if (project() !== "mobile") return side;
  await expect(async () => {
    if (!(await side.isVisible()))
      await page.getByRole("button", { name: /^Φίλτρα/ }).click();
    await expect(side).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return side;
}

test.beforeEach(async ({ context, page }) => {
  await useSpacesLook(context);
  await signIn(page, OWNER);
});

test("φίλτρα · στις Αποστολές ο Ιδιοκτήτης ψάχνει Πελάτη στην κάρτα «Πελάτης», τον διαλέγει και τον βγάζει με ✕", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const clientName = `Πελάτης Αποστολών ${project()}`;
  const clientId = await sendFor(clientName);

  await page.goto(SENDS_PATH);
  const side = await filtersSide(page);
  // Η Κατάσταση είναι η πρώτη κάρτα και ανοιχτή· οι άλλες κλειστές δείχνουν «όλοι/όλα».
  await expect(
    side.getByRole("link", { name: "Στάλθηκαν", exact: true }),
  ).toHaveAttribute("aria-current", "true");

  const group = side.locator("details").filter({
    has: page.locator("summary", { hasText: "Πελάτης" }),
  });
  await expect(group.locator("summary")).toContainText("όλοι");
  await group.locator("summary").click();
  await expect(group).toHaveAttribute("open", "");
  // Ανοίγει μία κάρτα κάθε φορά: η Κατάσταση κλείνει.
  await expect(side.locator("details[open]")).toHaveCount(1);

  const search = group.getByRole("searchbox", { name: "Αναζήτηση: Πελάτης" });
  const options = group.getByRole("link");
  // Η αναζήτηση φιλτράρει μόλις ζωντανέψει η σελίδα: μένουν το «όλοι» και ο Πελάτης.
  await expect(async () => {
    await search.fill(clientName);
    await expect(options).toHaveCount(2, { timeout: 1_000 });
  }).toPass();
  await options.filter({ hasText: clientName }).click();

  await expect(page).toHaveURL(new RegExp(`client=${clientId}`));
  const remove = page.getByRole("link", { name: "Βγάλε το φίλτρο Πελάτης" });
  await expect(remove.locator("..")).toContainText(`Πελάτης: ${clientName}`);
  await expect(
    page.getByRole("link", { name: "Καθαρισμός φίλτρων" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: "Ελένη Αποστολών" })
      .first(),
  ).toBeVisible();

  await remove.click();
  await expect(page).not.toHaveURL(/client=/);
  await expect(remove).toHaveCount(0);
});
