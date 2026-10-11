import { expect, test } from "@playwright/test";

import { fieldOf, openProduction } from "./productions-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Παραδοτέα (H1, H2, ενότητα της G2) από άκρη σε άκρη. Το «Showreel {project}» είναι Εσωτερική Παραγωγή του seed
// (Υπεύθυνος ο Ιδιοκτήτης), άρα το Παραδοτέο δεν θέλει Παροχή και ο Ιδιοκτήτης είναι ελεγκτής.
// Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ retries: 0 });

const DELIVERABLE_URL = /\/app\/deliverables\/[0-9a-f-]{36}$/;
const LINK = "https://drive.google.com/file/d/e2e-deliverable-v1";
const COMMENT = "Ο ήχος θέλει διόρθωση";
const TIMECODE = "0:42";

test("ο Ιδιοκτήτης φτιάχνει Παραδοτέο, το στέλνει, το σχολιάζει και το εγκρίνει στην Εσωτερική Παραγωγή", async ({
  page,
}) => {
  const P = project();
  const PRODUCTION = `Showreel ${P}`;
  const DELIVERABLE = `Reel ${P}`;

  await signIn(page, "owner@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: /Παραδοτέα$/ })).toBeVisible();

  await openProduction(page, PRODUCTION);
  const deliverables = card(page, "Παραδοτέα");
  await page.getByText("Νέο Παραδοτέο", { exact: true }).click();
  const create = page.locator("details", {
    hasText: "Στοιχεία νέου Παραδοτέου",
  });
  await fieldOf(create, "Τίτλος").fill(DELIVERABLE);
  await button(create, "Δημιουργία").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );
  await deliverables
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();

  await expect(page).toHaveURL(DELIVERABLE_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: DELIVERABLE, exact: true }),
  ).toBeVisible();

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
  const version = page.locator("article", { hasText: "Έκδοση 1" });
  await expect(version.locator("header")).toContainText("Αναμένει πελάτη");

  const comment = version.locator("form", {
    has: page.getByRole("button", { name: "Σχόλιο", exact: true }),
  });
  await fieldOf(comment, "Σχόλιο").fill(COMMENT);
  await fieldOf(comment, "Χρόνος (mm:ss, προαιρετικός)").fill(TIMECODE);
  await button(comment, "Σχόλιο").click();
  await expect(version).toContainText(COMMENT);
  await expect(version).toContainText(TIMECODE);
  await shot(page, "h2-owner-version-sent");

  await page.goto("/app/deliverables");
  await page
    .getByRole("navigation", { name: "Καρτέλες Παραδοτέων" })
    .getByRole("link", { name: "Στον πελάτη", exact: true })
    .click();
  await expect(tableRow(page, DELIVERABLE)).toBeVisible();
  await shot(page, "h1-client-tab");

  await tableRow(page, DELIVERABLE)
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();
  const approve = page.locator("form", {
    has: page.getByRole("button", { name: "Ενέκρινε", exact: true }),
  });
  await button(approve, "Ενέκρινε").click();
  // Μετά την έγκριση η φόρμα φεύγει (δεν ζητιέται πια), γι' αυτό ελέγχουμε την κατάσταση, όχι το μήνυμα.
  await expect(
    page.getByText("Εγκρίθηκε", { exact: true }).first(),
  ).toBeVisible();
});
