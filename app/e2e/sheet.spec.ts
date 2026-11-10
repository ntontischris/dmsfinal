import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  PRODUCER,
  addToCrew,
  bookFilmingFromScreen,
  ensureSignedMonthlyAgreement,
  filmingSpecDay,
  inSpaces,
  upcomingDay,
  visit,
} from "./filming-parts";
import { button, project, signIn } from "./sales-parts";

// Δελτίο γυρίσματος (#136) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι): ο Ιδιοκτήτης στέλνει Έκδοση 1, αλλάζει μία λήψη
// και βγάζει Έκδοση 2 με «Τι άλλαξε», και βλέπει το ιστορικό. Σειριακά και χωρίς retries, όπως το filming.spec.ts.
// Κλείνει Γύρισμα κάτω από τη μηνιαία Συμφωνία του project. Τη μοιράζεται με το filming.spec.ts (η Ευκαιρία του seed
// παίρνει μία μόνο Συμφωνία): όποιο τρέξει πρώτο την υπογράφει, ώστε να περνά σε οποιοδήποτε shard.
test.describe.configure({ mode: "serial", retries: 0 });

// Η Συμφωνία υπογράφεται σε δικά της contexts και κάθε Χρήστης μπαίνει ξεχωριστά: η ροή θέλει περισσότερο χρόνο.
test.setTimeout(90_000);


// Ένα πάνελ της σελίδας του Γυρίσματος, από τον τίτλο του (h2).
const panel = (page: Page, title: string): Locator =>
  page.locator("section", {
    has: page.getByRole("heading", { name: title, exact: true }),
  });

// Κάθε αλλαγή του Δελτίου αποθηκεύεται αμέσως· το τελευταίο μήνυμα της βάσης φαίνεται κάτω από το πάνελ (role=status).
const lastStatus = (sheet: Locator): Locator => sheet.getByRole("status");

test("ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2 με το ιστορικό", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await ensureSignedMonthlyAgreement(page, browser, P);
  await bookFilmingFromScreen(page, P, upcomingDay(20, Number(filmingSpecDay().slice(8))));
  const filmingUrl = page.url();

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    await addToCrew(owner, PRODUCER);

    const sheet = panel(owner, "Δελτίο γυρίσματος");
    await expect(sheet.getByText("Δεν έχει σταλεί ακόμα Δελτίο.", { exact: true })).toBeVisible();
    await addShot(sheet, "Είσοδος");
    await addShot(sheet, "Πάγκος");
    await expect(lastStatus(sheet)).toContainText("Το Δελτίο αποθηκεύτηκε.");

    await button(sheet, "Αποστολή Δελτίου").click();
    await expect(lastStatus(sheet)).toContainText("Εκδόθηκε η έκδοση 1");
    await expect(sheet.locator("li", { hasText: "Έκδοση 1" })).toBeVisible();
  });

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    const sheet = panel(owner, "Δελτίο γυρίσματος");
    const second = sheet.getByRole("textbox", { name: "Κείμενο λήψης 2" });
    await expect(second).toHaveValue("Πάγκος");
    await second.fill("Πάγκος κοντά");
    await second.press("Enter");
    await expect(lastStatus(sheet)).toContainText("Το Δελτίο αποθηκεύτηκε.");

    await sheet.getByLabel("Τι άλλαξε (υποχρεωτικό)").fill("Άλλαξε η δεύτερη λήψη");
    await button(sheet, "Νέα έκδοση").click();
    await expect(lastStatus(sheet)).toContainText("Εκδόθηκε η έκδοση 2");

    await expect(sheet.locator("li", { hasText: "Άλλαξε η δεύτερη λήψη" })).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 1" })).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 2" })).toBeVisible();
  });

  // Η έκδοση 2 μηδένισε τις απαντήσεις: η Ρένα (μέλος του Συνεργείου, χωρίς Δικαίωμα) επιβεβαιώνει την τρέχουσα έκδοση.
  await inSpaces(browser, "production@example.com", async (producer) => {
    await visit(producer, filmingUrl);
    const mine = panel(producer, "Είσαι στο Συνεργείο");
    await expect(mine.getByText("Περιμένει απάντηση", { exact: true }).first()).toBeVisible();
    await button(mine, "Επιβεβαιώνω").click();
    await expect(mine.getByText("επιβεβαιώνω", { exact: true }).first()).toBeVisible();
    await expect(button(mine, "Επιβεβαιώνω")).toHaveCount(0);
  });
});

// Προσθέτει μία λήψη στο Δελτίο (πεδίο «Νέο πλάνο», κουμπί «Προσθήκη»)· η λήψη αποθηκεύεται αμέσως. Ό,τι γράφεται
// πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται μέχρι να ενεργοποιηθεί το κουμπί.
async function addShot(sheet: Locator, text: string): Promise<void> {
  const draft = sheet.getByRole("textbox", { name: "Νέο πλάνο" });
  await expect(async () => {
    await draft.fill(text);
    await expect(button(sheet, "Προσθήκη")).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await button(sheet, "Προσθήκη").click();
  await expect(sheet.getByRole("textbox", { name: /^Κείμενο λήψης / }).last()).toHaveValue(text);
}
