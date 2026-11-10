import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  PRODUCER,
  bookFilmingFromScreen,
  ensureSignedMonthlyAgreement,
  filmingSpecDay,
  upcomingDay,
  visit,
} from "./filming-parts";
import { button, card, project, signIn } from "./sales-parts";
// Με άλλο όνομα: δεν είναι React hook (ο κανόνας των hooks κοιτά μόνο το όνομα).
import { useSpacesLook as addSpacesCookie } from "./walkthrough/spaces";

// Δελτίο γυρίσματος (#136) από άκρη σε άκρη: ο Ιδιοκτήτης βγάζει Έκδοση 1, αλλάζει μία λήψη και βγάζει Έκδοση 2
// με «Τι άλλαξε», και βλέπει το ιστορικό. Σειριακά και χωρίς retries, όπως το filming.spec.ts.
// Κλείνει Γύρισμα κάτω από τη μηνιαία Συμφωνία του project. Τη μοιράζεται με το filming.spec.ts (η Ευκαιρία του seed
// παίρνει μία μόνο Συμφωνία): όποιο τρέξει πρώτο την υπογράφει, ώστε να περνά σε οποιοδήποτε shard.
// Η Συμφωνία και η κράτηση γίνονται με τα βήματα των Συμφωνιών και των Γυρισμάτων· το Δελτίο στη νέα εμφάνιση (Χώροι).
test.describe.configure({ mode: "serial", retries: 0 });

// Ένας Χρήστης σε δικό του context, στη νέα εμφάνιση.
async function inSpaces(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await addSpacesCookie(context);
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Το πάνελ «Δελτίο γυρίσματος» της σελίδας του Γυρίσματος.
const sheetPanel = (page: Page): Locator => card(page, "Δελτίο γυρίσματος");

// Μία λήψη της λίστας: κάθε αλλαγή της λίστας αποθηκεύεται αμέσως.
async function addShot(sheet: Locator, text: string): Promise<void> {
  await sheet.getByRole("textbox", { name: "Νέο πλάνο" }).fill(text);
  await button(sheet, "Προσθήκη").click();
  await expect(sheet.locator("li", { hasText: text })).toBeVisible();
  await expect(button(sheet, "Αφαίρεση").first()).toBeEnabled();
}

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
    const crew = card(owner, "Συνεργείο");
    await crew.getByLabel("Άτομο").selectOption({ label: PRODUCER });
    await button(crew, "Προσθήκη").click();
    await expect(crew.locator("li", { hasText: PRODUCER })).toBeVisible();

    const sheet = sheetPanel(owner);
    await expect(sheet.getByText("Δεν έχει σταλεί ακόμα Δελτίο.")).toBeVisible();
    await addShot(sheet, "Είσοδος");
    await addShot(sheet, "Πάγκος");

    await button(sheet, "Αποστολή Δελτίου").click();
    await expect(sheet.locator("li", { hasText: "Έκδοση 1" })).toBeVisible();
  });

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    const sheet = sheetPanel(owner);
    // Η δεύτερη λήψη αλλάζει: φεύγει η παλιά και μπαίνει η νέα διατύπωση.
    const old = sheet
      .locator("li")
      .filter({ has: owner.locator('.part-title:text-is("Πάγκος")') });
    await button(old, "Αφαίρεση").click();
    await expect(old).toHaveCount(0);
    await addShot(sheet, "Πάγκος κοντά");

    await sheet.getByLabel("Τι άλλαξε (υποχρεωτικό)").fill("Άλλαξε η δεύτερη λήψη");
    await button(sheet, "Νέα έκδοση").click();
    await expect(
      sheet.locator("li", { hasText: "Άλλαξε η δεύτερη λήψη" }),
    ).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 1" })).toBeVisible();
    await expect(sheet.locator("li", { hasText: "Έκδοση 2" })).toBeVisible();
  });

  // Η έκδοση 2 μηδένισε τις απαντήσεις: η Ρένα (μέλος του Συνεργείου, χωρίς Δικαίωμα) επιβεβαιώνει την τρέχουσα έκδοση.
  await inSpaces(browser, "production@example.com", async (producer) => {
    await visit(producer, filmingUrl);
    const mine = card(producer, "Είσαι στο Συνεργείο");
    await expect(
      mine.getByText("Περιμένει απάντηση", { exact: true }).first(),
    ).toBeVisible();
    await button(mine, "Επιβεβαιώνω").click();
    await expect(button(mine, "Επιβεβαιώνω")).toHaveCount(0);
    await expect(
      mine.getByText("επιβεβαιώνω", { exact: true }).first(),
    ).toBeVisible();
  });
});
