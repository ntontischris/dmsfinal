import { expect, type Locator, type Page } from "@playwright/test";

import {
  SIGNATORY,
  openOpportunity,
  previousMonthStart,
  readSigningCode,
  wrongCodeFor,
} from "./agreements-parts";
import { control, panel, screenHeader } from "./catalogue-parts";
import { button, shot, tableRow } from "./sales-parts";

// Τα πολυβηματικά κομμάτια του e2e/agreements.spec.ts: η σελίδα του πελάτη (D5), η υπογραφή εκτός συστήματος και η αποθήκευση των Ρυθμίσεων.

// Ο πελάτης βλέπει το έγγραφο με τιμές και ΦΠΑ, και τίποτα εσωτερικό: ούτε κόστος, ούτε Παρεκκλίσεις, ούτε Εγκρίσεις.
export async function checkPublicDocument(anon: Page, P: string) {
  const document = anon.locator("main");
  await expect(document).toContainText(`Πρόταση προς Πελάτης Συμφωνιών ${P}`);
  await expect(document).toContainText(`Μηνιαία Παρουσία ${P}`);
  await expect(document).toContainText(/1\.300,00\s€/);
  await expect(document).toContainText("ΦΠΑ 24%");
  await expect(document).toContainText(/1\.612,00\s€/);
  await expect(button(anon, "Υπογραφή")).toBeVisible();
  for (const internal of [
    "Εκτιμώμενο",
    "Περιθώριο",
    "Κόστος ώρας",
    "Παρέκκλιση",
    "Έγκριση",
  ])
    await expect(document).not.toContainText(internal);
  await shot(anon, "d5-public");
}

// Ονοματεπώνυμο και «Αποδέχομαι» → κωδικός (τον διαβάζει η ομάδα από τα εξερχόμενα στη σελίδα `team`) → λάθος κωδικός → σωστός.
export async function signAsVisitor(anon: Page, team: Page) {
  await button(anon, "Υπογραφή").click();
  await control(anon, "Ονοματεπώνυμο").fill(SIGNATORY);
  await anon.getByRole("checkbox", { name: "Αποδέχομαι τους όρους" }).check();
  await button(anon, "Συνέχεια").click();
  await expect(
    anon.getByText("Θα σας δώσουμε τον εξαψήφιο κωδικό"),
  ).toBeVisible();

  // Ο κωδικός δεν φεύγει με email: τον βλέπει η ομάδα στα εξερχόμενα και τον λέει στον πελάτη.
  const code = await readSigningCode(team);
  await control(anon, "Κωδικός 6 ψηφίων").fill(wrongCodeFor(code));
  await button(anon, "Επιβεβαίωση").click();
  await expect(anon.getByText("Ο κωδικός δεν είναι σωστός")).toBeVisible();
  await control(anon, "Κωδικός 6 ψηφίων").fill(code);
  await button(anon, "Επιβεβαίωση").click();
  await expect(
    anon.getByRole("status").filter({ hasText: "Υπογράφηκε" }),
  ).toBeVisible();
  await shot(anon, "d5-signed");
}

// «Υπογράφηκε εκτός συστήματος» με Έναρξη τον προηγούμενο μήνα: ζητά τι έχει ήδη καταναλωθεί και αν τιμολογήθηκε ο μήνας.
export async function signOutsideSystem(owner: Page, P: string) {
  await button(owner, "Υπογράφηκε εκτός συστήματος").click();
  const actions = panel(owner, "Ενέργειες");
  await control(actions, "Αρχείο υπογραφής").fill(`symfonia-${P}.pdf`);
  await control(actions, "Ποιος υπέγραψε").fill(SIGNATORY);
  await control(actions, "Έναρξη").fill(previousMonthStart());
  await actions.getByLabel(/Έχουν ήδη καταναλωθεί · reels/).fill("3");
  await actions
    .getByRole("checkbox", {
      name: "Ο τρέχων μήνας τιμολογήθηκε ήδη εκτός συστήματος",
    })
    .check();
  await button(actions, "Καταχώριση υπογραφής").click();
  await expect(
    owner.getByText("Καταχωρίστηκε η υπογραφή εκτός συστήματος"),
  ).toBeVisible();
}

// Πατά «Αποθήκευση» στο πάνελ και περιμένει να γυρίσει η απάντηση του server: το μήνυμα μιας προηγούμενης αποθήκευσης
// μένει στη θέση του, άρα μόνο το μήνυμα δεν αποδεικνύει ότι η νέα αποθήκευση τελείωσε.
export async function saveAndWait(page: Page, scope: Locator) {
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await button(scope, "Αποθήκευση").click();
  await saved;
}

// D4 από τον Ιδιοκτήτη: η Απόρριψη χωρίς σχόλιο δεν περνά, με σχόλιο γυρίζει την πρόταση στη Σύνταξη.
export async function ownerRejects(owner: Page, title: string) {
  await owner.goto("/app/agreements/approvals");
  const item = owner.locator("section").filter({ hasText: title });
  await expect(item).toContainText("Ελεύθερη γραμμή: «Ειδικό βίντεο»");
  await shot(owner, "d4-approvals");
  await button(item, "Απόρριψη").click();
  await expect(owner.getByText("Γράψε σχόλιο")).toBeVisible();
  await control(item, "Σχόλιο").fill("Πολύ ακριβά");
  await button(item, "Απόρριψη").click();
  await expect(owner.getByText("Απορρίφθηκε")).toBeVisible();
}

// Η Έγκριση στέλνει την πρόταση αμέσως, χωρίς δεύτερο βήμα.
export async function ownerApproves(owner: Page, title: string) {
  await owner.goto("/app/agreements/approvals");
  const item = owner.locator("section").filter({ hasText: title });
  await button(item, "Εγκρίνω").click();
  await expect(owner.getByText("Εγκρίθηκε και στάλθηκε")).toBeVisible();
}

