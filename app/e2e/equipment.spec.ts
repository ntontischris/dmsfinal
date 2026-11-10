import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  openItemFromRegistry,
  openMoreScreens,
  openNewItem,
  openNewTemplate,
} from "./equipment-parts";
import { visit } from "./filming-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Εξοπλισμός (F1, F2, F3) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Το «Κάμερα {project}» το φτιάχνει το
// e2e/seed.mjs (ντουλάπι του studio). Τα τεστ γράφουν στην ίδια βάση, σειριακά: οι νέες εγγραφές φέρουν το όνομα του project.
test.describe.configure({ retries: 0 });


const READ_ONLY_REGISTRY = "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου";
const READ_ONLY_ITEM = "Το μητρώο το αλλάζει μόνο εκείνος.";
const NEW_ITEM_LABEL = "Νέο αντικείμενο";
const TEMPLATES_LABEL = "Πρότυπα εξοπλισμού";

const productionNav = (page: Page): Locator =>
  page.getByRole("navigation", { name: "Παραγωγή", exact: true });

// Ένα αντικείμενο του Προτύπου διαλέγεται από το κουτάκι του (η ετικέτα ξεκινά με το όνομά του).
const pickItem = (template: Locator, name: string): Promise<void> =>
  template.getByRole("checkbox", { name: new RegExp(`^${name}`) }).check();

test("ο Ιδιοκτήτης φτιάχνει Κατηγορία και αντικείμενο, το βάζει σε επισκευή και φτιάχνει Πρότυπο", async ({
  page,
}) => {
  const P = project();
  const CATEGORY = `Κατηγορία ${P}`;
  const ITEM = `Gimbal ${P}`;
  const TEMPLATE = `Ζωντανή ${P}`;
  const CAMERA = `Κάμερα ${P}`;
  const REPAIR_REASON = "Κολλημένος άξονας, επιστρέφει Δευτέρα";

  await signIn(page, "owner@example.com");
  await visit(page, "/app/equipment");
  await expect(
    productionNav(page).getByRole("link", { name: "Εξοπλισμός", exact: true }),
  ).toBeVisible();
  await expect(
    (await openMoreScreens(page)).getByRole("link", { name: TEMPLATES_LABEL, exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(tableRow(page, CAMERA)).toBeVisible();
  await expect(button(page, NEW_ITEM_LABEL)).toBeVisible();

  const categories = card(page, "Κατηγορίες");
  await categories.getByLabel("Νέα Κατηγορία", { exact: true }).fill(CATEGORY);
  await button(categories, "Προσθήκη").click();
  await expect(categories.locator("li", { hasText: CATEGORY })).toBeVisible();

  const newItem = await openNewItem(page);
  await newItem.getByLabel("Όνομα (υποχρεωτικό)").fill(ITEM);
  await newItem.getByLabel("Κατηγορία (υποχρεωτική)").selectOption({ label: CATEGORY });
  await newItem.getByLabel("Κωδικός ή σειριακός").fill("GB-01");
  await button(newItem, "Αποθήκευση").click();
  // Με την επιτυχία η φόρμα κλείνει και το αντικείμενο μπαίνει στο μητρώο.
  await expect(newItem).toHaveCount(0);
  await expect(tableRow(page, ITEM)).toBeVisible();

  await openItemFromRegistry(page, ITEM);
  const item = card(page, ITEM);
  const reason = item.getByLabel("Τι έπαθε και πότε επιστρέφει (υποχρεωτικό)");
  await expect(async () => {
    if (!(await reason.isVisible())) await button(item, "Σε επισκευή").click();
    await expect(reason).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await reason.fill(REPAIR_REASON);
  await button(item, "Σε επισκευή").click();
  await expect(item).toContainText(REPAIR_REASON);
  await expect(item).toContainText("σε επισκευή");
  await expect(card(page, "Ιστορικό")).toContainText(
    `Κατάσταση: διαθέσιμο → σε επισκευή. Λόγος: ${REPAIR_REASON}`,
  );
  await shot(page, "f2-owner-repair");

  await visit(page, "/app/equipment/templates");
  const newTemplate = await openNewTemplate(page);
  await newTemplate.getByLabel("Όνομα (υποχρεωτικό)").fill(TEMPLATE);
  await pickItem(newTemplate, ITEM);
  await pickItem(newTemplate, CAMERA);
  await button(newTemplate, "Αποθήκευση").click();
  await expect(newTemplate).toHaveCount(0);
  await expect(card(page, TEMPLATE)).toContainText(ITEM);
  await expect(card(page, TEMPLATE)).toContainText("σε επισκευή");
  await shot(page, "f3-owner-template");
});

test("η Παραγωγή βλέπει το μητρώο μόνο για ανάγνωση και φτιάχνει Πρότυπο", async ({
  page,
}) => {
  const P = project();
  const CAMERA = `Κάμερα ${P}`;
  const TEMPLATE = `Παραγωγή ${P}`;

  await signIn(page, "production@example.com");
  await visit(page, "/app/equipment");
  await expect(
    productionNav(page).getByRole("link", { name: "Εξοπλισμός", exact: true }),
  ).toBeVisible();

  await expect(page.getByText(READ_ONLY_REGISTRY)).toBeVisible();
  await expect(button(page, NEW_ITEM_LABEL)).toHaveCount(0);
  await expect(card(page, "Κατηγορίες")).toHaveCount(0);
  await expect(tableRow(page, CAMERA)).toBeVisible();
  await shot(page, "f1-production");

  await openItemFromRegistry(page, CAMERA);
  await expect(page.getByText(READ_ONLY_ITEM)).toBeVisible();
  await expect(button(page, "Αλλαγή στοιχείων")).toHaveCount(0);

  await visit(page, "/app/equipment/templates");
  const newTemplate = await openNewTemplate(page);
  await newTemplate.getByLabel("Όνομα (υποχρεωτικό)").fill(TEMPLATE);
  await pickItem(newTemplate, CAMERA);
  await button(newTemplate, "Αποθήκευση").click();
  await expect(newTemplate).toHaveCount(0);
  await expect(card(page, TEMPLATE)).toContainText(CAMERA);
  await shot(page, "f3-production-template");
});

test("ο Ιδιοκτήτης φτιάχνει δύο μονάδες με ποσότητα και τις βλέπει ομαδοποιημένες στο F1", async ({
  page,
}) => {
  const P = project();
  const GROUP = `Μικρόφωνο ${P}`;

  await signIn(page, "owner@example.com");
  await visit(page, "/app/equipment");
  const newItem = await openNewItem(page);
  await newItem.getByLabel("Όνομα (υποχρεωτικό)").fill(GROUP);
  await newItem.getByLabel("Κατηγορία (υποχρεωτική)").selectOption({ label: "Ήχος" });
  await newItem.getByLabel("Ποσότητα").fill("2");
  await button(newItem, "Αποθήκευση").click();
  await expect(newItem).toHaveCount(0);

  const group = page.locator("summary", { hasText: `${GROUP} ×2` });
  await expect(group).toContainText("2 διαθέσιμα");
  await group.click();
  await expect(
    page.getByRole("link", { name: `${GROUP} #1`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `${GROUP} #2`, exact: true }),
  ).toBeVisible();
  await shot(page, "f1-owner-quantity");
});
