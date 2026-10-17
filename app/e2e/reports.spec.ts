import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./sales-parts";

// Αναφορές Ρα (#198): ο Ιδιοκτήτης ανοίγει την M1 από την πλοήγηση, βλέπει τις τρεις οικονομικές Αναφορές, αλλάζει
// Περίοδο (που μένει στη διεύθυνση) και ανοίγει τις Οφειλές· η Παραγωγή δεν έχει Αναφορές. Οι αριθμοί ελέγχονται στο
// pgTAP (reports_test.sql)· εδώ μόνο η ροή. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const REPORTS_PATH = "/app/reports";
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Οθόνες" });

test("ο Ιδιοκτήτης ανοίγει τις οικονομικές Αναφορές με φίλτρο Περιόδου στη διεύθυνση", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await nav(page)
    .getByRole("link", { name: /Αναφορές$/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`${REPORTS_PATH}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Αναφορές" }),
  ).toBeVisible();
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
  const periods = page.getByRole("navigation", { name: "Περίοδος" });
  await expect(periods.getByRole("link", { name: "Φέτος" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await periods.getByRole("link", { name: "Αυτός ο μήνας" }).click();
  await expect(page).toHaveURL(/period=this-month/);
  await expect(
    periods.getByRole("link", { name: "Αυτός ο μήνας" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("ως σήμερα").first()).toBeVisible();

  // Ο σελιδοδείκτης ξανανοίγει την ίδια εικόνα.
  await page.reload();
  await expect(
    periods.getByRole("link", { name: "Αυτός ο μήνας" }),
  ).toHaveAttribute("aria-current", "true");

  await page.goto(`${REPORTS_PATH}?report=receivables`);
  await expect(
    page.getByRole("heading", { level: 2, name: "Οφειλές κατά ηλικία" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Περίοδος" })).toHaveCount(
    0,
  );
  await expect(
    page
      .getByText("Σύνολο ανεξόφλητων")
      .or(page.getByText("Δεν υπάρχουν οφειλές")),
  ).toBeVisible();
});

test("η Παραγωγή δεν βλέπει Αναφορές", async ({ page }) => {
  await signIn(page, "production@example.com");
  await expect(nav(page).getByRole("link", { name: /Αναφορές$/ })).toHaveCount(
    0,
  );
  await page.goto(`${REPORTS_PATH}?report=turnover`);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
});