// Ο Νίκος (πωλητής με δικό του Πελάτη) δεν βλέπει τις προτάσεις της Άννας ούτε την ουρά Εγκρίσεων.
export async function checkNikosSeesNothing(nikos: Page, P: string) {
  const nav = nikos.getByRole("navigation", { name: "Οθόνες" });
  await expect(
    nav.getByRole("link", { name: "Προτάσεις προς έγκριση" }),
  ).toHaveCount(0);
  await nikos.goto("/app/agreements");
  for (const letter of ["Α", "Β", "Γ", "Δ"])
    await expect(nikos.getByText(`Πρόταση ${letter} ${P}`)).toHaveCount(0);
  await nikos.goto("/app/agreements/approvals");
  await expect(
    nikos.getByRole("heading", { name: "Χωρίς δικαίωμα", exact: true }),
  ).toBeVisible();
}

const SAVED = "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα";

// Μέρες πληρωμής των μηνιαίων: 30, αποθηκεύεται και διαβάζεται πάλι· οι Ρυθμίσεις γυρίζουν πάντα στο 15, ό,τι κι αν γίνει.
export async function changePaymentDays(page: Page) {
  const terms = panel(page, "Όροι Συμφωνίας");
  const save = async (days: string) => {
    await control(terms, "Μέρες πληρωμής").fill(days);
    await saveAndWait(page, terms);
  };
  try {
    await save("30");
    await expect(terms.getByRole("status")).toContainText(SAVED);
    await expect(terms).toContainText("ανοιχτές προτάσεις");
    await page.reload();
    await expect(control(terms, "Μέρες πληρωμής")).toHaveValue("30");
  } finally {
    await save("15");
  }
  await page.reload();
  await expect(control(terms, "Μέρες πληρωμής")).toHaveValue("15");
}

// Όριο αλλαγών του «reel»: 3, αποθηκεύεται και διαβάζεται πάλι· γυρίζει πάντα στο 2.
export async function changeReelRounds(page: Page) {
  const limits = panel(page, "Όριο αλλαγών");
  const rounds = tableRow(limits, "reel").locator("input");
  const save = async (value: string) => {
    await rounds.fill(value);
    await saveAndWait(page, limits);
  };
  try {
    await save("3");
    await expect(limits.getByRole("status")).toContainText(SAVED);
    await page.reload();
    await expect(rounds).toHaveValue("3");
  } finally {
    await save("2");
  }
  await page.reload();
  await expect(rounds).toHaveValue("2");
}

// Μετά την υπογραφή με Σύνδεσμο: η D2 είναι ενεργή με την υπογραφή καταγεγραμμένη, η B4 κερδισμένη, η D1 τη βάζει στις Ενεργές.
export async function checkSignedByLink(
  page: Page,
  agreement: { agreementUrl: string; title: string },
) {
  await page.goto(agreement.agreementUrl);
  await expect(
    screenHeader(page).getByText("ενεργή", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Υπέγραψε ${SIGNATORY}`)).toBeVisible();
  await expect(
    page.getByText("κωδικός που παραδόθηκε χειροκίνητα"),
  ).toBeVisible();
  await shot(page, "d2-signed");

  await openOpportunity(page, agreement.title);
  await expect(
    page.getByText("Κερδισμένη με την υπογραφή της Συμφωνίας"),
  ).toBeVisible();
  await expect(
    page.getByText(`Υπογράφηκε η Συμφωνία από ${SIGNATORY}`),
  ).toBeVisible();

  await page.goto("/app/agreements");
  await control(page, "Προβολή").selectOption({ label: "Ενεργές" });
  await expect(tableRow(page, agreement.title)).toBeVisible();
  await shot(page, "d1-agreements");
}

// «Θέλω αλλαγές» από τον πελάτη: το μήνυμα φεύγει προς την ομάδα και η πρόταση μένει ανοιχτή.
export async function requestChangesAsVisitor(anon: Page) {
  await button(anon, "Θέλω αλλαγές").click();
  await control(anon, "Τι θέλετε να αλλάξει;").fill("Θέλουμε 10 reels");
  await button(anon, "Αποστολή").click();
  await expect(anon.getByText("Στάλθηκε στην ομάδα")).toBeVisible();
}

// «Απόρριψη» από τον Υπογράφοντα: ο Σύνδεσμος γίνεται «δεν είναι πια ανοιχτή».
export async function declineAsVisitor(anon: Page) {
  await anon.reload();
  await button(anon, "Απόρριψη").click();
  await button(anon, "Ναι, απορρίπτω την πρόταση").click();
  await expect(anon.getByText("Η πρόταση απορρίφθηκε")).toBeVisible();
  await anon.reload();
  await expect(anon.getByText("δεν είναι πια ανοιχτή")).toBeVisible();
}

// Η Διαχείριση βλέπει το κόστος της στιγμής της υπογραφής: 800 € εκτιμώμενο, Εύρος από 1.040 €, περιθώριο 500 € · 38,5%.
export async function checkFrozenCost(page: Page) {
  const cost = panel(page, "Κόστος και περιθώριο");
  await expect(cost).toContainText(/Εκτιμώμενο κόστος\s*800,00\s€/);
  await expect(cost).toContainText(/Εύρος τιμής\s*1\.040,00\s€/);
  await expect(cost).toContainText(/500,00\s€\s·\s38,5%/);
  await expect(cost).toContainText("Αντίγραφο της στιγμής της υπογραφής.");
  await expect(control(page, "Ώρες γυρίσματος")).toHaveCount(0);
}
