import { expect, test, type Page } from "@playwright/test";

// Google Calendar (C2δ) από άκρη σε άκρη. Στο CI δεν υπάρχουν στοιχεία λογαριασμού Google, άρα η κάρτα
// δείχνει το Notice «Λείπουν τα στοιχεία…» και όλα τα υπόλοιπα μένουν κενά. Οι Κανόνες αποθηκεύονται κανονικά.
const PASSWORD = "e2e-password-123";
const OWNER = "owner@example.com";
const MISSING_CONFIG = "Λείπουν τα στοιχεία του λογαριασμού Google στο Vercel";
const NO_DELETIONS = "Καμία διαγραφή σε εκκρεμότητα";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Κωδικός").fill(PASSWORD);
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e-results/screens/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });

const newEventSelect = (page: Page) =>
  page
    .locator('label:has(> span:text-is("Νέο γεγονός στο Google")) select')
    .first();

test("Ρυθμίσεις › Ενσωματώσεις δείχνει ότι λείπουν τα στοιχεία του Google", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await page.goto("/app/settings/integrations");
  await expect(page.getByText(MISSING_CONFIG)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Δημιουργία ημερολογίου" }),
  ).toHaveCount(0);
  await shot(page, "google-integrations");
});

test("οι Κανόνες Google αποθηκεύονται από τα Γυρίσματα", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/app/settings/filming");
  await expect(newEventSelect(page)).toBeVisible();
  await newEventSelect(page).selectOption("none");
  await page.getByRole("button", { name: "Αποθήκευση Κανόνων Google" }).click();
  await expect(
    page.getByText("Οι Κανόνες Google αποθηκεύτηκαν."),
  ).toBeVisible();

  await page.reload();
  await expect(newEventSelect(page)).toHaveValue("none");
  await newEventSelect(page).selectOption("blocked");
  await page.getByRole("button", { name: "Αποθήκευση Κανόνων Google" }).click();
  await expect(
    page.getByText("Οι Κανόνες Google αποθηκεύτηκαν."),
  ).toBeVisible();
  await shot(page, "google-rules");
});

test("η σελίδα Διαγραφών από το Google ανοίγει κενή για τον Ιδιοκτήτη", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await page.goto("/app/calendar/google-deletions");
  await expect(
    page.getByRole("heading", { name: "Διαγραφές από το Google", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(NO_DELETIONS)).toBeVisible();
  await shot(page, "google-deletions");
});
