import { expect, test } from "@playwright/test";

import { visit } from "./filming-parts";
import { button, project, signIn } from "./sales-parts";

// Ρυθμίσεις › Μηνύματα από άκρη σε άκρη (#164). Ο Ιδιοκτήτης αλλάζει τα λεπτά διόρθωσης σε 20, βλέπει το «20» στο σημείωμα
// του composer της Συνομιλίας και τα επαναφέρει στο 15. Σειριακά και χωρίς retries (η βάση μοιράζεται).
test.describe.configure({ mode: "serial", retries: 0 });

const SAVE = "Αποθήκευση Ρυθμίσεων";
const SAVED = "Οι Ρυθμίσεις αποθηκεύτηκαν.";
const EDIT_LABEL = "Διόρθωση Μηνύματος (λεπτά)";

test("ο Ιδιοκτήτης αλλάζει τα λεπτά διόρθωσης και τα βλέπει στη Συνομιλία", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page, "owner@example.com");
  await visit(page, "/app/settings/messages");
  const form = page.locator("form", {
    has: page.locator('input[name="editMinutes"]'),
  });
  await expect(button(form, SAVE)).toHaveCount(0);
  await form.getByLabel(EDIT_LABEL).fill("20");
  await button(form, SAVE).click();
  await expect(form.getByRole("status")).toContainText(SAVED);

  await visit(page, "/app/messages");
  await page
    .getByLabel("Νέο Μήνυμα προς")
    .selectOption({ label: `Πελάτης Μηνυμάτων ${project()}` });
  await page.getByRole("link", { name: "Νέο Μήνυμα", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);
  await expect(
    page.getByText("μπορείς να το διορθώσεις για 20 λεπτά"),
  ).toBeVisible();

  await visit(page, "/app/settings/messages");
  await form.getByLabel(EDIT_LABEL).fill("15");
  await button(form, SAVE).click();
  await expect(form.getByRole("status")).toContainText(SAVED);
});
