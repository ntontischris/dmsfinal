import { expect, type Browser, type Locator, type Page } from "@playwright/test";

import { signOutsideSystem } from "./agreements-flows-parts";
import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { button, inContext, signIn } from "./sales-parts";

// Βοηθητικά του e2e/filming.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Κάθε τεστ φτιάχνει ό,τι χρειάζεται: η Συμφωνία της ροής γράφεται από την ίδια τη ροή, με τον Πελάτη του seed.
// Οι οθόνες των Γυρισμάτων είναι στη νέα εμφάνιση (Χώροι).

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
  return currentDay(15, now);
}

// Μια μέρα του τρέχοντος μήνα (Ώρα Ελλάδας), «ΕΕΕΕ-ΜΜ-ΗΗ».
export function currentDay(day: number, now: Date = new Date()): string {
  const month = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return `${month}-${String(day).padStart(2, "0")}`;
}

// Μέρα Γυρίσματος που δεν έχει περάσει (το πεδίο δεν δέχεται μέρα πριν από σήμερα): η «preferred» του μήνα, ή αύριο αν
// η «preferred» πέρασε· ποτέ η «avoid» (η μέρα που κλείνει άλλο τεστ με τις ίδιες ώρες). Ώρα Ελλάδας.
// Μένει πάντα μέσα στον τρέχοντα μήνα, δηλαδή στην τρέχουσα Περίοδο της Συμφωνίας: στο τέλος του μήνα κόβεται στην
// τελευταία του μέρα (την τελευταία μέρα του μήνα αυτό μπορεί να είναι το σήμερα, που το πεδίο δέχεται).
// Στις δύο τελευταίες μέρες του μήνα το «avoid» μπορεί να μη χωρά· τότε τα δύο τεστ πέφτουν την ίδια μέρα.
export function upcomingDay(preferred: number, avoid: number, now: Date = new Date()): string {
  const part = (options: Intl.DateTimeFormatOptions): number =>
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", ...options }).format(now));
  const today = part({ day: "numeric" });
  const lastDay = new Date(Date.UTC(part({ year: "numeric" }), part({ month: "numeric" }), 0)).getUTCDate();
  const day = Math.max(preferred, today + 1);
  const pick = day === avoid ? day + 1 : day;
  return currentDay(Math.min(pick, lastDay), now);
}

// Η μέρα του Γυρίσματος του filming.spec.ts· το sheet.spec.ts την αποφεύγει, ώστε τα δύο να μη συμπίπτουν.
export const filmingSpecDay = (now: Date = new Date()): string => upcomingDay(15, 20, now);

// Η ροή της Συμφωνίας: η Άννα συντάσσει την πρόταση με μηνιαίο πακέτο, ο Ιδιοκτήτης την υπογράφει εκτός συστήματος.
// Οι οθόνες των Συμφωνιών δεν είναι της παραγωγής: τρέχουν σε δικό τους context, με την εμφάνιση που ορίζει η εφαρμογή.
export async function signedMonthlyAgreement(browser: Browser, P: string): Promise<void> {
  await inContext(browser, "sales@example.com", async (sales) => {
    const agreementUrl = await draftProposal(sales, {
      title: opportunityTitle(P),
      kind: "μηνιαία",
    });
    await addCatalogueLine(sales, `Μηνιαία Παρουσία ${P}`);
    await inContext(browser, "owner@example.com", async (owner) => {
      await owner.goto(agreementUrl);
      await signOutsideSystem(owner, P);
    });
  });
}

