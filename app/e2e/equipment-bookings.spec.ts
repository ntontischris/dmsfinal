import { expect, test, type Locator, type Page } from "@playwright/test";

import { openItemFromRegistry, openNewItem } from "./equipment-parts";
import {
  bookFilmingFromScreen,
  ensureSignedMonthlyAgreement,
  upcomingDay,
  visit,
} from "./filming-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Εξοπλισμός (c10): το μητρώο δείχνει το επόμενο Γύρισμα κάθε αντικειμένου και φιλτράρει «Ελεύθερο στις» μια μέρα·
// από τη σελίδα του Γυρίσματος σημειώνεται βλάβη σε δεσμευμένο αντικείμενο. Το αντικείμενο το φτιάχνει το τεστ
// (όνομα με το project), ώστε η βλάβη να μην αγγίζει την «Κάμερα» των άλλων spec. Μέρα που δεν πέφτει στα 15/20/24.
test.describe.configure({ mode: "serial", retries: 0 });
test.setTimeout(90_000);

const equipmentPanel = (page: Page): Locator => card(page, "Εξοπλισμός");

// Η μέρα «ΕΕΕΕ-ΜΜ-ΗΗ» ενός έτους μετά, όπου το αντικείμενο σίγουρα δεν έχει Γύρισμα.
const nextYear = (day: string): string =>
  `${Number(day.slice(0, 4)) + 1}${day.slice(4)}`;

test("ο Ιδιοκτήτης βλέπει το επόμενο Γύρισμα στο μητρώο, φιλτράρει «Ελεύθερο στις» και σημειώνει βλάβη από το Γύρισμα", async ({
  page,
  browser,
}) => {
  const P = project();
  const ITEM = `Φακός ${P}`;
  const DAY = upcomingDay(27, 24);
  const DAMAGE = "Ράγισε ο μπροστινός φακός";

  await signIn(page, "owner@example.com");
  await ensureSignedMonthlyAgreement(page, browser, P);

  await visit(page, "/app/equipment");
  const newItem = await openNewItem(page);
  await newItem.getByLabel("Όνομα (υποχρεωτικό)").fill(ITEM);
  await newItem
    .getByLabel("Κατηγορία (υποχρεωτική)")
    .selectOption({ label: "Κάμερες" });
  await button(newItem, "Αποθήκευση").click();
  await expect(newItem).toHaveCount(0);
  await expect(tableRow(page, ITEM)).toContainText("Κανένα");

  await bookFilmingFromScreen(page, P, DAY);
  const filmingUrl = page.url();
  const panel = equipmentPanel(page);
  await panel
    .getByRole("combobox", { name: "Εξοπλισμός", exact: true })
    .selectOption({ label: `${ITEM} · Κάμερες` });
  await button(panel, "Δέσμευση").click();
  await expect(
    panel.getByRole("link", { name: ITEM, exact: true }),
  ).toBeVisible();

  // Στο μητρώο: σύνδεσμος στο Γύρισμα, και το φίλτρο κρύβει το αντικείμενο τη μέρα του Γυρίσματος.
  await visit(page, "/app/equipment");
  const row = tableRow(page, ITEM);
  await expect(
    row.locator(`a[href="${new URL(filmingUrl).pathname}"]`),
  ).toBeVisible();
  const freeOn = page.getByLabel("Ελεύθερο στις");
  await expect(async () => {
    await freeOn.fill(DAY);
    await expect(freeOn).toHaveValue(DAY, { timeout: 1_000 });
  }).toPass();
  await expect(row).toHaveCount(0);
  await freeOn.fill(nextYear(DAY));
  await expect(row).toBeVisible();
  await shot(page, "f1-free-on");

  // Βλάβη από τη σελίδα του Γυρίσματος.
  await visit(page, filmingUrl);
  const note = equipmentPanel(page).getByLabel(`Τι έπαθε: ${ITEM};`);
  await expect(async () => {
    if (!(await note.isVisible()))
      await button(equipmentPanel(page), `Βλάβη: ${ITEM}`).click();
    await expect(note).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await note.fill(DAMAGE);
  await button(equipmentPanel(page), "Σε επισκευή").click();
  await expect(equipmentPanel(page)).toContainText(
    "Η βλάβη γράφτηκε· το αντικείμενο είναι «Σε επισκευή».",
  );
  await expect(button(equipmentPanel(page), `Βλάβη: ${ITEM}`)).toHaveCount(0);
  await shot(page, "e3-equipment-damage");

  await openItemFromRegistry(page, ITEM);
  await expect(card(page, ITEM)).toContainText(DAMAGE);
  await expect(card(page, "Ιστορικό")).toContainText(
    `Κατάσταση: διαθέσιμο → σε επισκευή. Λόγος: ${DAMAGE}`,
  );
});
