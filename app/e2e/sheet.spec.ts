import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  PRODUCER,
  bookFilmingFromScreen,
  currentDay,
  fieldOf,
  visit,
} from "./filming-parts";
import { button, inContext, project, signIn } from "./sales-parts";

// Δελτίο γυρίσματος (#136) από άκρη σε άκρη: ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2
// με «Τι άλλαξε», και βλέπει το ιστορικό. Σειριακά και χωρίς retries, όπως το filming.spec.ts.
// Κλείνει Γύρισμα κάτω από τη Συμφωνία που έχει ήδη υπογράψει το filming.spec.ts· δεν γράφει νέα, γιατί η Ευκαιρία
// του seed παίρνει μία μόνο Συμφωνία.
test.describe.configure({ mode: "serial", retries: 0 });

// Το πάνελ «Δελτίο» της σελίδας του Γυρίσματος (ο τίτλος του πάνελ είναι h2 «Δελτίο»).
const sheetPanel = (page: Page): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: "Δελτίο", exact: true }),
  });

// Η φόρμα του πάνελ που έχει το κουμπί· κάθε φόρμα έχει το δικό της μήνυμα (role=status).
// Η φόρμα βρίσκεται από το κουμπί της (πρόγονός του), γιατί το `has` ενός `form` ψάχνει απογόνους του,
// όχι προγόνους, οπότε η `section` του πάνελ δεν βρίσκεται μέσα στη φόρμα και δεν ταιριάζει ποτέ.
const formWith = (scope: Locator, name: string): Locator =>
  scope
    .getByRole("button", { name, exact: true })
    .locator("xpath=ancestor::form");

test("ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2 με το ιστορικό", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await bookFilmingFromScreen(page, P, currentDay(20));
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
    const editor = formWith(sheet, "Αποθήκευση Δελτίου");
    await button(editor, "Αποθήκευση Δελτίου").click();
    await expect(editor.getByRole("status")).toContainText(
      "Το Δελτίο αποθηκεύτηκε.",
    );

    const issue = formWith(sheet, "Έκδοση Δελτίου");
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
    const editor = formWith(sheet, "Αποθήκευση Δελτίου");
    await button(editor, "Αποθήκευση Δελτίου").click();
    await expect(editor.getByRole("status")).toContainText(
      "Το Δελτίο αποθηκεύτηκε.",
    );

    const issue = formWith(sheet, "Έκδοση Δελτίου");
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
});

// Προσθέτει μία λήψη στη φόρμα του Δελτίου (το πεδίο δεν έχει όνομα· το κουμπί είναι «Προσθήκη λήψης»).
async function addShot(sheet: Locator, text: string): Promise<void> {
  await sheet.getByRole("textbox", { name: "Νέα λήψη" }).fill(text);
  await button(sheet, "Προσθήκη λήψης").click();
}
