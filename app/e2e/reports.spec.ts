import { expect, test } from "@playwright/test";

import { filterCard, openTab, pickFilter, startsWith } from "./finance-parts";
import { signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Αναφορές Ρα (#198): ο Ιδιοκτήτης ανοίγει την M1 από τον Χώρο «Χρήματα», βλέπει τις τρεις οικονομικές Αναφορές, αλλάζει
// Περίοδο (που μένει στη διεύθυνση) και ανοίγει τις Οφειλές· η Παραγωγή δεν έχει Αναφορές. Οι αριθμοί ελέγχονται στο
// pgTAP (reports_test.sql)· εδώ μόνο η ροή. Σειριακά, χωρίς retries. Στη νέα εμφάνιση (Χώροι).
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const REPORTS_PATH = "/app/reports";
const MONEY = "Χρήματα";

test("ο Ιδιοκτήτης ανοίγει τις οικονομικές Αναφορές με φίλτρο Περιόδου στη διεύθυνση", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await openTab(page, MONEY, "Αναφορές");
  await expect(page).toHaveURL(new RegExp(`${REPORTS_PATH}$`));
  for (const title of [
    "Τζίρος και Εισπράξεις ανά μήνα",
    "Τζίρος ανά Πελάτη",
    "Οφειλές κατά ηλικία",
  ])
    await expect(
      page.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();

  await page
    .getByRole("link", { name: /Τζίρος και Εισπράξεις ανά μήνα/ })
    .click();
  await expect(page).toHaveURL(/report=turnover/);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Τζίρος και Εισπράξεις ανά μήνα",
    }),
  ).toBeVisible();
  const period = filterCard(page, "Περίοδος").locator(".kit-fb-chip");
  await expect(period).toHaveText(startsWith("Φέτος"));
  await pickFilter(page, "Περίοδος", "Αυτός ο μήνας");
  await expect(page).toHaveURL(/period=this-month/);
  await expect(period).toHaveText(startsWith("Αυτός ο μήνας"));
  await expect(period).toContainText("ως σήμερα");

  // Ο σελιδοδείκτης ξανανοίγει την ίδια εικόνα.
  await page.reload();
  await expect(period).toHaveText(startsWith("Αυτός ο μήνας"));

  await page.goto(`${REPORTS_PATH}?report=receivables`);
  await expect(
    page.getByRole("heading", { level: 2, name: "Οφειλές κατά ηλικία" }),
  ).toBeVisible();
  await expect(filterCard(page, "Περίοδος")).toHaveCount(0);
  await expect(
    page
      .getByText("Σύνολο ανεξόφλητων")
      .or(page.getByText("Δεν υπάρχουν οφειλές")),
  ).toBeVisible();
});

test("η Παραγωγή δεν βλέπει Αναφορές", async ({ page }) => {
  await signIn(page, "production@example.com");
  await page.goto(`${REPORTS_PATH}?report=turnover`);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: MONEY, exact: true })
      .getByRole("link", { name: "Αναφορές", exact: true }),
  ).toHaveCount(0);
});

// Αναφορές Ρβ (#199): ο πωλητής (Εύρος Α) βλέπει τις τρεις Αναφορές πωλήσεων και όχι τις οικονομικές· μόνο τις δικές του
// Ευκαιρίες, χωρίς φίλτρο «Πωλητής». Οι αριθμοί ελέγχονται στο pgTAP (reports_sales_test.sql).
test("ο πωλητής βλέπει μόνο τις δικές του Αναφορές πωλήσεων", async ({
  page,
}) => {
  await signIn(page, "sales@example.com");
  await page.goto(REPORTS_PATH);
  for (const title of [
    "Ανοιχτές Ευκαιρίες ανά Στάδιο",
    "Κερδισμένες και χαμένες",
    "Πηγές Ευκαιριών",
  ])
    await expect(
      page.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Τζίρος ανά Πελάτη/ }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: /Κερδισμένες και χαμένες/ }).click();
  await expect(page).toHaveURL(/report=results/);
  await expect(
    page.getByText("Βλέπεις μόνο τις Ευκαιρίες όπου είσαι Υπεύθυνος."),
  ).toBeVisible();
  await expect(filterCard(page, "Πωλητής")).toHaveCount(0);
  await expect(filterCard(page, "Περίοδος")).toBeVisible();
});

// Ργ (#200), Ρδ (#201): ο Ιδιοκτήτης ανοίγει την M2 από την M1 και εξάγει τους Πελάτες (το seed έχει πάντα Πελάτες)·
// το αρχείο κατεβαίνει αμέσως και η εξαγωγή φαίνεται στο Ιστορικό. Η Εξαγωγή Αναφοράς, τα δεδομένα και το Ίχνος
// ελέγχονται στο pgTAP (reports_export_test.sql) και στο vitest.
test("ο Ιδιοκτήτης εξάγει Πελάτες και τους βλέπει στο Ιστορικό εξαγωγών", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await page.goto(REPORTS_PATH);
  await page.getByRole("link", { name: "Εξαγωγή δεδομένων", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/reports\/export$/);
  await expect(page.getByRole("heading", { name: "Πακέτο λογιστή" })).toBeVisible();

  // Η «Άλλη εξαγωγή» ανοίγει από κάτω από το Πακέτο λογιστή· το σύνολο διαλέγεται από την κάρτα του.
  await page.locator("summary", { hasText: "Άλλη εξαγωγή" }).click();
  await pickFilter(page, "Σύνολο δεδομένων", "Πελάτες");
  await expect(page).toHaveURL(/dataset=clients/);
  const datasetDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Εξαγωγή", exact: true }).click();
  expect((await datasetDownload).suggestedFilename()).toBe("Πελάτες.xlsx");

  await page.reload();
  const history = page.getByRole("heading", { name: "Ιστορικό εξαγωγών" }).locator("xpath=ancestor::section[1]");
  await expect(history.getByText("Πελάτες · Excel").first()).toBeVisible();
});

test("η Παραγωγή δεν έχει Εξαγωγή", async ({ page }) => {
  await signIn(page, "production@example.com");
  await page.goto("/app/reports/export");
  await expect(page.getByRole("heading", { name: "Χωρίς δικαίωμα" })).toBeVisible();
});
