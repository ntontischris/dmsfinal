import { expect, test, type Page } from "@playwright/test";

import { formWith, panel, switchUser } from "./knowledge-parts";
import { button, project, shot, signIn } from "./sales-parts";

// Γνώση (A8) και Διαχείριση Γνώσης (L1) από άκρη σε άκρη (#190). Ο Χρήστης πελάτη «know.{project}@example.com» (Πλήρης)
// έρχεται από το seed. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε όνομα έχει το project.
test.describe.configure({ mode: "serial", retries: 0 });


const MANAGE_PATH = "/app/knowledge/manage";
const KNOWLEDGE_PATH = "/app/knowledge";
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const PDF_NAME = "sample-invoice.pdf";
const SECTION = (P: string): string => `Οδηγοί φωτισμού ${P}`;
const ARTICLE = (P: string): string => `Φωτισμός στο studio ${P}`;
const KIND_BUTTON = { Άρθρο: "Νέο Άρθρο", Αρχείο: "Ανέβασμα Αρχείου" } as const;

// Το «Νέα Ενότητα» της κεφαλίδας ανοίγει τη φόρμα· με άδεια Γνώση είναι ήδη ανοιχτή. Πάτημα πριν ζωντανέψει η σελίδα
// χάνεται, γι' αυτό ξαναπατάμε όσο η φόρμα μένει κλειστή.
async function createSection(page: Page, P: string): Promise<void> {
  await page.goto(`${MANAGE_PATH}?tab=sections`);
  const sections = panel(page, "Ενότητες");
  const form = formWith(page, "Περιγραφή (μία πρόταση)");
  await expect(async () => {
    if (!(await form.isVisible()))
      await sections
        .getByRole("button", { name: "Νέα Ενότητα" })
        .first()
        .click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form.getByLabel("Όνομα").fill(SECTION(P));
  await form
    .getByLabel("Περιγραφή (μία πρόταση)")
    .fill("Ό,τι χρειάζεται ένας πελάτης για το studio.");
  await button(form, "Νέα Ενότητα").click();
  await expect(form.getByRole("status")).toContainText(
    "Η Ενότητα δημιουργήθηκε.",
  );
}

// Νέο πρόχειρο από τη λίστα· ανοίγει ο επεξεργαστής του. Επιστρέφει το id από τη διεύθυνση.
async function createItem(
  page: Page,
  P: string,
  kind: "Άρθρο" | "Αρχείο",
  title: string,
): Promise<string> {
  await page.goto(MANAGE_PATH);
  const items = panel(page, "Στοιχεία");
  const form = formWith(page, "Τίτλος");
  await expect(async () => {
    if (!(await form.isVisible()))
      await button(items, KIND_BUTTON[kind]).click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form.getByLabel("Ενότητα").selectOption({ label: SECTION(P) });
  await form.getByLabel("Τίτλος").fill(title);
  await button(form, "Δημιουργία").click();
  await expect(page).toHaveURL(/\/app\/knowledge\/manage\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return page.url().split("/").pop() ?? "";
}

test("ο Ιδιοκτήτης δημοσιεύει Άρθρο για τον Ρόλο «Πλήρης» και μόνο ο πελάτης με αυτόν τον Ρόλο το βλέπει", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const title = ARTICLE(P);

  // 1. Ενότητα και Άρθρο με κείμενο.
  await signIn(page, "owner@example.com");
  await createSection(page, P);
  const itemId = await createItem(page, P, "Άρθρο", title);
  const content = formWith(page, "Κείμενο (Markdown)");
  await content
    .getByLabel("Κείμενο (Markdown)")
    .fill(
      "Ο **φωτισμός** στήνεται πριν έρθει ο πελάτης.\n\n- Δύο φώτα\n- Ένα φόντο",
    );
  await button(content, "Αποθήκευση").click();
  await expect(content.getByRole("status")).toContainText("Αποθηκεύτηκε.");

  // 2. Χωρίς Περίληψη η δημοσίευση δεν γίνεται: το κουμπί είναι κλειστό και λέει τι λείπει.
  const publish = page.locator("form", {
    has: page.getByRole("button", { name: "Δημοσίευση", exact: true }),
  });
  await expect(button(publish, "Δημοσίευση")).toBeDisabled();
  await expect(
    publish.getByRole("list", { name: "Τι λείπει για τη δημοσίευση" }),
  ).toContainText("Λείπει η Περίληψη.");

  // 3. Περίληψη, Κοινό «Πλήρης» (Ρόλος πελάτη), δημοσίευση.
  await content.getByLabel(/^Περίληψη/).fill("Πώς στήνουμε το φως στο studio.");
  await button(content, "Αποθήκευση").click();
  await expect(page.getByText("Λείπει η Περίληψη.")).toHaveCount(0);
  await expect(content.getByRole("status")).toContainText("Αποθηκεύτηκε.");
  const audience = page.locator("form", {
    has: page.getByRole("group", { name: "Κοινό" }),
  });
  await audience.getByLabel("Πλήρης (πελάτη)", { exact: true }).check();
  await button(audience, "Αποθήκευση Κοινού").click();
  await expect(audience.getByRole("status")).toContainText(
    "Το Κοινό αποθηκεύτηκε.",
  );
  await expect(button(publish, "Δημοσίευση")).toBeEnabled();
  await button(publish, "Δημοσίευση").click();
  await expect(button(page, "Απόσυρση")).toBeVisible();
  await shot(page, "l1-editor");

  // 4. Ο Χρήστης πελάτη με «Πλήρης» το βλέπει στη Γνώση και το βρίσκει με αναζήτηση.
  await switchUser(page, `know.${P}@example.com`);
  await page.goto(KNOWLEDGE_PATH);
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: title })).toBeVisible();
  await main
    .getByRole("searchbox", { name: "Αναζήτηση", exact: true })
    .fill("φωτισμός");
  await main.getByRole("button", { name: "Αναζήτηση", exact: true }).click();
  await expect(page).toHaveURL(/\?q=/);
  await main.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator("strong", { hasText: "φωτισμός" })).toBeVisible();
  await shot(page, "a8-item");

  // 5. Χρήστης ομάδας χωρίς τον Ρόλο «Πλήρης» δεν το βλέπει, ούτε με τον σύνδεσμο.
  await switchUser(page, "sales@example.com");
  await page.goto(KNOWLEDGE_PATH);
  await expect(
    page
      .getByRole("main")
      .getByRole("searchbox", { name: "Αναζήτηση", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  await page.goto(`${KNOWLEDGE_PATH}/${itemId}`);
  await expect(
    page.getByText("Αυτό το στοιχείο δεν ανήκει στο Κοινό σου."),
  ).toBeVisible();
});

test("ο Ιδιοκτήτης ανεβάζει ένα μικρό PDF ως Αρχείο Γνώσης", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await createItem(page, P, "Αρχείο", `Παρουσίαση studio ${P}`);
  const file = formWith(page, "Επιλογή Αρχείου");
  await page.waitForLoadState("networkidle");
  await file.getByLabel("Επιλογή Αρχείου").setInputFiles(PDF_FIXTURE);
  await expect(file.getByRole("status")).toContainText("Το Αρχείο ανέβηκε.");
  await expect(file.getByRole("link", { name: PDF_NAME })).toBeVisible();
  await expect(
    file.getByText("Ο Βοηθός θα διαβάσει το κείμενο του Αρχείου σε λίγο."),
  ).toBeVisible();
});

// Lβ (#191): η μνήμη του Βοηθού ξαναφτιάχνεται από το L1, και η αναζήτηση A8 δουλεύει χωρίς AI (το CI δεν έχει Gateway:
// πέφτει σε αναζήτηση με λέξεις χωρίς σφάλμα).
test("ο Ιδιοκτήτης ξαναφτιάχνει τη μνήμη του Βοηθού και η αναζήτηση βρίσκει χωρίς AI", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await page.goto(MANAGE_PATH);
  const memory = panel(page, "Μνήμη του Βοηθού");
  await button(memory, "Ξαναφτιάξε τη μνήμη του Βοηθού").click();
  await expect(memory.getByRole("status")).toContainText(
    "Ο Βοηθός ξαναμαθαίνει",
  );

  await switchUser(page, `know.${P}@example.com`);
  await page.goto(`${KNOWLEDGE_PATH}?q=${encodeURIComponent("φωτισμός")}`);
  await expect(page.getByRole("link", { name: ARTICLE(P) })).toBeVisible();
  await expect(page.getByText("Δεν φορτώθηκε: η Γνώση")).toHaveCount(0);
});
