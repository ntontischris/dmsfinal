import { expect, type Browser, type Page } from "@playwright/test";

import { signOutsideSystem } from "./agreements-flows-parts";
import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { signIn } from "./sales-parts";
// Με άλλο όνομα: δεν είναι React hook, το «use» μπερδεύει τον κανόνα των hooks.
import { useSpacesLook as addSpacesLook } from "./walkthrough/spaces";

// Βοηθητικά του e2e/booking.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Ο Πελάτης κρατήσεων (seed) έχει ένα Χρήστη πελάτη με Ρόλο «Πλήρης»· η Συμφωνία του υπογράφεται μέσα από τις οθόνες.

export const CLIENT_PRODUCT_NAME = (P: string): string =>
  `Πελάτης Κρατήσεων ${P}`;
export const CLIENT_EMAIL = (P: string): string => `client.${P}@example.com`;
export const BOOKING_OPPORTUNITY = (P: string): string => `Κρατήσεις ${P}`;

// Η ώρα των κρατήσεων του τεστ: ολόκληρο το Ωράριο 08:00–20:00 (ίδιο για όλα τα specs).
export const OPEN_FROM = "08:00";
export const OPEN_TO = "20:00";

// Το μέρος «Ωράριο και Χωρητικότητα» των Ρυθμίσεων Γυρισμάτων (εκεί και οι εξαιρέσεις).
export const HOURS_URL = "/app/settings/filming?part=hours";

// Ένας άλλος Χρήστης σε δικό του browser context στους Χώρους, που κλείνει πάντα όταν τελειώσει το βήμα.
export async function inSpaces(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await addSpacesLook(context);
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Η Συμφωνία του Πελάτη κρατήσεων: μηνιαία, υπογραμμένη εκτός συστήματος από τον Ιδιοκτήτη.
export async function signedBookingAgreement(
  page: Page,
  browser: Browser,
  P: string,
): Promise<void> {
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, {
    title: BOOKING_OPPORTUNITY(P),
    kind: "μηνιαία",
  });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await inSpaces(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await signOutsideSystem(owner, P);
  });
}

// Αλλάζει Χρήστη στην ίδια σελίδα: «Έξοδος», μετά είσοδος με το άλλο email (το /login δεν φαίνεται όσο είσαι μέσα).
export async function switchUser(page: Page, email: string): Promise<void> {
  // Η έξοδος είναι ενέργεια στον server και περιμένει σειρά πίσω από κάθε ανανέωση της σελίδας που τρέχει·
  // αν η φόρμα εισόδου ανοίξει πριν τελειώσει, η έξοδος ακυρώνεται και ο χρήστης μένει συνδεδεμένος.
  // Στους Χώρους η «Έξοδος» είναι στο μενού προφίλ (κουμπί «Προφίλ: …»)· στην παλιά εμφάνιση φαίνεται κατευθείαν.
  const signOut = page.getByRole("button", { name: "Έξοδος", exact: true });
  if (!(await signOut.isVisible()))
    await page.getByRole("button", { name: /^Προφίλ: / }).click();
  await signOut.click();
  await page.waitForURL(/\/login/);
  await signIn(page, email);
}

// Ο Πελάτης διαλέγει την πρώτη ελεύθερη μέρα, διάρκεια 2 ώρες και την πρώτη ελεύθερη ώρα, και επιβεβαιώνει.
// Κάθε επιλογή γράφεται στη διεύθυνση και φέρνει το επόμενο βήμα από τη βάση.
export async function bookFirstFreeSlot(
  page: Page,
  options: { reschedule?: boolean } = {},
): Promise<void> {
  await page.locator("button.e-day:enabled").first().click();
  await expect(page).toHaveURL(/day=/);
  const durations = page.locator("section.kit-panel", {
    has: page.getByRole("heading", { name: "2. Πόσες ώρες;" }),
  });
  await durations.getByRole("button", { name: "2 ώρες", exact: true }).click();
  await expect(page).toHaveURL(/hours=2/);
  const times = page.locator("section.kit-panel", {
    has: page.getByRole("heading", { name: "3. Τι ώρα ξεκινάμε;" }),
  });
  await times.locator(".e-times button:enabled").first().click();
  await expect(page).toHaveURL(/time=/);
  const submit = options.reschedule
    ? "Επιβεβαίωση μετάθεσης"
    : "Επιβεβαίωση κράτησης";
  await page.getByRole("button", { name: submit, exact: true }).click();
}

// Ο Ιδιοκτήτης ορίζει το Ωράριο 08:00–20:00 για όλες τις μέρες, Χωρητικότητα 2, διάρκειες 2 και 3, βήμα 60.
// Τα πεδία της φόρμας εδώ, όχι σε όλη τη σελίδα: η φόρμα των εξαιρέσεων έχει δικό της πεδίο «Χωρητικότητα».
export async function setOpeningHours(page: Page): Promise<void> {
  await page.goto(HOURS_URL, { waitUntil: "networkidle" });
  const hoursForm = page.locator("form", {
    has: page.locator('select[name="open-1"]'),
  });
  for (const dow of [1, 2, 3, 4, 5, 6, 7]) {
    await hoursForm.locator(`select[name="open-${dow}"]`).selectOption("on");
    await hoursForm.locator(`input[name="from-${dow}"]`).fill(OPEN_FROM);
    await hoursForm.locator(`input[name="to-${dow}"]`).fill(OPEN_TO);
  }
  await hoursForm.locator('input[name="capacity"]').fill("2");
  await hoursForm.locator('select[name="stepMinutes"]').selectOption("60");
  for (const hours of ["1", "1.5", "2", "2.5", "3", "4", "5", "6", "8"]) {
    await hoursForm
      .locator(`input[name="durations"][value="${hours}"]`)
      .setChecked(hours === "2" || hours === "3");
  }
  const saveButton = hoursForm.getByRole("button", {
    name: "Αποθήκευση",
    exact: true,
  });
  // Το κουμπί ανάβει μόνο όταν κάτι άλλαξε· αν το Ωράριο είναι ήδη ό,τι θέλουμε, δεν υπάρχει τι να αποθηκευτεί.
  if (await saveButton.isEnabled()) {
    await saveButton.click();
    await expect(hoursForm.getByRole("status")).toBeVisible();
  }
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('input[name="from-1"]')).toHaveValue(OPEN_FROM);
  await expect(page.locator('input[name="capacity"]').first()).toHaveValue("2");
}

export const EXCEPTION_NOTE = (P: string): string =>
  `e2e εξαίρεση ${P} ${Date.now()}`;