// Ένας άλλος Χρήστης σε δικό του context, στη νέα εμφάνιση (Χώροι)· κλείνει πάντα όταν τελειώσει το βήμα.
export async function inSpaces(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Η φόρμα της E4 (Νέο Γύρισμα): βρίσκεται από το κουμπί της.
export const newFilmingForm = (page: Page): Locator =>
  page.locator("form", {
    has: page.getByRole("button", { name: "Δημιουργία Γυρίσματος", exact: true }),
  });

// Η μηνιαία Συμφωνία του project, μόνο αν δεν υπάρχει ήδη. Τα αρχεία μοιράζονται σε μηχανήματα (shards) και τρέχουν
// με οποιαδήποτε σειρά: όποιο φτάσει πρώτο την υπογράφει, τα άλλα τη βρίσκουν. Η E4 δείχνει μόνο Πελάτες με
// Συμφωνία σε ενεργή Περίοδο, οπότε ο Πελάτης στη λίστα σημαίνει ότι η Συμφωνία υπάρχει.
export async function ensureSignedMonthlyAgreement(
  page: Page,
  browser: Browser,
  P: string,
): Promise<void> {
  await visit(page, "/app/filming/new");
  const empty = page.getByText("Κανένας πελάτης με ενεργή Συμφωνία", { exact: true });
  const form = newFilmingForm(page);
  await expect(form.or(empty)).toBeVisible();
  if (await form.isVisible()) {
    const option = form.getByRole("combobox", { name: "Πελάτης", exact: true }).locator("option", { hasText: clientName(P) });
    if ((await option.count()) > 0) return;
  }
  await signedMonthlyAgreement(browser, P);
}

// Οι δύο λειτουργίες (desktop, mobile) μοιράζονται τη βάση: ώρες που δεν επικαλύπτονται, ώστε το Συνεργείο να μην συγκρούεται.
export const startTimeOf = (P: string): string => (P === "mobile" ? "15:00" : "10:00");

// Κλείνει Γύρισμα στην E4 για τον Πελάτη της Συμφωνίας (15 του μήνα, 3 ώρες). Μετά την επιτυχία η οθόνη πάει στο Γύρισμα.
// Οι τιμές της φόρμας ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται μέχρι να μείνει.
export async function bookFilmingFromScreen(
  page: Page,
  P: string,
  date: string = currentFifteenth(),
): Promise<void> {
  await visit(page, "/app/filming/new");
  const form = newFilmingForm(page);
  const day = form.locator('input[name="date"]');
  await expect(async () => {
    await form.getByRole("combobox", { name: "Πελάτης", exact: true }).selectOption({ label: clientName(P) });
    await day.fill(date);
    await form.locator('input[name="time"]').fill(startTimeOf(P));
    await expect(day).toHaveValue(date, { timeout: 1_000 });
  }).toPass();
  await button(form, "3 ώρες").click();
  await expect(button(form, "3 ώρες")).toHaveAttribute("aria-pressed", "true");
  await button(form, "Δημιουργία Γυρίσματος").click();
  await expect(page).toHaveURL(FILMING_URL);
}

// Η γραμμή ενός Γυρίσματος στη λίστα E1 (ο τίτλος της είναι ο Πελάτης).
export const filmingRow = (page: Page, P: string): Locator =>
  page.locator("li.part-row", { has: page.getByRole("link", { name: clientName(P), exact: true }) });

// Ανοίγει το Γύρισμα του Πελάτη του τεστ από τη λίστα E1 (η πρώτη γραμμή του).
export async function openFilmingFromList(
  page: Page,
  P: string,
): Promise<void> {
  await visit(page, "/app/filming");
  await page.getByRole("link", { name: clientName(P), exact: true }).first().click();
  await expect(page).toHaveURL(FILMING_URL);
}

// Η γραμμή ενός μέλους στο πάνελ «Συνεργείο» της E3.
export const crewRow = (page: Page, name: string): Locator =>
  page
    .locator("section", { has: page.getByRole("heading", { name: "Συνεργείο", exact: true }) })
    .locator("li", { hasText: name });

// Προσθέτει άτομο στο Συνεργείο της E3. Η επιλογή ζει στο React· ό,τι διαλεχτεί πριν ζωντανέψει η σελίδα χάνεται.
export async function addToCrew(page: Page, name: string): Promise<void> {
  const crew = page.locator("section", {
    has: page.getByRole("heading", { name: "Συνεργείο", exact: true }),
  });
  await expect(async () => {
    await crew.getByLabel("Άτομο", { exact: true }).selectOption({ label: name });
    await expect(button(crew, "Προσθήκη")).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await button(crew, "Προσθήκη").click();
}
