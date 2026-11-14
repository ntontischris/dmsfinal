import { expect, test, type Page } from "@playwright/test";


// Ρυθμίσεις › Εταιρεία (O1) και Έλεγχος ετοιμότητας (O7) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Φανταστικά στοιχεία.
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

// Μια κάρτα (πάνελ) της οθόνης, από τον τίτλο της.
const card = (page: Page, title: string) =>
  page
    .locator("section.kit-panel")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

const save = (scope: ReturnType<typeof card>) =>
  scope.getByRole("button", { name: "Αποθήκευση", exact: true });

const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e-results/screens/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });

test("οι Πωλήσεις δεν βλέπουν τις Ρυθμίσεις", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(page.locator('a[href^="/app/settings/company"]')).toHaveCount(0);
  await page.goto("/app/settings/company");
  await expect(page.getByRole("heading", { name: "Χωρίς δικαίωμα" })).toBeVisible();
});

test("η Διαχείριση συμπληρώνει τα στοιχεία, αλλά όχι τα φορολογικά και τους λογαριασμούς", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/company");
  const details = card(page, "Στοιχεία");
  await details.locator("#o1-name").fill("Δοκιμαστικές Παραγωγές Ι.Κ.Ε.");
  await details.locator("#o1-trade").fill(`Δοκιμή ${test.info().project.name}`);
  await details.locator("#o1-address").fill("Οδός Δοκιμής 1, Αθήνα");
  await details.locator("#o1-phone").fill("2100000000");
  await details.locator("#o1-email").fill("info@example.com");
  const signer = card(page, "Υπογράφων εταιρείας");
  await signer.locator("#o1-signer").fill("Γιώργος Ιδιοκτήτης");
  await signer.locator("#o1-signer-title").fill("Διαχειριστής");
  await save(signer).click();
  await expect(signer.getByRole("status")).toContainText("Αποθηκεύτηκε");

  // Τα φορολογικά και οι λογαριασμοί είναι κλειδωμένα: μόνο ο Ιδιοκτήτης.
  const tax = card(page, "Φορολογικά");
  await expect(tax.getByLabel("ΑΦΜ")).toHaveCount(0);
  await expect(tax.getByText("🔒 Μόνο Ιδιοκτήτης").first()).toBeVisible();
  const banks = card(page, "Λογαριασμοί τραπέζης");
  await expect(banks.getByRole("link", { name: "+ Λογαριασμός" })).toHaveCount(0);
  await expect(banks.getByText("Τους αλλάζει ο Ιδιοκτήτης")).toBeVisible();
  await shot(page, "o1-admin");
});

test("ο Ιδιοκτήτης συμπληρώνει φορολογικά και λογαριασμό, με έλεγχο ψηφίων", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/company");

  const tax = card(page, "Φορολογικά");
  await tax.locator("#o1-afm").fill("123456789");
  await save(tax).click();
  await expect(tax.getByRole("alert")).toContainText("Το ΑΦΜ δεν είναι έγκυρο");
  await tax.locator("#o1-afm").fill("099999999");
  await tax.locator("#o1-doy").fill(`Α΄ Αθηνών ${test.info().project.name}`);
  await tax.locator("#o1-gemi").fill("123456789000");
  await save(tax).click();
  await expect(tax.getByRole("status")).toContainText("Αποθηκεύτηκε");

  const banks = card(page, "Λογαριασμοί τραπέζης");
  await banks.getByRole("link", { name: "+ Λογαριασμός" }).click();
  await expect(page).toHaveURL(/\?bank=new$/);
  await banks.locator("#o1-bank-name").fill("Δοκιμαστική Τράπεζα");
  await banks.locator("#o1-bank-holder").fill("Δοκιμαστικές Παραγωγές Ι.Κ.Ε.");
  await banks.locator("#o1-bank-iban").fill("GR1601101250000000012300696");
  const add = banks.getByRole("button", { name: "Προσθήκη λογαριασμού" });
  await add.click();
  await expect(banks.getByRole("alert")).toContainText(
    "Το IBAN δεν είναι έγκυρο",
  );
  const iban = IBAN[test.info().project.name] ?? IBAN.desktop;
  await banks.locator("#o1-bank-iban").fill(iban);
  await add.click();
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
  const list = card(page, "Τι πρέπει να είναι έτοιμο");
  const line = (text: string) =>
    list.getByRole("listitem").filter({ hasText: text });
  await expect(
    line("Στοιχεία εταιρείας").getByText("έτοιμο", { exact: true }),
  ).toBeVisible();
  await expect(
    line("ΑΦΜ, ΔΟΥ, ΓΕΜΗ").getByText("έτοιμο", { exact: true }),
  ).toBeVisible();
  await expect(
    line("Ωράριο κρατήσεων").getByText("έρχεται με τα Γυρίσματα"),
  ).toBeVisible();
  await expect(page.getByText(/Εκκρεμούν ακόμα \d+\./)).toBeVisible();
  // Με «εκκρεμεί» το «Άνοιγμα σε πελάτες» μένει κλειστό: κουμπί ανενεργό, κανένας σύνδεσμος επιβεβαίωσης.
  await expect(
    page.getByRole("button", { name: "Άνοιγμα σε πελάτες" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Άνοιγμα σε πελάτες" }),
  ).toHaveCount(0);
  await shot(page, "o7-owner");
});

// e1: το λογότυπο ανεβαίνει από τη Διαχείριση, φαίνεται στη μπάρα και στο /company-logo (για τα email),
// κάνει «έτοιμη» τη γραμμή του Ελέγχου ετοιμότητας και, με την αφαίρεση, γυρίζει το προεπιλεγμένο.
test("η Διαχείριση ανεβάζει και αφαιρεί το λογότυπο της εταιρείας", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/company");
  const logo = card(page, "Λογότυπο");
  await logo.getByLabel(/λογότυπο/i).setInputFiles("e2e/fixtures/logo.png");
  await logo.getByRole("button", { name: "Ανέβασμα", exact: true }).click();
  await expect(logo.getByRole("status")).toContainText("Το λογότυπο αποθηκεύτηκε");
  await expect(logo.getByRole("img", { name: "Το τρέχον λογότυπο" })).toBeVisible();
  await expect(page.locator('.shell-home img[src^="/company-logo?v="]')).toHaveCount(1);
  const served = await page.request.get("/company-logo");
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("image/png");
  await shot(page, "o1-logo");

  await page.goto("/app/settings/readiness");
  const line = card(page, "Τι πρέπει να είναι έτοιμο")
    .getByRole("listitem")
    .filter({ hasText: "Λογότυπο" });
  await expect(line.getByText("έτοιμο", { exact: true })).toBeVisible();

  await page.goto("/app/settings/company");
  await card(page, "Λογότυπο").getByRole("button", { name: "Αφαίρεση λογότυπου" }).click();
  await expect(card(page, "Λογότυπο").getByText(/Δεν έχει ανέβει λογότυπο/)).toBeVisible();
  await expect(page.locator(".shell-home img")).toHaveCount(0);
  const fallback = await page.request.get("/company-logo", { maxRedirects: 0 });
  expect(fallback.status()).toBe(307);
  expect(fallback.headers()["location"]).toMatch(/\/logo-email\.png$/);
});
