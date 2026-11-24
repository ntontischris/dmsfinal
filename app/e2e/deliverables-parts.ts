import { expect, type Locator, type Page } from "@playwright/test";

import { openBoxes, visit } from "./filming-parts";
import { button } from "./sales-parts";

// Βοηθητικά των e2e των Παραδοτέων (H1–H4, ενότητα της G2), στη νέα εμφάνιση (Χώροι).

export const DELIVERABLE_URL = /\/app\/deliverables\/[0-9a-f-]{36}$/;
export const PRODUCTION_URL = /\/app\/productions\/[0-9a-f-]{36}$/;

const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Ο τίτλος της σελίδας γράφεται με τελεία στο τέλος («Reel desktop.»).
export const pageTitle = (page: Page, title: string): Locator =>
  page.getByRole("heading", {
    level: 1,
    name: new RegExp(`^${escapeRegex(title)}\\.?$`),
  });

// Το κουμπί μιας Έκδοσης στο H2: «v1 · αναμένει πελάτη».
export const versionTab = (
  page: Page,
  version: number,
  state: string,
): Locator => button(page, `v${version} · ${state}`);

// Νέα Εσωτερική Παραγωγή από τη G1 (Υπεύθυνος ο Ιδιοκτήτης). Μετά τη δημιουργία ανοίγει η σελίδα της (G2).
export async function createInternalProduction(
  page: Page,
  title: string,
): Promise<void> {
  await visit(page, "/app/productions");
  const form = page.locator("form", {
    has: page.getByRole("heading", {
      name: "Νέα Εσωτερική Παραγωγή",
      exact: true,
    }),
  });
  await expect(async () => {
    if (!(await form.isVisible()))
      await button(page, "Νέα Εσωτερική Παραγωγή").click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  // Οι τιμές ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η φόρμα χάνεται, οπότε ξαναγράφεται.
  const titleBox = form.locator('input[name="title"]');
  await expect(async () => {
    await titleBox.fill(title);
    await expect(titleBox).toHaveValue(title, { timeout: 1_000 });
  }).toPass();
  await form
    .locator('select[name="ownerId"]')
    .selectOption({ label: "Γιώργος Ιδιοκτήτης" });
  await button(form, "Δημιουργία").click();
  await expect(page).toHaveURL(PRODUCTION_URL);
  await expect(pageTitle(page, title)).toBeVisible();
}

// Το κουτί «Παραδοτέα» της G2 (ο τίτλος του κουτιού είναι h2).
export const deliverablesPanel = (page: Page): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "Παραδοτέα", exact: true }),
  });

// «Νέο Παραδοτέο» στη G2: η φόρμα ανοίγει μέσα στο πάνελ, με τον τίτλο προσυμπληρωμένο (τον αλλάζουμε).
export async function createDeliverable(
  page: Page,
  title: string,
): Promise<void> {
  const panel = deliverablesPanel(page);
  // Το κουτί είναι κλειστό στην αρχή (details.ml-box).
  const box = panel.locator("details.ml-box").first();
  if ((await box.getAttribute("open")) === null)
    await box.locator("> summary").click();
  const form = panel.locator("form", {
    has: page.getByRole("button", {
      name: "Δημιουργία Παραδοτέου",
      exact: true,
    }),
  });
  await expect(async () => {
    if (!(await form.isVisible())) await button(panel, "Νέο Παραδοτέο").click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form.getByLabel("Τίτλος", { exact: true }).fill(title);
  await button(form, "Δημιουργία Παραδοτέου").click();
  await expect(form.getByRole("status")).toContainText(
    "Το Παραδοτέο δημιουργήθηκε.",
  );
}

// «Νέα Έκδοση» στο H2. Με επιτυχία η φόρμα κλείνει και η νέα Έκδοση φαίνεται ως καρτέλα με την κατάστασή της.
export async function addVersion(
  page: Page,
  link: string,
  expected: { version: number; state: string },
): Promise<void> {
  const form = page.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη Έκδοσης", exact: true }),
  });
  // Τα κουτιά του H2 είναι κλειστά στην αρχή (details.ml-box)· το «Νέα Έκδοση» είναι στο κουτί «Ενέργειες».
  await expect(async () => {
    await openBoxes(page);
    if (!(await form.isVisible())) await button(page, "Νέα Έκδοση").click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await form
    .getByLabel("Link Έκδοσης (Google Drive, Vimeo ή YouTube)")
    .fill(link);
  await button(form, "Προσθήκη Έκδοσης").click();
  await expect(
    versionTab(page, expected.version, expected.state),
  ).toBeVisible();
}

// Το κουτί «Εκδόσεις» του H2 (κλειστό στην αρχή, το ανοίγει το openBoxes): η επιλεγμένη Έκδοση με τα σχόλιά της και τη φόρμα σχολίου.
export const versionsPanel = (page: Page): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "Εκδόσεις", exact: true }),
  });

// Σχόλιο της ομάδας στην επιλεγμένη Έκδοση του H2.
export async function addTeamComment(
  page: Page,
  comment: { body: string; timecode?: string; isInternal?: boolean },
): Promise<void> {
  await openBoxes(page);
  const versions = versionsPanel(page);
  const form = versions.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη σχολίου", exact: true }),
  });
  await form.getByLabel("Νέο σχόλιο").fill(comment.body);
  if (comment.timecode)
    await form
      .getByLabel("Χρόνος στο video (mm:ss, προαιρετικό)")
      .fill(comment.timecode);
  if (comment.isInternal)
    await form.getByLabel("Εσωτερικό (δεν το βλέπει ο πελάτης)").check();
  await button(form, "Προσθήκη σχολίου").click();
  await expect(form.getByRole("status")).toContainText("Το σχόλιο προστέθηκε.");
  await expect(versions).toContainText(comment.body);
}
