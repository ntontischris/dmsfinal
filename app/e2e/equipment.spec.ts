import { expect, test } from "@playwright/test";

import {
  fieldOf,
  openItemFromRegistry,
  openNewItem,
  openNewTemplate,
} from "./equipment-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Εξοπλισμός (F1, F2, F3) από άκρη σε άκρη. Το «Κάμερα {project}» το φτιάχνει το e2e/seed.mjs (ντουλάπι του studio).
// Τα τεστ γράφουν στην ίδια βάση, σειριακά: οι νέες εγγραφές φέρουν το όνομα του project.
test.describe.configure({ retries: 0 });

const READ_ONLY_REGISTRY =
  "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, όταν φτάσουν.";
const READ_ONLY_ITEM = "Μόνο ανάγνωση: το μητρώο";
const NEW_ITEM_LABEL = "Νέο αντικείμενο";

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
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(
    nav.getByRole("link", { name: "Εξοπλισμός", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Πρότυπα εξοπλισμού", exact: true }),
  ).toBeVisible();

  await page.goto("/app/equipment");
  await expect(tableRow(page, CAMERA)).toBeVisible();
  await expect(page.getByText(NEW_ITEM_LABEL, { exact: true })).toBeVisible();

  const categories = card(page, "Κατηγορίες");
  await fieldOf(categories, "Νέα Κατηγορία").fill(CATEGORY);
  await button(categories, "Προσθήκη").click();
  await expect(categories.getByRole("status")).toContainText(
    "Η Κατηγορία προστέθηκε.",
  );

  const newItem = await openNewItem(page);
  await fieldOf(newItem, "Όνομα").fill(ITEM);
  await fieldOf(newItem, "Κατηγορία").selectOption({ label: CATEGORY });
  await fieldOf(newItem, "Κωδικός ή σειριακός").fill("GB-01");
  await button(newItem, "Δημιουργία").click();
  await expect(newItem.getByRole("status")).toContainText(
    "Το αντικείμενο προστέθηκε στο μητρώο.",
  );
  await expect(tableRow(page, ITEM)).toBeVisible();

  await openItemFromRegistry(page, ITEM);
  const repair = page.locator("form", {
    has: page.getByRole("button", { name: "Σε επισκευή", exact: true }),
  });
  await fieldOf(repair, "Τι έπαθε και πότε επιστρέφει (υποχρεωτικό)").fill(
    REPAIR_REASON,
  );
  await button(repair, "Σε επισκευή").click();
  await expect(card(page, "Κατάσταση")).toContainText(`Λόγος: ${REPAIR_REASON}`);
  await expect(card(page, "Κατάσταση")).toContainText("σε επισκευή");
  await expect(card(page, "Ιστορικό")).toContainText(
    `Κατάσταση: διαθέσιμο → σε επισκευή. Λόγος: ${REPAIR_REASON}`,
  );
  await shot(page, "f2-owner-repair");

  await page.goto("/app/equipment/templates");
  const newTemplate = await openNewTemplate(page);
  await fieldOf(newTemplate, "Όνομα").fill(TEMPLATE);
  await newTemplate
    .getByRole("checkbox", { name: new RegExp(`^${ITEM}`) })
    .check();
  await newTemplate
    .getByRole("checkbox", { name: new RegExp(`^${CAMERA}`) })
    .check();
  await button(newTemplate, "Δημιουργία").click();
  await expect(newTemplate.getByRole("status")).toContainText(
    "Το Πρότυπο αποθηκεύτηκε.",
  );
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
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(
    nav.getByRole("link", { name: "Εξοπλισμός", exact: true }),
  ).toBeVisible();

  await page.goto("/app/equipment");
  await expect(page.getByText(READ_ONLY_REGISTRY)).toBeVisible();
  await expect(page.getByText(NEW_ITEM_LABEL, { exact: true })).toHaveCount(0);
  await expect(card(page, "Κατηγορίες")).toHaveCount(0);
  await expect(tableRow(page, CAMERA)).toBeVisible();
  await shot(page, "f1-production");

  await openItemFromRegistry(page, CAMERA);
  await expect(page.getByText(READ_ONLY_ITEM)).toBeVisible();
  await expect(card(page, "Αλλαγή στοιχείων")).toHaveCount(0);

  await page.goto("/app/equipment/templates");
  const newTemplate = await openNewTemplate(page);
  await fieldOf(newTemplate, "Όνομα").fill(TEMPLATE);
  await newTemplate
    .getByRole("checkbox", { name: new RegExp(`^${CAMERA}`) })
    .check();
  await button(newTemplate, "Δημιουργία").click();
  await expect(newTemplate.getByRole("status")).toContainText(
    "Το Πρότυπο αποθηκεύτηκε.",
  );
  await expect(card(page, TEMPLATE)).toContainText(CAMERA);
  await shot(page, "f3-production-template");
});
