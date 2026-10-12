import { expect, test } from "@playwright/test";

import { visit } from "./filming-parts";
import { button, signIn } from "./sales-parts";

// Κανόνες Παραδοτέων (Ρυθμίσεις › Παραδοτέα) από άκρη σε άκρη. Ο Ιδιοκτήτης αλλάζει την προθεσμία του βίντεο και την
// γυρίζει πίσω. Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ mode: "serial", retries: 0 });

test("ο Ιδιοκτήτης αλλάζει την προθεσμία του βίντεο και την επαναφέρει", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await visit(page, "/app/settings/deliverables");
  const rules = page.locator("form", {
    has: page.locator('input[name="changesDays"]'),
  });
  await expect(button(rules, "Αποθήκευση Κανόνων")).toHaveCount(0);
  await rules.getByLabel("Προθεσμία βίντεο").fill("14");
  await button(rules, "Αποθήκευση Κανόνων").click();
  await expect(rules.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );
  await expect(button(rules, "Αποθήκευση Κανόνων")).toHaveCount(0);

  await page.reload();
  await expect(rules.getByLabel("Προθεσμία βίντεο")).toHaveValue("14");
  await rules.getByLabel("Προθεσμία βίντεο").fill("10");
  await button(rules, "Αποθήκευση Κανόνων").click();
  await expect(rules.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );
});
