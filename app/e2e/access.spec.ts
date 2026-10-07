import { expect, test, type Page } from "@playwright/test";

// Είσοδος, Ομάδα (N1) και Ρόλοι (N4) από άκρη σε άκρη, με τους τρεις φανταστικούς Χρήστες του e2e/seed.mjs.
const PASSWORD = "e2e-password-123";

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
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(
    nav.getByRole("link", { name: /Ρόλοι και Δικαιώματα/ }),
  ).toBeVisible();

  await page.goto("/app/team");
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
  await expect(page.getByRole("status")).toContainText(
    "Αποθηκεύτηκε (1 αλλαγή)",
  );
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
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: "Ομάδα" })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: /Ρόλοι και Δικαιώματα/ }),
  ).toHaveCount(0);

  await page.goto("/app/team/roles");
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();

  await page.goto("/app/team");
  await page.getByRole("link", { name: "Άννα Πωλήσεις" }).click();
  await expect(
    page.getByText(
      "Κλειδωμένος: τον Ρόλο Ιδιοκτήτης τον δίνει μόνο Ιδιοκτήτης",
    ),
  ).toBeVisible();
  await shot(page, "n1-admin-user");
});

test("οι Πωλήσεις δεν βλέπουν την Ομάδα", async ({ page }) => {
  await signIn(page, "sales@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: "Ομάδα" })).toHaveCount(0);
  await page.goto("/app/team");
  await expect(page.getByText("Χωρίς δικαίωμα")).toBeVisible();
  await shot(page, "n1-sales");
});
