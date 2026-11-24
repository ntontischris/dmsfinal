import { expect, test, type Locator, type Page } from "@playwright/test";

import { visit } from "./filming-parts";
import { button, card, signIn } from "./sales-parts";

// Κανόνες Παραδοτέων (Ρυθμίσεις › Παραδοτέα, O5) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Ο Ιδιοκτήτης αλλάζει την
// προθεσμία του βίντεο και την γυρίζει πίσω. Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ mode: "serial", retries: 0 });

// Τα κουτιά Ρυθμίσεων (SettingsCard) είναι κλειστά από προεπιλογή: ανοίγουν πριν γεμίσουν τα πεδία τους.
async function openBoxes(page: Page): Promise<void> {
  await page
    .locator("details.ml-box")
    .evaluateAll((boxes) =>
      boxes.forEach((box) => ((box as HTMLDetailsElement).open = true)),
    );
}

// Το κουμπί ανάβει μόνο μετά από αλλαγή· ό,τι γράφεται πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
async function fillUntilSaveEnables(card: Locator, value: string) {
  await expect(async () => {
    await openBoxes(card.page());
    await card.getByLabel("Προθεσμία βίντεο").fill(value);
    await expect(button(card, "Αποθήκευση")).toBeEnabled({ timeout: 1_000 });
  }).toPass();
}

test("ο Ιδιοκτήτης αλλάζει την προθεσμία του βίντεο και την επαναφέρει", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await visit(page, "/app/settings/deliverables");
  const deadlines = card(page, "Προθεσμία ανά είδος Παροχής");
  await expect(button(deadlines, "Αποθήκευση")).toBeDisabled();
  await fillUntilSaveEnables(deadlines, "14");
  await button(deadlines, "Αποθήκευση").click();
  await expect(deadlines.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );
  await expect(button(deadlines, "Αποθήκευση")).toBeDisabled();

  await page.reload();
  await expect(deadlines.getByLabel("Προθεσμία βίντεο")).toHaveValue("14");
  await fillUntilSaveEnables(deadlines, "10");
  await button(deadlines, "Αποθήκευση").click();
  await expect(deadlines.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );
});
