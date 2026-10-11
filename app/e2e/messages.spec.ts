import { expect, test } from "@playwright/test";

import { project, signIn } from "./sales-parts";

// Συνομιλία ομάδας (J1, J2) από άκρη σε άκρη (#160). Ο Πελάτης «Πελάτης Μηνυμάτων {project}» έρχεται από το seed.
// Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε κείμενο έχει το όνομα του project.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_NAME = (P: string): string => `Πελάτης Μηνυμάτων ${P}`;
const INBOX_PATH = "/app/messages";
const COMPOSER = "Νέο Μήνυμα";
const SENT_NOTICE = "Το Μήνυμα στάλθηκε.";
const INTERNAL_MARK = "Εσωτερικό · δεν το βλέπει ο πελάτης";

test("ο Ιδιοκτήτης στέλνει Μήνυμα και Εσωτερικό, διορθώνει και φιλτράρει", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const toClient = `Καλημέρα από το e2e ${P}`;
  const internal = `Εσωτερική σημείωση ${P}`;
  const fixed = `Εσωτερική σημείωση διορθωμένη ${P}`;

  // 1. Νέο Μήνυμα προς τον Πελάτη από τα Εισερχόμενα.
  await signIn(page, "owner@example.com");
  await page.goto(INBOX_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Εισερχόμενα" }),
  ).toBeVisible();
  await page
    .getByLabel("Νέο Μήνυμα προς")
    .selectOption({ label: CLIENT_NAME(P) });
  await page.getByRole("link", { name: "Νέο Μήνυμα", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Κανένα Μήνυμα ακόμα")).toBeVisible();

  // 2. Ένα Μήνυμα προς τον πελάτη και ένα Εσωτερικό.
  const composer = page.getByRole("region", { name: COMPOSER });
  await composer.getByPlaceholder("Γράψε το Μήνυμα…").fill(toClient);
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(SENT_NOTICE);
  await expect(page.locator("article", { hasText: toClient })).toBeVisible();

  await composer
    .getByRole("button", { name: "Εσωτερικό Μήνυμα", exact: true })
    .click();
  await expect(composer.getByText("Δεν το βλέπει ο πελάτης")).toBeVisible();
  await composer.getByPlaceholder("Γράψε το Μήνυμα…").fill(internal);
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  const internalArticle = page.locator("article", { hasText: internal });
  await expect(internalArticle).toBeVisible();
  await expect(internalArticle).toContainText(INTERNAL_MARK);

  // 3. Διόρθωση του δικού του Μηνύματος.
  await internalArticle.getByRole("button", { name: "Διόρθωση" }).click();
  await internalArticle.getByLabel("Διόρθωση", { exact: true }).fill(fixed);
  await internalArticle.getByRole("button", { name: "Αποθήκευση" }).click();
  const fixedArticle = page.locator("article", { hasText: fixed });
  await expect(fixedArticle).toContainText("διορθώθηκε");

  // 4. Το φίλτρο «Εσωτερικά» δείχνει μόνο το Εσωτερικό.
  await page
    .getByRole("navigation", { name: "Φίλτρα" })
    .getByRole("link", { name: "Εσωτερικά" })
    .click();
  await expect(page).toHaveURL(/filter=internal/);
  await expect(page.locator("article", { hasText: fixed })).toBeVisible();
  await expect(page.locator("article", { hasText: toClient })).toHaveCount(0);
});

test("η καρτέλα «Με ανέφεραν» δείχνει κενή κατάσταση όταν κανείς δεν ανέφερε τον Χρήστη", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto(`${INBOX_PATH}?tab=mentions`);
  await expect(page.getByText("Κανείς δεν σε ανέφερε")).toBeVisible();
});

// Συνημμένα (#162): ο Ιδιοκτήτης στέλνει Μήνυμα μόνο με ένα PDF (ανεβαίνει απευθείας στο Storage), το βλέπει στο νήμα,
// ο σύνδεσμος λήψης κάνει redirect σε προσωρινό σύνδεσμο, και μετά τη διαγραφή του Μηνύματος δεν υπάρχει λήψη.
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const PDF_NAME = "sample-invoice.pdf";

test("ο Ιδιοκτήτης στέλνει Μήνυμα με συνημμένο PDF, το κατεβάζει και το διαγράφει", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();

  await signIn(page, "owner@example.com");
  await page.goto(INBOX_PATH);
  await page
    .getByLabel("Νέο Μήνυμα προς")
    .selectOption({ label: CLIENT_NAME(P) });
  await page.getByRole("link", { name: "Νέο Μήνυμα", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);

  // Επιλογή αρχείου: ανεβαίνει αμέσως, και η Αποστολή περιμένει να τελειώσει.
  const composer = page.getByRole("region", { name: COMPOSER });
  await composer.getByLabel("Επισύναψη αρχείων").setInputFiles(PDF_FIXTURE);
  const chips = composer.getByRole("list", { name: "Συνημμένα" });
  await expect(chips).toContainText(PDF_NAME);
  await expect(chips).not.toContainText("ανεβαίνει…");
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(SENT_NOTICE);

  // Το Μήνυμα φαίνεται στο νήμα με το συνημμένο.
  const article = page.locator("article", {
    has: page.getByRole("link", { name: PDF_NAME }),
  });
  await expect(article).toHaveCount(1);
  const href = await article
    .getByRole("link", { name: PDF_NAME })
    .getAttribute("href");
  expect(href).toMatch(/\/app\/messages\/attachments\/[0-9a-f-]{36}$/);

  // Η λήψη απαντά με redirect σε προσωρινό σύνδεσμο του Storage.
  const download = await page.request.get(href ?? "", { maxRedirects: 0 });
  expect(download.status()).toBe(307);
  expect(download.headers()["location"]).toContain("message-attachments");
  expect(download.headers()["cache-control"]).toBe("no-store");

  // Διαγραφή του Μηνύματος: χάνεται η λήψη.
  await article.getByRole("button", { name: "Διαγραφή" }).first().click();
  await article.getByRole("button", { name: "Διαγραφή" }).last().click();
  await expect(page.getByRole("link", { name: PDF_NAME })).toHaveCount(0);
  const afterDelete = await page.request.get(href ?? "", { maxRedirects: 0 });
  expect(afterDelete.status()).toBe(404);
});
