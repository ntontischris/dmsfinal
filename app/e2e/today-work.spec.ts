import { expect, test } from "@playwright/test";

import { button, project, signIn } from "./sales-parts";
import { clickUntil } from "./today-parts";

// Σήμερα Σγ (#182) στη νέα εμφάνιση (Χώροι): οι κάρτες «Η δουλειά μου» μαζεύονται στο «Και άλλα». Ο Ιδιοκτήτης φτιάχνει
// ένα πρόχειρο Παραδοτέο σε δική του Εσωτερική Παραγωγή· η γραμμή «Παραδοτέα για μένα» το μετρά και οδηγεί στην ουρά H1
// «Για μένα». Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });


const MY_DELIVERABLES = "Παραδοτέα για μένα";

test("ένα νέο Παραδοτέο μετρά στο «Παραδοτέα για μένα» και ο σύνδεσμος πηγαίνει στην ουρά", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const P = project();
  const PRODUCTION = `Σήμερα δουλειά ${P}`;
  const DELIVERABLE = `Reel Σήμερα ${P}`;

  await signIn(page, "owner@example.com");
  await page.goto("/app/productions");
  const newProduction = page.locator("form", {
    has: page.getByRole("heading", { name: "Νέα Εσωτερική Παραγωγή" }),
  });
  await clickUntil(
    button(page, "Νέα Εσωτερική Παραγωγή"),
    newProduction.getByLabel("Τίτλος"),
  );
  await newProduction.getByLabel("Τίτλος").fill(PRODUCTION);
  await newProduction
    .getByLabel("Υπεύθυνος")
    .selectOption({ label: "Γιώργος Ιδιοκτήτης" });
  await button(newProduction, "Δημιουργία").click();
  await expect(
    page.getByRole("heading", { level: 1, name: PRODUCTION }),
  ).toBeVisible();

  const create = page.locator("form", {
    has: button(page, "Δημιουργία Παραδοτέου"),
  });
  await clickUntil(button(page, "Νέο Παραδοτέο"), create.getByLabel("Τίτλος"));
  await create.getByLabel("Τίτλος").fill(DELIVERABLE);
  await button(create, "Δημιουργία Παραδοτέου").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );

  await page.goto("/app");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  const others = page.locator("details.a1-others");
  await others.locator("summary").click();
  const mine = others.getByRole("listitem").filter({
    has: page.getByRole("link", { name: MY_DELIVERABLES, exact: true }),
  });
  await expect(mine).toBeVisible();
  await expect(mine.locator(".a1-other-count")).toHaveText(/^[1-9]\d*$/);

  await mine.getByRole("link", { name: MY_DELIVERABLES, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/deliverables\?view=mine$/);
  await expect(
    page.getByRole("link", { name: DELIVERABLE, exact: true }).first(),
  ).toBeVisible();
});
