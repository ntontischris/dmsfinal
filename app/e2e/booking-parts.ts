import { expect, type Browser, type Page } from "@playwright/test";

import { signOutsideSystem } from "./agreements-flows-parts";
import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { inContext } from "./sales-parts";

// Βοηθητικά του e2e/booking.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Ο Πελάτης κρατήσεων (seed) έχει ένα Χρήστη πελάτη με Ρόλο «Πλήρης»· η Συμφωνία του υπογράφεται μέσα από τις οθόνες.

export const CLIENT_PRODUCT_NAME = (P: string): string => `Πελάτης Κρατήσεων ${P}`;
export const CLIENT_EMAIL = (P: string): string => `client.${P}@example.com`;
export const BOOKING_OPPORTUNITY = (P: string): string => `Κρατήσεις ${P}`;

// Η ώρα των κρατήσεων του τεστ: ολόκληρο το Ωράριο 08:00–20:00 (ίδιο για όλα τα specs).
export const OPEN_FROM = "08:00";
export const OPEN_TO = "20:00";

// Η Συμφωνία του Πελάτη κρατήσεων: μηνιαία, υπογραμμένη εκτός συστήματος από τον Ιδιοκτήτη.
export async function signedBookingAgreement(page: Page, browser: Browser, P: string): Promise<void> {
  const agreementUrl = await draftProposal(page, { title: BOOKING_OPPORTUNITY(P), kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await inContext(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await signOutsideSystem(owner, P);
  });
}

// Ο Πελάτης διαλέγει την πρώτη ελεύθερη μέρα, διάρκεια 2 ώρες και την πρώτη ελεύθερη ώρα, και επιβεβαιώνει.
export async function bookFirstFreeSlot(page: Page, options: { reschedule?: boolean } = {}): Promise<void> {
  await page.locator('a[href*="day="]').first().click();
  await page.getByRole("link", { name: "2 ώρες", exact: true }).click();
  await page.locator('a[href*="time="]').first().click();
  const submit = options.reschedule ? "Επιβεβαίωση μετάθεσης" : "Επιβεβαίωση";
  await page.getByRole("button", { name: submit, exact: true }).click();
}

// Ο Ιδιοκτήτης ορίζει το Ωράριο 08:00–20:00 για όλες τις μέρες, Χωρητικότητα 2, διάρκειες 2 και 3, βήμα 60.
// Τα πεδία της φόρμας εδώ, όχι σε όλη τη σελίδα: η φόρμα των εξαιρέσεων έχει δικό της πεδίο «Χωρητικότητα».
export async function setOpeningHours(page: Page): Promise<void> {
  await page.goto("/app/settings/filming", { waitUntil: "networkidle" });
  const hoursForm = page.locator("form", {
    has: page.getByRole("button", { name: "Αποθήκευση Ωραρίου", exact: true }),
  });
  for (const dow of [1, 2, 3, 4, 5, 6, 7]) {
    await hoursForm.locator(`input[name="open-${dow}"]`).check();
    await hoursForm.locator(`input[name="from-${dow}"]`).fill(OPEN_FROM);
    await hoursForm.locator(`input[name="to-${dow}"]`).fill(OPEN_TO);
  }
  await hoursForm.locator('input[name="capacity"]').fill("2");
  await hoursForm.locator('select[name="stepMinutes"]').selectOption("60");
  for (const hours of ["1", "1.5", "2", "2.5", "3", "4", "5", "6", "8"]) {
    await hoursForm.locator(`input[name="durations"][value="${hours}"]`).setChecked(hours === "2" || hours === "3");
  }
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    hoursForm.getByRole("button", { name: "Αποθήκευση Ωραρίου", exact: true }).click(),
  ]);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('input[name="from-1"]')).toHaveValue(OPEN_FROM);
  await expect(page.locator('input[name="capacity"]').first()).toHaveValue("2");
}

export const EXCEPTION_NOTE = (P: string): string => `e2e εξαίρεση ${P} ${Date.now()}`;
