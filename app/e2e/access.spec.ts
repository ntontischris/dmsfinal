import { expect, test, type Page } from "@playwright/test";

import { useSpacesLook } from "./walkthrough/spaces";

// Είσοδος, Ομάδα (N1) και Ρόλοι (N4) από άκρη σε άκρη, με τους τρεις φανταστικούς Χρήστες του e2e/seed.mjs.
const PASSWORD = "e2e-password-123";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Κωδικός").fill(PASSWORD);
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

// Οι καρτέλες του Χώρου «Εταιρεία» στην κεφαλίδα· οι υπόλοιπες οθόνες του Χώρου είναι στο «Περισσότερα».
const companyTabs = (page: Page) =>
  page.getByRole("navigation", { name: "Εταιρεία" });

// Σύνδεσμος του Χώρου ή του «Περισσότερα», και κλειστός: μετράμε τη διεύθυνση, όχι αν φαίνεται.
const linkTo = (page: Page, href: string) => page.locator(`a[href="${href}"]`);

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e-results/screens/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });

test("χωρίς σύνδεση το σύστημα στέλνει στην είσοδο", async ({ page }) => {
  await page.goto("/app/team");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fteam/);
});

test("λάθος κωδικός: μήνυμα που δεν αποκαλύπτει αν υπάρχει λογαριασμός", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.com");
  await page.getByLabel("Κωδικός").fill("λάθος-κωδικός");
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Λάθος" })).toHaveText("Λάθος email ή κωδικός.");
  await shot(page, "login-error");
});

test("ο Ιδιοκτήτης βλέπει την Ομάδα και φτιάχνει Ρόλο", async ({ page }) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/team");
  await companyTabs(page)
    .getByRole("button", { name: "Περισσότερες οθόνες" })
    .click();
  await expect(
    companyTabs(page).getByRole("link", { name: "Ρόλοι και Δικαιώματα" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Άννα Πωλήσεις" })).toBeVisible();
  await shot(page, "n1-owner");

  await page.goto("/app/team/roles/new?kind=team");
  await page.getByLabel("Όνομα").fill(`Εκδηλώσεις ${test.info().project.name}`);
  await page.getByRole("button", { name: "Δημιουργία Ρόλου" }).click();
  await expect(page).toHaveURL(/\/app\/team\/roles\/[0-9a-f-]{36}$/);

  await page
    .getByRole("radiogroup", { name: "Βλέπει Γυρίσματα" })
    .getByLabel("Όλα")
    .check();
  await page.getByRole("button", { name: "Αποθήκευση", exact: true }).click();
  // Δύο βήματα: πρώτα ποιους επηρεάζει (κανέναν, ο Ρόλος είναι νέος), μετά η αποθήκευση.
  await expect(page.getByRole("alertdialog")).toContainText(
    "Κανείς δεν έχει ακόμα αυτόν τον Ρόλο.",
  );
  await page.getByRole("button", { name: "Επιβεβαίωση αποθήκευσης" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Αποθηκεύτηκε (1 αλλαγή)" }),
  ).toBeVisible();
  await shot(page, "n4-role");
});

test("ο Ιδιοκτήτης δεν απενεργοποιεί τον εαυτό του", async ({ page }) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/team");
  await page.getByRole("link", { name: "Γιώργος Ιδιοκτήτης" }).click();
  await expect(
    page.getByText("Δεν απενεργοποιείς τον εαυτό σου."),
  ).toBeVisible();
});

test("η Διαχείριση δίνει Ρόλους χωρίς κλιμάκωση και δεν αλλάζει Ρόλους", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/team");
  await expect(
    companyTabs(page).getByRole("link", { name: "Ομάδα", exact: true }),
  ).toBeVisible();
  await expect(linkTo(page, "/app/team/roles")).toHaveCount(0);

  await page.goto("/app/team/roles");
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();

  await page.goto("/app/team");
  await page.getByRole("link", { name: "Άννα Πωλήσεις" }).click();
  await expect(
    page.getByText(
      "Δεν γίνεται: τον Ρόλο Ιδιοκτήτης τον δίνει μόνο Ιδιοκτήτης.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Ρόλος Ιδιοκτήτης", { exact: true })).toBeDisabled();
  await shot(page, "n1-admin-user");
});

test("οι Πωλήσεις δεν βλέπουν την Ομάδα", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(linkTo(page, "/app/team")).toHaveCount(0);
  await page.goto("/app/team");
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();
  await shot(page, "n1-sales");
});
