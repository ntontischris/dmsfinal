import { expect, test, type Page } from "@playwright/test";

import { button, card, field, project, shot, signIn } from "./sales-parts";

// Συζητήσεις Βοηθού (L2) και Αναπάντητες (L3) από άκρη σε άκρη (#192). Το seed γράφει, μέσα από τα RPC του server του Βοηθού,
// μία Συζήτηση Επισκέπτη ανά project με την ίδια ερώτηση δύο φορές («ρωτήθηκε 2 φορές») και ένα δημοσιευμένο στοιχείο Γνώσης.
// Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε όνομα έχει το project.
test.describe.configure({ mode: "serial", retries: 0 });

const UNANSWERED_PATH = "/app/knowledge/unanswered";
const CONVERSATIONS_PATH = "/app/knowledge/conversations";
const CARD_TITLE = "Αναπάντητες ερωτήσεις Βοηθού";
const QUESTION = (P: string): string => `Κάνετε και γάμους ${P};`;
const ITEM = (P: string): string => `Γάμοι και εκδηλώσεις ${P}`;

const questionRow = (page: Page, P: string) =>
  page.locator("li", { hasText: `«${QUESTION(P)}»` });

test("ο Ιδιοκτήτης βλέπει την Αναπάντητη στο Σήμερα, την κλείνει με «Καλύφθηκε από…», την ξανανοίγει και διαγράφει τη Συζήτηση", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();

  // 1. Η κάρτα Σήμερα δείχνει την ερώτηση και οδηγεί στο L3.
  await signIn(page, "owner@example.com");
  const today = card(page, CARD_TITLE);
  await expect(today).toBeVisible();
  await expect(today.getByRole("link", { name: QUESTION(P) })).toBeVisible();
  await today.getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/knowledge\/unanswered$/);

  // 2. «ρωτήθηκε 2 φορές» και κλείσιμο με «Καλύφθηκε από…» δημόσιο στοιχείο.
  const row = questionRow(page, P);
  await expect(row.getByText("ρωτήθηκε 2 φορές")).toBeVisible();
  await row.getByText("Κλείσε", { exact: true }).click();
  await field(row, "Στοιχείο της Γνώσης").selectOption({ label: ITEM(P) });
  await shot(page, "l3-close");
  await button(row, "Καλύφθηκε").click();
  await expect(page.getByText("Η ερώτηση κλείστηκε: καλύφθηκε.")).toBeVisible();
  await expect(questionRow(page, P)).toHaveCount(0);

  // 3. Στην καρτέλα «Καλύφθηκαν», με το στοιχείο· «Ξανάνοιγμα» τη γυρίζει στις ανοιχτές.
  await page.getByRole("link", { name: /^Καλύφθηκαν/ }).click();
  await expect(page).toHaveURL(/tab=covered/);
  const covered = questionRow(page, P);
  await expect(
    covered.getByRole("link", { name: `«${ITEM(P)}»` }),
  ).toBeVisible();
  await button(covered, "Ξανάνοιγμα").click();
  await expect(page.getByText("Η ερώτηση ξανάνοιξε.")).toBeVisible();
  await expect(
    questionRow(page, P).getByText("ρωτήθηκε 2 φορές"),
  ).toBeVisible();

  // 4. L2: η Συζήτηση (μόνο ανάγνωση) με «δεν ήξερε»· «Διαγραφή Συζήτησης» με επιβεβαίωση.
  await page.goto(`${CONVERSATIONS_PATH}?tab=public`);
  await page.getByRole("link", { name: QUESTION(P) }).click();
  await expect(page).toHaveURL(
    /\/app\/knowledge\/conversations\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByText("δεν ήξερε").first()).toBeVisible();
  await shot(page, "l2-conversation");
  await button(page, "Διαγραφή Συζήτησης").click();
  const confirm = page.getByRole("alertdialog", {
    name: "Επιβεβαίωση διαγραφής",
  });
  await button(confirm, "Ναι, διαγραφή").click();
  await expect(page).toHaveURL(
    /\/app\/knowledge\/conversations\?done=deleted$/,
  );
  await expect(page.getByText("Η Συζήτηση διαγράφηκε")).toBeVisible();
  await expect(page.getByRole("link", { name: QUESTION(P) })).toHaveCount(0);

  // 5. Η Αναπάντητη ήρθε μόνο από αυτή τη Συζήτηση: έφυγε κι αυτή.
  await page.goto(UNANSWERED_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Αναπάντητες ερωτήσεις" }),
  ).toBeVisible();
  await expect(questionRow(page, P)).toHaveCount(0);
});

test("χωρίς «Διαχειρίζεται Γνώση» οι Συζητήσεις και οι Αναπάντητες δεν ανοίγουν", async ({
  page,
}) => {
  await signIn(page, "sales@example.com");
  await page.goto(UNANSWERED_PATH);
  await expect(
    page.getByText(
      "Τις Αναπάντητες ερωτήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.",
    ),
  ).toBeVisible();
  await page.goto(CONVERSATIONS_PATH);
  await expect(
    page.getByText("Τις Συζητήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση."),
  ).toBeVisible();
  await page.goto("/app");
  await expect(card(page, CARD_TITLE)).toHaveCount(0);
});
