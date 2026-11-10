import { expect, test } from "@playwright/test";

import { visit } from "./filming-parts";
import { createInternal, PRODUCTION_URL } from "./productions-parts";
import { button, card, project, shot, signIn } from "./sales-parts";

// Ολοκλήρωση Παραγωγής και Εργασίες (#143) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Η Εσωτερική Παραγωγή φτιάχνεται
// εδώ, με όνομα του project, ώστε να μη μπλέκει με τα άλλα τεστ που παραδίδουν την «Showreel» του seed.
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
  await createInternal(page, TITLE, OWNER_NAME);
  const productionUrl = page.url();

  const tasks = card(page, "Εργασίες");
  const taskTitle = tasks.getByLabel("Τίτλος εργασίας", { exact: true });
  // Οι τιμές ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await taskTitle.fill(TASK);
    await expect(button(tasks, "Προσθήκη εργασίας")).toBeEnabled({
      timeout: 1_000,
    });
  }).toPass();
  await button(tasks, "Προσθήκη εργασίας").click();
  await expect(tasks.getByRole("status")).toContainText(
    "Η Εργασία προστέθηκε.",
  );
  const task = tasks.locator("li.g2-task", { hasText: TASK });
  await button(task, "Έγινε").click();
  await expect(task).toHaveAttribute("data-done", "true");
  await expect(button(task, "Ξανάνοιγμα")).toBeVisible();
  await shot(page, "g2-tasks-done");

  const deliverables = card(page, "Παραδοτέα");
  const create = deliverables.locator("form", {
    has: page.getByRole("button", {
      name: "Δημιουργία Παραδοτέου",
      exact: true,
    }),
  });
  await expect(async () => {
    if (!(await create.isVisible()))
      await button(deliverables, "Νέο Παραδοτέο").click();
    await expect(create).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await create.locator('input[name="title"]').fill(DELIVERABLE);
  await button(create, "Δημιουργία Παραδοτέου").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );
  await deliverables
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();

  // H2: νέα Έκδοση. Στην Εσωτερική κάθε Έκδοση περνά από έλεγχο και ο Ελεγκτής (ο Ιδιοκτήτης) εγκρίνει οριστικά.
  const addVersion = page.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη Έκδοσης", exact: true }),
  });
  await expect(async () => {
    if (!(await addVersion.isVisible()))
      await button(page, "Νέα Έκδοση").click();
    await expect(addVersion).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await addVersion.locator('input[name="url"]').fill(LINK);
  await button(addVersion, "Προσθήκη Έκδοσης").click();
  // Με την επιτυχία η φόρμα κλείνει και η v1 περιμένει έγκριση.
  await button(page, "Εγκρίνω (οριστικό)").click();
  await expect(button(page, "Εγκρίνω (οριστικό)")).toHaveCount(0);
  await expect(
    page.getByText("εγκρίθηκε", { exact: true }).first(),
  ).toBeVisible();

  // Η παραδομένη Παραγωγή βγαίνει από την προβολή «Ανοιχτές»· ανοίγουμε την «Παραδομένες».
  await visit(page, "/app/productions?view=delivered");
  await page.getByRole("link", { name: TITLE, exact: true }).first().click();
  await expect(page).toHaveURL(PRODUCTION_URL);
  expect(page.url()).toBe(productionUrl);
  const state = card(page, "Κατάσταση");
  await expect(state.locator(".kit-panel-head")).toContainText("παραδομένη");
  // Αυτόματη παράδοση: την έκανε το σύστημα, όχι κάποιος Χρήστης.
  await expect(state).toContainText("από το σύστημα");
  const doneTask = card(page, "Εργασίες").locator("li.g2-task", {
    hasText: TASK,
  });
  await expect(doneTask).toHaveAttribute("data-done", "true");
  await shot(page, "g2-auto-delivered");
});
