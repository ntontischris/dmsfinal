import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  PRODUCER,
  bookFilmingFromScreen,
  ensureSignedMonthlyAgreement,
  filmingSpecDay,
  fieldOf,
  upcomingDay,
  visit,
} from "./filming-parts";
import { button, inContext, project, signIn } from "./sales-parts";

// Δελτίο γυρίσματος (#136) από άκρη σε άκρη: ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2
// με «Τι άλλαξε», και βλέπει το ιστορικό. Σειριακά και χωρίς retries, όπως το filming.spec.ts.
// Κλείνει Γύρισμα κάτω από τη μηνιαία Συμφωνία του project. Τη μοιράζεται με το filming.spec.ts (η Ευκαιρία του seed
// παίρνει μία μόνο Συμφωνία): όποιο τρέξει πρώτο την υπογράφει, ώστε να περνά σε οποιοδήποτε shard.
test.describe.configure({ mode: "serial", retries: 0 });

// Το πάνελ «Δελτίο» της σελίδας του Γυρίσματος (ο τίτλος του πάνελ είναι h2 «Δελτίο»).
const sheetPanel = (page: Page): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "Δελτίο", exact: true }),
  });

// Η φόρμα του πάνελ βρίσκεται από ένα στοιχείο της (πρόγονός του)· κάθε φόρμα έχει το δικό της μήνυμα (role=status).
// Το `has` ενός `form` ψάχνει απογόνους του, όχι προγόνους, οπότε δεν δουλεύει με τη `section` του πάνελ.
// Το κουμπί της επεξεργασίας κρύβεται μετά την αποθήκευση (`onlyWhenChanged`), γι' αυτό η φόρμα της βρίσκεται από το πεδίο.
const formOf = (anchor: Locator): Locator =>
  anchor.locator("xpath=ancestor::form");
const editorForm = (sheet: Locator): Locator =>
  formOf(sheet.getByRole("textbox", { name: "Νέα λήψη" }));
const issueForm = (sheet: Locator): Locator =>
  formOf(sheet.getByRole("button", { name: "Έκδοση Δελτίου", exact: true }));

test("ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2 με το ιστορικό", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await ensureSignedMonthlyAgreement(page, browser, P);
  await bookFilmingFromScreen(page, P, upcomingDay(20, Number(filmingSpecDay().slice(8))));
  const filmingUrl = page.url();

  await inContext(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    await owner.getByLabel(PRODUCER, { exact: true }).check();
    await button(owner, "Αποθήκευση Συνεργείου").click();

    const sheet = sheetPanel(owner);
    await expect(
      sheet.getByText("Δεν έχει εκδοθεί", { exact: true }),
    ).toBeVisible();
    await addShot(sheet, "Είσοδος");
    await addShot(sheet, "Πάγκος");
    const editor = editorForm(sheet);
    await button(editor, "Αποθήκευση Δελτίου").click();
    await expect(editor.getByRole("status")).toContainText(
      "Το Δελτίο αποθηκεύτηκε.",
    );

    const issue = issueForm(sheet);
    await button(issue, "Έκδοση Δελτίου").click();
    await expect(issue.getByRole("status")).toContainText(
      "Εκδόθηκε η έκδοση 1",
    );
    await expect(
      sheet.getByText("Έκδοση 1 ·", { exact: false }).first(),
    ).toBeVisible();
  });

  await inContext(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    const sheet = sheetPanel(owner);
    await sheet
      .getByRole("textbox", { name: "Κείμενο λήψης 2" })
      .fill("Πάγκος κοντά");
    const editor = editorForm(sheet);
    await button(editor, "Αποθήκευση Δελτίου").click();
    await expect(editor.getByRole("status")).toContainText(
      "Το Δελτίο αποθηκεύτηκε.",
    );

    const issue = issueForm(sheet);
    await fieldOf(issue, "Τι άλλαξε").fill("Άλλαξε η δεύτερη λήψη");
    await button(issue, "Έκδοση Δελτίου").click();
    await expect(issue.getByRole("status")).toContainText(
      "Εκδόθηκε η έκδοση 2",
    );

    await expect(
      sheet.locator("li", { hasText: "Άλλαξε η δεύτερη λήψη" }),
    ).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 1 ·" })).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 2 ·" })).toBeVisible();
  });

  // Η έκδοση 2 μηδένισε τις απαντήσεις: η Ρένα (μέλος του Συνεργείου, χωρίς Δικαίωμα) επιβεβαιώνει την τρέχουσα έκδοση.
  await inContext(browser, "production@example.com", async (producer) => {
    await visit(producer, filmingUrl);
    const sheet = sheetPanel(producer);
    await expect(
      sheet.getByText("Περιμένει απάντηση", { exact: true }),
    ).toBeVisible();
    await button(sheet, "Επιβεβαιώνω").click();
    await expect(sheet.getByText("Επιβεβαίωσε", { exact: true })).toBeVisible();
    await expect(button(sheet, "Επιβεβαιώνω")).toHaveCount(0);
  });
});

// Προσθέτει μία λήψη στη φόρμα του Δελτίου (το πεδίο δεν έχει όνομα· το κουμπί είναι «Προσθήκη λήψης»).
async function addShot(sheet: Locator, text: string): Promise<void> {
  await sheet.getByRole("textbox", { name: "Νέα λήψη" }).fill(text);
  await button(sheet, "Προσθήκη λήψης").click();
}
