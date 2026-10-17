import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";

import { field, listItem, signIn } from "./sales-parts";
import { serviceClient, teamUser, unique, uniqueEmail } from "./team-parts";

// Ομάδα Νβ (#208): Αιτήματα GDPR. Καταγραφή, προθεσμία και κλείσιμο, εξαγωγή Πελάτη (περιεχόμενα του ZIP),
// ανωνυμοποίηση με πληκτρολόγηση ονόματος, άρνηση για τη Διαχείριση. Φανταστικά στοιχεία· τα δεδομένα στήνονται με το
// service role, κάθε ενέργεια που ελέγχεται γίνεται από την οθόνη. Οι κανόνες ελέγχονται στο gdpr_test.sql.

// Τα τεστ γράφουν στην ίδια βάση· μια επανάληψη θα έβρισκε μισοαλλαγμένα δεδομένα.
test.describe.configure({ retries: 0 });

const PASSWORD = "e2e-password-123";
const GDPR = "/app/team/gdpr";

async function must<T>(
  label: string,
  run: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await run;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const idOf = (row: unknown): string =>
  z.object({ id: z.string() }).parse(row).id;

async function seedClient(name: string): Promise<string> {
  const row = await must(
    "Πελάτης",
    serviceClient()
      .from("clients")
      .insert({
        name,
        city: "Αθήνα",
        contact_name: unique("Επαφή"),
        contact_email: uniqueEmail("gdpr-contact"),
      })
      .select("id")
      .single(),
  );
  return idOf(row);
}

async function ownerId(): Promise<string> {
  const row = await must(
    "Ιδιοκτήτης",
    serviceClient()
      .from("team_users")
      .select("user_id")
      .eq("email", "owner@example.com")
      .single(),
  );
  return z.object({ user_id: z.string() }).parse(row).user_id;
}

// Ένα δημόσιο κι ένα Εσωτερικό Μήνυμα του Ιδιοκτήτη στη Συνομιλία του Πελάτη.
async function seedMessages(
  clientId: string,
  publicBody: string,
  internalBody: string,
): Promise<void> {
  const author = await ownerId();
  await must(
    "Μηνύματα",
    serviceClient()
      .from("messages")
      .insert([
        {
          client_id: clientId,
          author_id: author,
          author_kind: "team",
          body: publicBody,
          is_internal: false,
        },
        {
          client_id: clientId,
          author_id: author,
          author_kind: "team",
          body: internalBody,
          is_internal: true,
        },
      ]),
  );
}

// Το πάνελ με τον τίτλο του: το πλησιέστερο section πάνω από την κεφαλίδα.
const panelOf = (page: Page, title: string) =>
  page
    .getByRole("heading", { name: title, exact: true })
    .locator("xpath=ancestor::section[1]");

const gdprPanel = (page: Page) => panelOf(page, "GDPR · μόνο ο Ιδιοκτήτης");

test("ο Ιδιοκτήτης καταγράφει αίτημα, βλέπει την προθεσμία και στο Σήμερα, και το κλείνει", async ({
  page,
}) => {
  const clientName = unique("Πελάτης GDPR");
  await seedClient(clientName);

  await signIn(page, "owner@example.com");
  await page.goto(GDPR);
  await expect(
    page.getByRole("heading", { level: 1, name: "Αιτήματα GDPR" }),
  ).toBeVisible();
  await field(page, "Είδος").selectOption("export");
  await field(page, "Ποιον αφορά").selectOption({
    label: `Πελάτης: ${clientName}`,
  });
  await page.getByRole("button", { name: "Καταγραφή αιτήματος" }).click();
  await expect(page.getByRole("status")).toContainText("Το αίτημα καταγράφηκε");

  // Λήψη σήμερα → προθεσμία σε έναν μήνα: 28 έως 31 μέρες, όποιος κι αν είναι ο μήνας.
  const row = listItem(page, `Εξαγωγή: ${clientName}`);
  await expect(row).toContainText(/λήγει σε (28|29|30|31) μέρες/);

  await page.goto("/app");
  const card = panelOf(page, "GDPR με προθεσμία");
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Άνοιγμα →" })).toHaveAttribute(
    "href",
    GDPR,
  );

  await page.goto(GDPR);
  await row.getByRole("button", { name: "Ολοκλήρωση" }).click();
  await expect(row).toContainText("ολοκληρώθηκε");
  await expect(row.getByRole("button", { name: "Ολοκλήρωση" })).toHaveCount(0);
});

