import {
  expect,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

import { signOutsideSystem } from "./agreements-flows-parts";
import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { button, inContext, tableRow } from "./sales-parts";

// Βοηθητικά του e2e/filming.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Κάθε τεστ φτιάχνει ό,τι χρειάζεται: η Συμφωνία της ροής γράφεται από την ίδια τη ροή, με τον Πελάτη του seed.

export const FILMING_URL = /\/app\/filming\/[0-9a-f-]{36}$/;
export const PRODUCER = "Ρένα Παραγωγή";

// Ανοίγει μια διεύθυνση και περιμένει να φορτώσουν τα scripts: πριν από αυτό, ένα κλικ σε φόρμα πέφτει σε υποβολή χωρίς JS.
export async function visit(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
}

export const fieldOf = (scope: Page | Locator, label: string): Locator =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select, textarea");

// Ο Πελάτης και η Ευκαιρία του seed, με το όνομα του project.
export const clientName = (P: string): string => `Πελάτης Γυρισμάτων ${P}`;
export const opportunityTitle = (P: string): string => `Γυρίσματα ${P}`;

// Η ημέρα του Γυρίσματος: 15 του τρέχοντος μήνα (Ώρα Ελλάδας), μέσα στην τρέχουσα Περίοδο της Συμφωνίας.
export function currentFifteenth(now: Date = new Date()): string {
  const month = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return `${month}-15`;
}

// Η ροή της Συμφωνίας: η Άννα συντάσσει την πρόταση με μηνιαίο πακέτο, ο Ιδιοκτήτης την υπογράφει εκτός συστήματος.
export async function signedMonthlyAgreement(
  page: Page,
  browser: Browser,
  P: string,
): Promise<void> {
  const agreementUrl = await draftProposal(page, {
    title: opportunityTitle(P),
    kind: "μηνιαία",
  });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await inContext(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await signOutsideSystem(owner, P);
  });
}

// Οι δύο λειτουργίες (desktop, mobile) μοιράζονται τη βάση: ώρες που δεν επικαλύπτονται, ώστε το Συνεργείο να μην συγκρούεται.
export const startTimeOf = (P: string): string => (P === "mobile" ? "15:00" : "10:00");

// Η Άννα κλείνει Γύρισμα στην E4 για τον Πελάτη της Συμφωνίας (15 του μήνα, 3 ώρες). Μετά την επιτυχία η οθόνη πάει στο Γύρισμα.
export async function bookFilmingFromScreen(
  page: Page,
  P: string,
): Promise<void> {
  await visit(page, "/app/filming/new");
  const form = page.locator("form", {
    has: page.getByRole("button", { name: "Κλείσιμο Γυρίσματος", exact: true }),
  });
  await fieldOf(form, "Πελάτης").selectOption({ label: clientName(P) });
  await fieldOf(form, "Ημερομηνία").fill(currentFifteenth());
  await fieldOf(form, "Ώρα").fill(startTimeOf(P));
  await fieldOf(form, "Διάρκεια (ώρες)").fill("3");
  await button(form, "Κλείσιμο Γυρίσματος").click();
  await expect(page).toHaveURL(FILMING_URL);
}

// Ανοίγει το Γύρισμα του Πελάτη του τεστ από τη λίστα E1 (η πρώτη γραμμή του).
export async function openFilmingFromList(
  page: Page,
  P: string,
): Promise<void> {
  await visit(page, "/app/filming");
  await tableRow(page, clientName(P)).getByRole("link").first().click();
  await expect(page).toHaveURL(FILMING_URL);
}
