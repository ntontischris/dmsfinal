import { expect, test, type Page } from "@playwright/test";

import { switchUser } from "./booking-parts";
import { button, card, field, project, shot, signIn } from "./sales-parts";

// Γνώση (A8) και Διαχείριση Γνώσης (L1) από άκρη σε άκρη (#190). Ο Χρήστης πελάτη «know.{project}@example.com» (Πλήρης)
// έρχεται από το seed. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε όνομα έχει το project.
test.describe.configure({ mode: "serial", retries: 0 });

const MANAGE_PATH = "/app/knowledge/manage";
const KNOWLEDGE_PATH = "/app/knowledge";
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const PDF_NAME = "sample-invoice.pdf";
const SECTION = (P: string): string => `Οδηγοί φωτισμού ${P}`;
const ARTICLE = (P: string): string => `Φωτισμός στο studio ${P}`;

async function createSection(page: Page, P: string): Promise<void> {
  await page.goto(`${MANAGE_PATH}?tab=sections`);
  const form = card(page, "Νέα Ενότητα");
  await field(form, "Όνομα").fill(SECTION(P));
  await field(form, "Περιγραφή (μία πρόταση)").fill(
    "Ό,τι χρειάζεται ένας πελάτης για το studio.",
  );
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
  const form = card(page, "Νέο στοιχείο");
  await field(form, "Είδος").selectOption({ label: kind });
  await field(form, "Ενότητα").selectOption({ label: SECTION(P) });
  await field(form, "Τίτλος").fill(title);
  await button(form, "Δημιουργία").click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
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
  const content = card(page, "Περιεχόμενο");
  await content
    .getByLabel("Κείμενο", { exact: true })
    .fill(
      "Ο **φωτισμός** στήνεται πριν έρθει ο πελάτης.\n\n- Δύο φώτα\n- Ένα φόντο",
    );
  await button(content, "Αποθήκευση").click();
  await expect(content.getByRole("status")).toContainText("Αποθηκεύτηκε.");

  // 2. Δημοσίευση χωρίς Περίληψη: η βάση το αρνείται με μήνυμα.
  const publish = card(page, "Δημοσίευση");
  await button(publish, "Δημοσίευση").click();
  await expect(publish.getByRole("alert")).toContainText(
    "Γράψε Περίληψη πριν από τη δημοσίευση",
  );

  // 3. Περίληψη, Κοινό «Πλήρης» (Ρόλος πελάτη), δημοσίευση.
  await content.getByLabel(/^Περίληψη/).fill("Πώς στήνουμε το φως στο studio.");
  await button(content, "Αποθήκευση").click();
  await expect(page.getByText("Λείπει η Περίληψη.")).toHaveCount(0);
  await expect(content.getByRole("status")).toContainText("Αποθηκεύτηκε.");
  const audience = card(page, "Κοινό");
  await audience.getByLabel("Πλήρης", { exact: true }).check();
  await button(audience, "Αποθήκευση Κοινού").click();
  await expect(audience.getByRole("status")).toContainText(
    "Το Κοινό αποθηκεύτηκε.",
  );
  await button(card(page, "Δημοσίευση"), "Δημοσίευση").click();
  await expect(button(page, "Απόσυρση")).toBeVisible();
  await shot(page, "l1-editor");

  // 4. Ο Χρήστης πελάτη με «Πλήρης» το βλέπει στη Γνώση και το βρίσκει με αναζήτηση.
  await switchUser(page, `know.${P}@example.com`);
  await page.goto(KNOWLEDGE_PATH);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Αναζήτηση στη Γνώση" })
    .fill("φωτισμός");
  await page.getByRole("button", { name: "Αναζήτηση", exact: true }).click();
  await expect(page).toHaveURL(/\?q=/);
  await page.getByRole("link", { name: title }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  await expect(page.locator("strong", { hasText: "φωτισμός" })).toBeVisible();
  await shot(page, "a8-item");

  // 5. Χρήστης ομάδας χωρίς τον Ρόλο «Πλήρης» δεν το βλέπει, ούτε με τον σύνδεσμο.
  await switchUser(page, "sales@example.com");
  await page.goto(KNOWLEDGE_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Γνώση" }),
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
  const panel = card(page, "Αρχείο");
  await page.waitForLoadState("networkidle");
  await panel.getByLabel("Επιλογή Αρχείου").setInputFiles(PDF_FIXTURE);
  await expect(panel.getByRole("status")).toContainText("Το Αρχείο ανέβηκε.");
  await expect(panel.getByRole("link", { name: PDF_NAME })).toBeVisible();
  await expect(
    panel.getByText("Ο Βοηθός θα διαβάσει το κείμενο του Αρχείου σε λίγο."),
  ).toBeVisible();
});