test("η εξαγωγή Πελάτη κατεβάζει ZIP με JSON και CSV, χωρίς Εσωτερικά Μηνύματα", async ({
  page,
}) => {
  const clientName = unique("Πελάτης Εξαγωγής");
  const clientId = await seedClient(clientName);
  const publicBody = unique("Καλώς ήρθατε");
  const internalBody = unique("Εσωτερικό σημείωμα");
  await seedMessages(clientId, publicBody, internalBody);

  await signIn(page, "owner@example.com");
  await page.goto(`/app/clients/${clientId}`);
  const panel = gdprPanel(page);
  await expect(
    panel.getByRole("heading", { name: "Εξαγωγή δεδομένων Πελάτη" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Εξαγωγή δεδομένων Πελάτη" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^GDPR .+\.zip$/);
  await expect(panel.getByRole("status")).toContainText("Το ZIP κατέβηκε.");

  const path = await file.path();
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const names = Object.keys(files).map((name) =>
    name.split("/").slice(1).join("/"),
  );
  expect(names).toEqual(
    expect.arrayContaining(["ΔΙΑΒΑΣΕ.txt", "δεδομένα.json", "Συνομιλία.csv"]),
  );
  const jsonName =
    Object.keys(files).find((name) => name.endsWith("/δεδομένα.json")) ?? "";
  const json = strFromU8(files[jsonName]);
  expect(JSON.parse(json).subject.label).toBe(clientName);
  expect(json).toContain(publicBody);
  expect(json).not.toContain(internalBody);
  const csvName =
    Object.keys(files).find((name) => name.endsWith("/Συνομιλία.csv")) ?? "";
  expect(strFromU8(files[csvName])).not.toContain(internalBody);
});

test("η ανωνυμοποίηση θέλει το όνομα γραμμένο ακριβώς, και μετά ο λογαριασμός δεν μπαίνει", async ({
  page,
  browser,
}) => {
  const name = unique("Αποχωρήσασα");
  const email = uniqueEmail("anonymized");
  const userId = await teamUser({
    name,
    email,
    role: "Παραγωγή",
    isActive: false,
  });

  await signIn(page, "owner@example.com");
  await page.goto(`/app/team/${userId}`);
  const panel = gdprPanel(page);
  await panel
    .getByRole("button", { name: "Ανωνυμοποίηση", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog", {
    name: `Ανωνυμοποίηση: ${name}`,
  });
  const confirm = dialog.getByRole("button", {
    name: "Ανωνυμοποίηση οριστικά",
  });
  await dialog.getByRole("textbox").fill(name.slice(0, -1));
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox").fill(name);
  await confirm.click();
  await expect(panel.getByRole("status")).toContainText("Ανωνυμοποιήθηκε");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ανωνυμοποιημένος Χρήστης",
  );
  await expect(page.getByText(name)).toHaveCount(0);
  await expect(gdprPanel(page)).toContainText("Έχει ήδη ανωνυμοποιηθεί.");
  const { data } = await serviceClient().auth.admin.getUserById(userId);
  expect(data.user?.email).toMatch(/^anonymized-\d+@anonymized\.invalid$/);

  const other = await browser.newPage();
  await other.goto("/login");
  await other.getByLabel("Email", { exact: true }).fill(email);
  await other.getByLabel("Κωδικός").fill(PASSWORD);
  await other.getByRole("button", { name: "Είσοδος" }).click();
  await expect(other.getByText("Λάθος email ή κωδικός.")).toBeVisible();
  await other.close();
});

test("η Διαχείριση δεν βλέπει τίποτα από τα GDPR", async ({ page }) => {
  const name = unique("Παλιός Συνεργάτης");
  const userId = await teamUser({
    name,
    email: uniqueEmail("old-colleague"),
    role: "Παραγωγή",
    isActive: false,
  });
  const clientId = await seedClient(unique("Πελάτης Διαχείρισης"));

  await signIn(page, "admin@example.com");
  await page.goto(GDPR);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(page.getByText("Μητρώο αιτημάτων")).toHaveCount(0);
  await page.goto(`/app/team/${userId}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(gdprPanel(page)).toHaveCount(0);
  await page.goto(`/app/clients/${clientId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(gdprPanel(page)).toHaveCount(0);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "GDPR με προθεσμία" }),
  ).toHaveCount(0);
});
