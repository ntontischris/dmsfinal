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
