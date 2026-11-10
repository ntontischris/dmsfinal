import { expect, test, type Page } from "@playwright/test";


// Google Calendar (C2δ) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Στο CI δεν υπάρχουν στοιχεία λογαριασμού Google,
// άρα η κάρτα δείχνει «Λείπουν τα στοιχεία…» και όλα τα υπόλοιπα μένουν κενά. Οι Κανόνες αποθηκεύονται κανονικά.
const PASSWORD = "e2e-password-123";
const OWNER = "owner@example.com";
const MISSING_CONFIG = "Λείπουν τα στοιχεία του λογαριασμού Google στο Vercel";
const NO_DELETIONS = "Καμία διαγραφή δεν περιμένει";
const RULES_SAVED = "Οι Κανόνες Google αποθηκεύτηκαν.";


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
  page.getByLabel("Νέο γεγονός από το Google", { exact: true });

// Η κάρτα «Κανόνες ημερολογίου Google» της O4 › Ημερολόγιο Google.
const rulesCard = (page: Page) =>
  page.locator("form", { has: newEventSelect(page) });

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

// Το κουμπί ενεργοποιείται μόνο μετά από αλλαγή· μια επιλογή πριν ζωντανέψει η σελίδα χάνεται. Στην επανάληψη
// περνάμε πρώτα από την άλλη τιμή, αλλιώς η ίδια τιμή ξανά δεν μετρά ως αλλαγή.
async function chooseAndSave(page: Page, value: string) {
  const save = rulesCard(page).getByRole("button", { name: "Αποθήκευση", exact: true });
  const other = value === "none" ? "blocked" : "none";
  await expect(async () => {
    await newEventSelect(page).selectOption(other);
    await newEventSelect(page).selectOption(value);
    await expect(save).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await save.click();
}

test("οι Κανόνες Google αποθηκεύονται από τα Γυρίσματα", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/app/settings/filming?part=google");
  await expect(newEventSelect(page)).toBeVisible();
  await chooseAndSave(page, "none");
  await expect(rulesCard(page).getByText(RULES_SAVED)).toBeVisible();

  await page.reload();
  await expect(newEventSelect(page)).toHaveValue("none");
  await chooseAndSave(page, "blocked");
  await expect(rulesCard(page).getByText(RULES_SAVED)).toBeVisible();
  await shot(page, "google-rules");
});

test("η σελίδα Διαγραφών από το Google ανοίγει κενή για τον Ιδιοκτήτη", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await page.goto("/app/calendar/google-deletions");
  await expect(page).toHaveTitle(/^Διαγραφές από το Google/);
  await expect(page.getByText(NO_DELETIONS)).toBeVisible();
  await shot(page, "google-deletions");
});
