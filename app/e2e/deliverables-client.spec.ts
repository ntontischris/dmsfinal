import { expect, test, type Page } from "@playwright/test";

import { fieldOf, openProduction } from "./productions-parts";
import { button, project, shot, signIn } from "./sales-parts";

// Ο κύκλος με τον πελάτη (H3, H4): ο Ιδιοκτήτης ανεβάζει, ο Χρήστης πελάτη ζητά αλλαγές και εγκρίνει.
// Η Παραγωγή είναι του Πελάτη Κρατήσεων του seed (χωρίς Συμφωνία)· ο Χρήστης πελάτη είναι «client.{project}@example.com».
// Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ retries: 0 });

const CLIENT_EMAIL = () => `client.${project()}@example.com`;
const DELIVERABLE_URL = /\/app\/deliverables\/[0-9a-f-]{36}$/;
const LINK_V1 = "https://drive.google.com/file/d/e2e-client-v1";
const LINK_V2 = "https://drive.google.com/file/d/e2e-client-v2";
const CHANGE_NOTE = "Κόψε το τέλος";
const INTERNAL_COMMENT = "Εσωτερικό: μην το δείξεις στον πελάτη";

// Η Έκδοση από Ελεγκτή (ο Ιδιοκτήτης) πάει κατευθείαν στον πελάτη, χωρίς «Στείλε».
async function addVersion(page: Page, link: string): Promise<void> {
  const form = page.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη Έκδοσης", exact: true }),
  });
  await fieldOf(form, "Link Έκδοσης (Google Drive, Vimeo ή YouTube)").fill(link);
  await button(form, "Προσθήκη Έκδοσης").click();
  await expect(form.getByRole("status")).toContainText("Η νέα Έκδοση προστέθηκε.");
}

async function openClientDeliverables(page: Page, title: string): Promise<void> {
  await page.goto("/app/deliverables");
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(DELIVERABLE_URL);
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

test("ο Ιδιοκτήτης ανεβάζει, ο πελάτης ζητά αλλαγές, ο Ιδιοκτήτης ανεβάζει ξανά και ο πελάτης εγκρίνει", async ({
  page,
}) => {
  const P = project();
  const PRODUCTION = `Παραγωγή Πελάτη ${P}`;
  const DELIVERABLE = `Reel πελάτη ${P}`;

  // 1. Ο Ιδιοκτήτης φτιάχνει το Παραδοτέο και ανεβάζει Έκδοση 1 (πάει στον πελάτη).
  await signIn(page, "owner@example.com");
  await openProduction(page, PRODUCTION);
  await page.getByText("Νέο Παραδοτέο", { exact: true }).click();
  const create = page.locator("details", { hasText: "Στοιχεία νέου Παραδοτέου" });
  await fieldOf(create, "Τίτλος").fill(DELIVERABLE);
  await button(create, "Δημιουργία").click();
  await expect(create.getByRole("status")).toContainText("Το Παραδοτέο δημιουργήθηκε.");
  await page.getByRole("link", { name: DELIVERABLE, exact: true }).click();
  await expect(page).toHaveURL(DELIVERABLE_URL);
  const deliverableUrl = page.url();
  await addVersion(page, LINK_V1);
  await expect(page.locator("article", { hasText: "Έκδοση 1" }).locator("header")).toContainText(
    "Αναμένει πελάτη",
  );

  // 2. Ο πελάτης βλέπει το Παραδοτέο στο «Περιμένουν εσένα» και ζητά αλλαγές με σημείωση.
  await signIn(page, CLIENT_EMAIL());
  await page.getByRole("navigation", { name: "Οθόνες" }).getByRole("link", { name: "Παραδοτέα", exact: true }).click();
  const waiting = page.locator("section", { hasText: "Περιμένουν εσένα" });
  await expect(waiting.getByRole("link", { name: DELIVERABLE, exact: true })).toBeVisible();
  await shot(page, "h3-client-waiting");
  await openClientDeliverables(page, DELIVERABLE);
  const changes = page.locator("form", {
    has: page.getByRole("button", { name: "Ζήτησε αλλαγές", exact: true }),
  });
  await fieldOf(changes, "Σημείωση (υποχρεωτική)").fill(CHANGE_NOTE);
  await button(changes, "Ζήτησε αλλαγές").click();
  // Μετά την απάντηση η φόρμα φεύγει (δεν ζητιέται πια)· ελέγχουμε την κατάσταση.
  await expect(page.getByText("Ζητήθηκαν αλλαγές", { exact: true }).first()).toBeVisible();
  await shot(page, "h4-client-changes-requested");

  // 3. Ο Ιδιοκτήτης βλέπει το αίτημα, σχολιάζει εσωτερικά και ανεβάζει Έκδοση 2.
  await signIn(page, "owner@example.com");
  await page.goto(deliverableUrl);
  await addVersion(page, LINK_V2);
  const version2 = page.locator("article", { hasText: "Έκδοση 2" });
  const internal = version2.locator("form", {
    has: page.getByRole("button", { name: "Σχόλιο", exact: true }),
  });
  await fieldOf(internal, "Σχόλιο").fill(INTERNAL_COMMENT);
  await internal.getByLabel("Εσωτερικό (ο πελάτης δεν το βλέπει)").check();
  await button(internal, "Σχόλιο").click();
  await expect(version2).toContainText(INTERNAL_COMMENT);

  // 4. Ο πελάτης βλέπει την Έκδοση 2 χωρίς το εσωτερικό σχόλιο και την εγκρίνει.
  await signIn(page, CLIENT_EMAIL());
  await openClientDeliverables(page, DELIVERABLE);
  await expect(page.getByText(INTERNAL_COMMENT)).toHaveCount(0);
  const approve = page.locator("form", {
    has: page.getByRole("button", { name: "Ενέκρινε", exact: true }),
  });
  await approve.getByLabel("Η έγκριση είναι τελική").check();
  await button(approve, "Ενέκρινε").click();
  await expect(page.getByText("Εγκρίθηκε", { exact: true }).first()).toBeVisible();
  await shot(page, "h4-client-approved");
});
