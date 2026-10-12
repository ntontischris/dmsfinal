import { expect, test, type Page } from "@playwright/test";

import { project, signIn } from "./sales-parts";

// Σήμερα πελάτη (Σε, #184) από άκρη σε άκρη. Ο Χρήστης πελάτη «today.{project}@example.com» (Πλήρης) του «Πελάτης Σήμερα
// {project}» έρχεται από το seed. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const REQUESTS = "Τα ανοιχτά Αιτήματά σου";

const card = (page: Page, label: string) =>
  page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: label, exact: true }),
  });

test("ο πελάτης στέλνει Αίτημα, το βλέπει στη Σήμερα και το «Άνοιγμα →» τον πάει στα Αιτήματά του", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const text = `Θέλουμε teaser για τα εγκαίνια ${P}`;

  // 1. Χωρίς εκκρεμότητες: οι κάρτες εβδομάδας μένουν, με «Κλείσε Γύρισμα»· τα Αιτήματα μόνο στη γραμμή «Τίποτα σε αναμονή».
  await signIn(page, `today.${P}@example.com`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await expect(card(page, "Τα επόμενα Γυρίσματα")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Κλείσε Γύρισμα" }),
  ).toHaveAttribute("href", "/app/book");
  await expect(card(page, "Οι Παροχές του μήνα")).toBeVisible();
  await expect(card(page, REQUESTS)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: REQUESTS, exact: true }),
  ).toBeVisible();

  // 2. Η εκκρεμότητα: ένα Αίτημα «άλλο» από τη Συνομιλία.
  await page.goto("/app/messages");
  const composer = page.getByRole("region", { name: "Νέο Μήνυμα" });
  await composer.getByLabel("Μήνυμα προς την ομάδα").fill(text);
  await page.waitForLoadState("networkidle");
  await composer.getByLabel("Ζητώ κάτι να γίνει (Αίτημα)").check();
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(
    "Το Αίτημα στάλθηκε.",
  );

  // 3. Η κάρτα εμφανίζεται με το Αίτημα, χωρίς ποσά και χωρίς τίποτα εσωτερικό.
  await page.goto("/app");
  const requests = card(page, REQUESTS);
  await expect(requests).toBeVisible();
  await expect(requests.getByLabel("1 σε αναμονή")).toBeVisible();
  await expect(requests).toContainText(text);
  await expect(requests).toContainText("Άλλο");
  await expect(
    page.getByRole("heading", { level: 2, name: "Υγεία συστήματος" }),
  ).toHaveCount(0);

  // 4. «Άνοιγμα →» πάει στην καρτέλα Αιτήματα, όπου το Αίτημα είναι ανοιχτό.
  await requests.getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/messages\?tab=requests$/);
  await expect(
    page.getByRole("link", { name: "Αιτήματα (1 ανοιχτά)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: text }),
  ).toContainText("ανοιχτό");
});
