import { expect, test } from "@playwright/test";

import { fieldOf, openNewInternal, openProduction } from "./productions-parts";
import { button, card, project, shot, signIn } from "./sales-parts";

// Ολοκλήρωση Παραγωγής και Εργασίες (#143) από άκρη σε άκρη. Η Εσωτερική Παραγωγή φτιάχνεται εδώ, με όνομα του project,
// ώστε να μη μπλέκει με τα άλλα τεστ που παραδίδουν την «Showreel» του seed.
// Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ retries: 0 });

const OWNER_NAME = "Γιώργος Ιδιοκτήτης";
const TASK = "Στείλε το μενού στον πελάτη";
const LINK = "https://drive.google.com/file/d/e2e-completion-v1";

test("ο Ιδιοκτήτης προσθέτει Εργασία, την κλείνει και εγκρίνει το τελευταίο Παραδοτέο: η Παραγωγή παραδίδεται αυτόματα", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Ολοκλήρωση ${P}`;
  const DELIVERABLE = `Reel ${TITLE}`;

  await signIn(page, "owner@example.com");
  await page.goto("/app/productions");
  const form = await openNewInternal(page);
  await fieldOf(form, "Τίτλος").fill(TITLE);
  await fieldOf(form, "Υπεύθυνος").selectOption({ label: OWNER_NAME });
  await button(form, "Δημιουργία").click();
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE, exact: true }),
  ).toBeVisible();

  const tasks = card(page, "Εργασίες");
  await fieldOf(tasks, "Τίτλος").fill(TASK);
  await button(tasks, "Προσθήκη Εργασίας").click();
  await expect(tasks.getByRole("status")).toContainText(
    "Η Εργασία προστέθηκε.",
  );
  await tasks.getByRole("checkbox", { name: TASK }).check();
  await expect(tasks.getByRole("checkbox", { name: TASK })).toBeChecked();
  await shot(page, "g2-tasks-done");

  await page.getByText("Νέο Παραδοτέο", { exact: true }).click();
  const create = page.locator("details", {
    hasText: "Στοιχεία νέου Παραδοτέου",
  });
  await fieldOf(create, "Τίτλος").fill(DELIVERABLE);
  await button(create, "Δημιουργία").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );
  await card(page, "Παραδοτέα")
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();

  const addVersion = page.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη Έκδοσης", exact: true }),
  });
  await fieldOf(
    addVersion,
    "Link Έκδοσης (Google Drive, Vimeo ή YouTube)",
  ).fill(LINK);
  await button(addVersion, "Προσθήκη Έκδοσης").click();
  await expect(addVersion.getByRole("status")).toContainText(
    "Η νέα Έκδοση προστέθηκε.",
  );

  const approve = page.locator("form", {
    has: page.getByRole("button", { name: "Ενέκρινε", exact: true }),
  });
  await button(approve, "Ενέκρινε").click();
  await expect(
    page.getByText("Εγκρίθηκε", { exact: true }).first(),
  ).toBeVisible();

  await openProduction(page, TITLE);
  await expect(card(page, "Κατάσταση")).toContainText("Παραδόθηκε αυτόματα");
  await expect(
    card(page, "Εργασίες").getByRole("checkbox", { name: TASK }),
  ).toBeChecked();
  await shot(page, "g2-auto-delivered");
});
