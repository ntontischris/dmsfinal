import { expect, test } from "@playwright/test";

import { fieldOf, openNewInternal } from "./productions-parts";
import { button, card, project, signIn } from "./sales-parts";

// Σήμερα Σγ (#182): οι κάρτες «Η δουλειά μου». Ο Ιδιοκτήτης φτιάχνει ένα πρόχειρο Παραδοτέο σε δική του Εσωτερική
// Παραγωγή· η κάρτα «Παραδοτέα για μένα» το μετρά και το «Άνοιγμα →» οδηγεί στην ουρά H1 «Για μένα».
// Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const MY_DELIVERABLES = "Παραδοτέα για μένα";

test("ένα νέο Παραδοτέο φαίνεται στην κάρτα «Παραδοτέα για μένα» και το «Άνοιγμα →» πηγαίνει στην ουρά", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const P = project();
  const PRODUCTION = `Σήμερα δουλειά ${P}`;
  const DELIVERABLE = `Reel Σήμερα ${P}`;

  await signIn(page, "owner@example.com");
  await page.goto("/app/productions");
  const newProduction = await openNewInternal(page);
  await fieldOf(newProduction, "Τίτλος").fill(PRODUCTION);
  await fieldOf(newProduction, "Υπεύθυνος").selectOption({
    label: "Γιώργος Ιδιοκτήτης",
  });
  await button(newProduction, "Δημιουργία").click();
  await expect(
    page.getByRole("heading", { level: 1, name: PRODUCTION, exact: true }),
  ).toBeVisible();
  await page.getByText("Νέο Παραδοτέο", { exact: true }).click();
  const create = page.locator("details", {
    hasText: "Στοιχεία νέου Παραδοτέου",
  });
  await fieldOf(create, "Τίτλος").fill(DELIVERABLE);
  await button(create, "Δημιουργία").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );

  await page.goto("/app");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  const myCard = card(page, MY_DELIVERABLES);
  await expect(myCard).toBeVisible();
  await expect(myCard.getByRole("listitem").first()).toBeVisible();

  await myCard.getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/deliverables\?view=mine$/);
  await expect(
    page.getByRole("link", { name: DELIVERABLE, exact: true }).first(),
  ).toBeVisible();
});
