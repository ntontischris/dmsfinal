import { expect, test } from "@playwright/test";

import { button, project, signIn } from "./sales-parts";
import { clickUntil } from "./today-parts";

// Σήμερα Σγ (#182) στη νέα εμφάνιση (Χώροι): τα «Παραδοτέα για μένα» είναι γραμμές της κάρτας «Η δουλειά μου σήμερα»
// (?g=mine). Ο Ιδιοκτήτης φτιάχνει ένα πρόχειρο Παραδοτέο σε δική του Εσωτερική Παραγωγή· η κάρτα το μετρά και η γραμμή
// του (ή το «Και N ακόμα παραδοτέα →», όταν δεν χωρά) οδηγεί σε αυτό. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });


const MINE = "Η δουλειά μου σήμερα";

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

  await page.goto("/app?g=mine");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  const deck = page.getByRole("navigation", { name: "Οι ομάδες της Σήμερα" });
  await expect(
    deck.locator("a[href='/app?g=mine'] .money-reel-count"),
  ).toHaveText(/^[1-9]\d*$/);

  const zone = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: MINE, exact: true }),
  });
  const line = zone.getByRole("link", {
    name: `Άνοιξε: ${DELIVERABLE}`,
    exact: true,
  });
  const more = zone.getByRole("link", { name: /^Και \d+ ακόμα παραδοτέα? →$/ });
  await expect(line.or(more).first()).toBeVisible();
  if ((await line.count()) > 0) {
    await line.click();
    await expect(page).toHaveURL(/\/app\/deliverables\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { level: 1, name: DELIVERABLE }),
    ).toBeVisible();
    return;
  }
  await more.click();
  await expect(page).toHaveURL(/\/app\/deliverables\?view=mine$/);
  await expect(
    page.getByRole("link", { name: DELIVERABLE, exact: true }).first(),
  ).toBeVisible();
});
