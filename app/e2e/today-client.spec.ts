import { expect, test, type Page } from "@playwright/test";

import { project, signIn } from "./sales-parts";
import { allLink, clickUntil, openFolds } from "./today-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Σήμερα πελάτη (Σε, #184) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Ο Χρήστης πελάτη «today.{project}@example.com»
// (Πλήρης) του «Πελάτης Σήμερα {project}» έρχεται από το seed. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const REQUESTS = "Τα ανοιχτά Αιτήματά σου";

const card = (page: Page, label: string) =>
  page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: label, exact: true }),
  });

// Ο πελάτης στέλνει ένα Αίτημα «Κάτι άλλο» από τον συντάκτη της Συνομιλίας (J3).
async function sendOtherRequest(page: Page, text: string): Promise<void> {
  await page.goto("/app/messages");
  const composer = page.locator("form", {
    has: page.getByRole("heading", { name: "Νέο μήνυμα" }),
  });
  const other = composer.getByLabel("Κάτι άλλο");
  await clickUntil(
    composer.getByRole("button", { name: /Ζήτα κάτι να γίνει/ }),
    other,
  );
  await other.check();
  await composer.getByLabel("Περίγραψε τι χρειάζεσαι").fill(text);
  await composer.getByRole("button", { name: "Στείλε το αίτημα" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "στάλθηκε" }),
  ).toContainText("Το Αίτημα στάλθηκε.");
}

test("ο πελάτης στέλνει Αίτημα, το βλέπει στη Σήμερα και το «Όλα →» τον πάει στα Αιτήματά του", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const text = `Θέλουμε teaser για τα εγκαίνια ${P}`;

  // 1. Χωρίς εκκρεμότητες: οι κάρτες εβδομάδας μένουν, με «Κλείσε Γύρισμα»· τα Αιτήματα μόνο στη γραμμή «Δεν σε περιμένει τίποτα».
  await signIn(page, `today.${P}@example.com`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await openFolds(page);
  await expect(card(page, "Τα επόμενα Γυρίσματα")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Κλείσε Γύρισμα" }),
  ).toHaveAttribute("href", "/app/book");
  await expect(card(page, "Οι Παροχές του μήνα")).toBeVisible();
  await expect(card(page, REQUESTS)).toHaveCount(0);
  await expect(
    page
      .locator(".a1-quiet")
      .getByRole("link", { name: REQUESTS, exact: true }),
  ).toBeVisible();

  // 2. Η εκκρεμότητα: ένα Αίτημα «Κάτι άλλο» από τη Συνομιλία.
  await sendOtherRequest(page, text);

  // 3. Η κάρτα εμφανίζεται με το Αίτημα, χωρίς ποσά και χωρίς τίποτα εσωτερικό.
  await page.goto("/app");
  await openFolds(page);
  const requests = card(page, REQUESTS);
  await expect(requests).toBeVisible();
  await expect(requests.getByLabel("1 σε αναμονή")).toBeVisible();
  await expect(requests).toContainText(text);
  await expect(requests).toContainText("Άλλο");
  await expect(
    page.getByRole("heading", { level: 2, name: "Υγεία συστήματος" }),
  ).toHaveCount(0);

  // 4. «Όλα →» πάει στην καρτέλα Αιτήματα, όπου το Αίτημα είναι ανοιχτό.
  await allLink(requests, REQUESTS).click();
  await expect(page).toHaveURL(/\/app\/messages\?tab=requests$/);
  await expect(
    page.getByRole("link", { name: "Αιτήματα (1 ανοιχτά)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: text }),
  ).toContainText("ανοιχτό");
});
