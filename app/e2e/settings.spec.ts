import { expect, test, type Page } from "@playwright/test";

// Ρυθμίσεις › Εταιρεία (O1) και Έλεγχος ετοιμότητας (O7) από άκρη σε άκρη. Φανταστικά στοιχεία.
const PASSWORD = "e2e-password-123";

// Ένα έγκυρο, φανταστικό IBAN ανά project, για να μη συγκρούονται τα δύο τρεξίματα.
const IBAN: Readonly<Record<string, string>> = {
  desktop: "GR5001720000000000000000001",
  mobile: "GR2301720000000000000000002",
};

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Κωδικός").fill(PASSWORD);
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

const card = (page: Page, title: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e-results/screens/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });

test("οι Πωλήσεις δεν βλέπουν τις Ρυθμίσεις", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(
    page
      .getByRole("navigation", { name: "Οθόνες" })
      .getByRole("link", { name: /Ρυθμίσεις/ }),
  ).toHaveCount(0);
  await page.goto("/app/settings/company");
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();
});

test("η Διαχείριση συμπληρώνει τα στοιχεία, αλλά όχι τα φορολογικά και τους λογαριασμούς", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/company");
  const details = card(page, "Στοιχεία εταιρείας");
  await details.getByLabel("Επωνυμία").fill("Δοκιμαστικές Παραγωγές Ι.Κ.Ε.");
  await details.getByLabel("Διακριτικός τίτλος").fill("Δοκιμή");
  await details.getByLabel("Διεύθυνση").fill("Οδός Δοκιμής 1, Αθήνα");
  await details.getByLabel("Τηλέφωνο").fill("2100000000");
  await details.getByLabel("Email εταιρείας").fill("info@example.com");
  await details.getByLabel("Υπογράφων εταιρείας").fill("Γιώργος Ιδιοκτήτης");
  await details.getByLabel("Ιδιότητα Υπογράφοντος").fill("Διαχειριστής");
  await details.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(details.getByRole("status")).toContainText("Αποθηκεύτηκε");

  await expect(
    card(page, "Φορολογικά στοιχεία και ΦΠΑ").getByLabel("ΑΦΜ"),
  ).toBeDisabled();
  await expect(page.getByText("Νέος λογαριασμός")).toHaveCount(0);
  await shot(page, "o1-admin");
});

test("ο Ιδιοκτήτης συμπληρώνει φορολογικά και λογαριασμό, με έλεγχο ψηφίων", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/company");

  const tax = card(page, "Φορολογικά στοιχεία και ΦΠΑ");
  await tax.getByLabel("ΑΦΜ").fill("123456789");
  await tax.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(tax.getByRole("alert")).toContainText("Το ΑΦΜ δεν είναι έγκυρο");
  await tax.getByLabel("ΑΦΜ").fill("099999999");
  await tax.getByLabel("ΔΟΥ").fill("Α΄ Αθηνών");
  await tax.getByLabel("ΓΕΜΗ").fill("123456789000");
  await tax.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(tax.getByRole("status")).toContainText("Αποθηκεύτηκε");

  const banks = card(page, "Λογαριασμοί τραπέζης");
  await banks.getByLabel("Τράπεζα").fill("Δοκιμαστική Τράπεζα");
  await banks.getByLabel("Δικαιούχος").fill("Δοκιμαστικές Παραγωγές Ι.Κ.Ε.");
  await banks.getByLabel("IBAN").fill("GR1601101250000000012300696");
  await banks.getByRole("button", { name: "Προσθήκη λογαριασμού" }).click();
  await expect(banks.getByRole("alert")).toContainText(
    "Το IBAN δεν είναι έγκυρο",
  );
  const iban = IBAN[test.info().project.name] ?? IBAN.desktop;
  await banks.getByLabel("IBAN").fill(iban);
  await banks.getByRole("button", { name: "Προσθήκη λογαριασμού" }).click();
  await expect(banks.getByRole("status")).toContainText(
    "Ο λογαριασμός προστέθηκε",
  );
  await expect(
    banks.getByText(iban.slice(0, 4), { exact: false }).first(),
  ).toBeVisible();
  await shot(page, "o1-owner");
});

test("ο Έλεγχος ετοιμότητας δείχνει τι μένει και δεν αφήνει άνοιγμα", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/readiness");
  const list = card(page, "Πριν το άνοιγμα σε πελάτες");
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "Στοιχεία εταιρείας" })
      .getByText("έτοιμο"),
  ).toBeVisible();
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "ΑΦΜ, ΔΟΥ, ΓΕΜΗ" })
      .getByText("έτοιμο"),
  ).toBeVisible();
  await expect(
    list
      .getByRole("listitem")
      .filter({ hasText: "Ωράριο κρατήσεων" })
      .getByText("έρχεται με τα Γυρίσματα"),
  ).toBeVisible();
  await expect(page.getByText(/Μένουν \d+ «εκκρεμεί»/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Άνοιγμα σε πελάτες" }),
  ).toHaveCount(0);
  await shot(page, "o7-owner");
});
