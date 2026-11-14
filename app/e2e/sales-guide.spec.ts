import { expect, test } from "@playwright/test";

import { panel as settingsCard } from "./catalogue-parts";
import { formWith, panel, switchUser } from "./knowledge-parts";
import { button, project, shot, signIn } from "./sales-parts";

// «Οδηγός πωλήσεων» (b15): ο Ιδιοκτήτης φτιάχνει μια Ενότητα στη Γνώση, τη διαλέγει στις Ρυθμίσεις › Πωλήσεις, και ο
// πωλητής την ανοίγει από το Pipeline. Τα δύο projects μοιράζονται μία βάση και μία ρύθμιση: ο έλεγχος δεν ζητά
// συγκεκριμένη Ενότητα, μόνο ότι ο σύνδεσμος ανοίγει μία Ενότητα της Γνώσης.
test.describe.configure({ retries: 0 });

test("Οδηγός πωλήσεων: ο Ιδιοκτήτης ορίζει Ενότητα και ο πωλητής την ανοίγει από το Pipeline", async ({
  page,
}) => {
  const name = `Οδηγός πωλήσεων ${project()}-${Date.now()}`;
  await signIn(page, "owner@example.com");

  await page.goto("/app/knowledge/manage?tab=sections");
  const sections = panel(page, "Ενότητες");
  const form = formWith(page, "Περιγραφή (μία πρόταση)");
  await expect(async () => {
    if (!(await form.isVisible()))
      await sections
        .getByRole("button", { name: "Νέα Ενότητα" })
        .first()
        .click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form.getByLabel("Όνομα").fill(name);
  await form
    .getByLabel("Περιγραφή (μία πρόταση)")
    .fill("Σενάρια και απαντήσεις για τις πωλήσεις.");
  await button(form, "Νέα Ενότητα").click();
  await expect(form.getByRole("status")).toContainText(
    "Η Ενότητα δημιουργήθηκε.",
  );

  await page.goto("/app/settings/sales");
  const guide = settingsCard(page, "Οδηγός πωλήσεων");
  await guide.getByLabel("Ενότητα της Γνώσης").selectOption({ label: name });
  await button(guide, "Αποθήκευση").click();
  await expect(guide.getByRole("status")).toContainText("Αποθηκεύτηκε");
  await shot(page, "sales-guide-settings");

  await switchUser(page, "sales@example.com");
  await page.goto("/app/pipeline");
  await page.getByRole("link", { name: "Οδηγός πωλήσεων →" }).click();
  await expect(page).toHaveURL(/\/app\/knowledge\?section=[0-9a-f-]{36}$/);
  await expect(page.getByRole("link", { name: "← Όλη η Γνώση" })).toBeVisible();
  await shot(page, "sales-guide-knowledge");
});
