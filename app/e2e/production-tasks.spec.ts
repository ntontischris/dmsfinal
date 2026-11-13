import { expect, test } from "@playwright/test";

import { PRODUCER, visit } from "./filming-parts";
import { createInternal } from "./productions-parts";
import {
  button,
  card,
  inSpacesContext,
  project,
  shot,
  signIn,
} from "./sales-parts";

// Εργασίες, «Οι εργασίες μου» (G4), Πίνακας Σταδίων και Φόρτος ανά άτομο (G1), από άκρη σε άκρη στη νέα εμφάνιση (Χώροι).
// Η Εσωτερική Παραγωγή φτιάχνεται εδώ, με το όνομα του project, ώστε να μη μπλέκει με τα άλλα τεστ.
test.describe.configure({ retries: 0 });

const OWNER_NAME = "Γιώργος Ιδιοκτήτης";

// Προθεσμία πάντα στο μέλλον: πέντε μέρες από σήμερα, σε μορφή yyyy-mm-dd.
const dueInFiveDays = (): string => {
  const day = new Date();
  day.setDate(day.getDate() + 5);
  return day.toISOString().slice(0, 10);
};

test("ο Ιδιοκτήτης αναθέτει Εργασία υψηλής προτεραιότητας και η Παραγωγή την ξεκινά και την κλείνει από τις εργασίες της", async ({
  page,
  browser,
}) => {
  const P = project();
  const TITLE = `Εργασίες ${P}`;
  const TASK = `Μοντάζ teaser ${P}`;

  await signIn(page, "owner@example.com");
  await createInternal(page, TITLE, OWNER_NAME);

  const tasks = card(page, "Εργασίες");
  const taskTitle = tasks.getByLabel("Τίτλος εργασίας", { exact: true });
  // Οι τιμές ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await taskTitle.fill(TASK);
    await expect(button(tasks, "Προσθήκη εργασίας")).toBeEnabled({
      timeout: 1_000,
    });
  }).toPass();
  await tasks.getByLabel("Ανατεθειμένος").selectOption({ label: PRODUCER });
  await tasks.getByLabel("Προθεσμία (προαιρετική)").fill(dueInFiveDays());
  await button(tasks, "Προσθήκη εργασίας").click();
  await expect(tasks.getByRole("status")).toContainText(
    "Η Εργασία προστέθηκε.",
  );
  const task = tasks.locator("li.g2-task", { hasText: TASK });
  await task.getByLabel("Προτεραιότητα").selectOption("high");
  await expect(task).toContainText("υψηλή προτεραιότητα");
  await shot(page, "g2-task-priority");

  await inSpacesContext(browser, "production@example.com", async (producer) => {
    await visit(producer, "/app/tasks");
    await expect(
      producer.getByRole("heading", { level: 1, name: /Οι εργασίες μου/ }),
    ).toBeVisible();
    const row = producer.locator("li.part-row", { hasText: TASK });
    await expect(row).toContainText("υψηλή προτεραιότητα");
    await expect(row).toContainText(TITLE);
    await button(row, "Ξεκίνησα").click();
    await expect(row).toContainText("σε εξέλιξη");
    await button(row, "Έγινε").click();
    await expect(button(row, "Ξανάνοιγμα")).toBeVisible();
    await expect(row).toHaveAttribute("data-faded", "true");
    await shot(producer, "g4-my-tasks");
  });

  // Ο Ιδιοκτήτης βλέπει την κλεισμένη Εργασία στη Σελίδα Παραγωγής.
  await page.reload();
  await expect(
    card(page, "Εργασίες").locator("li.g2-task", { hasText: TASK }),
  ).toHaveAttribute("data-done", "true");
});

test("ο Ιδιοκτήτης μετακινεί μια Παραγωγή στον Πίνακα Σταδίων και βλέπει τον Φόρτο ανά άτομο", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Πίνακας ${P}`;

  await signIn(page, "owner@example.com");
  await createInternal(page, TITLE, OWNER_NAME);

  await visit(page, "/app/productions?mode=board");
  const board = page.getByRole("list", { name: "Πίνακας Σταδίων" });
  const noStage = board.getByRole("listitem", { name: "Χωρίς στάδιο" });
  await expect(noStage.getByRole("link", { name: TITLE })).toBeVisible();

  const stage = page.getByLabel(`Στάδιο: ${TITLE}`, { exact: true });
  // Η επιλογή ζωντανεύει μόλις φορτώσει η σελίδα· ξαναδοκιμάζεται μέχρι η κάρτα να περάσει στο Μοντάζ.
  const editing = board.getByRole("listitem", { name: "Μοντάζ" });
  await expect(async () => {
    await stage.selectOption({ label: "Μοντάζ" });
    await expect(editing.getByRole("link", { name: TITLE })).toBeVisible({
      timeout: 2_000,
    });
  }).toPass();
  await shot(page, "g1-board");

  await page
    .getByRole("link", { name: "Φόρτος ανά άτομο", exact: true })
    .click();
  const load = page.locator(`table[aria-label="Φόρτος ανά άτομο"]`);
  await expect(load).toBeVisible();
  await expect(load.locator("tr", { hasText: OWNER_NAME })).toBeVisible();
  await shot(page, "g1-workload");
});
