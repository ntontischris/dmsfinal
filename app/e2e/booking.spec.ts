import { expect, test, type Locator, type Page } from "@playwright/test";

import { panel } from "./catalogue-parts";
import { FILMING_URL, visit } from "./filming-parts";
import {
  CLIENT_EMAIL,
  CLIENT_PRODUCT_NAME,
  EXCEPTION_NOTE,
  HOURS_URL,
  bookFirstFreeSlot,
  inSpaces,
  setOpeningHours,
  signedBookingAgreement,
  switchUser,
} from "./booking-parts";
import { button, listItem, project, signIn } from "./sales-parts";

// Κρατήσεις (C2α, #130) στους Χώρους: Ωράριο, εξαίρεση, κράτηση του Πελάτη με έγκριση και μετάθεση που απορρίπτεται.
// Σειριακά: το Ωράριο είναι μία γραμμή κοινή για όλα τα specs και το (α) πρέπει να τρέξει πρώτο.
test.describe.configure({ mode: "serial", retries: 0 });


// Στην ουρά Εγκρίσεων κάθε Γύρισμα είναι δύο γραμμές: η κεφαλή (Πελάτης) και από κάτω οι ενέργειές του.
const queueRow = (owner: Page, title: string, client: string): Locator =>
  panel(owner, title).locator("li.part-row", { hasText: client });
const actionsOf = (row: Locator): Locator =>
  row.locator("xpath=following-sibling::li[1]");

test("ο Ιδιοκτήτης ορίζει το Ωράριο και προσθέτει και σβήνει εξαίρεση", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await setOpeningHours(page);

  const note = EXCEPTION_NOTE(P);
  await visit(page, HOURS_URL);
  await page.locator("summary", { hasText: "+ Νέα εξαίρεση" }).click();
  const exceptionForm = page.locator("form", {
    has: button(page, "Προσθήκη εξαίρεσης"),
  });
  await exceptionForm.locator('input[name="day"]').fill("2099-03-02");
  await exceptionForm.locator('select[name="mode"]').selectOption("closed");
  await exceptionForm.locator('textarea[name="note"]').fill(note);
  await button(exceptionForm, "Προσθήκη εξαίρεσης").click();
  const exception = listItem(panel(page, "Εξαιρέσεις ανά μέρα"), note);
  await expect(exception).toBeVisible();

  await button(exception, "Διαγραφή").click();
  await expect(exception).toHaveCount(0);
});

test("ο Πελάτης κλείνει κράτηση, ο Ιδιοκτήτης την εγκρίνει", async ({
  page,
  browser,
}) => {
  const P = project();
  await signedBookingAgreement(page, browser, P);
  await switchUser(page, CLIENT_EMAIL(P));
  await visit(page, "/app/book");
  await bookFirstFreeSlot(page);
  await expect(page).toHaveURL(/\/app\/filming\/[0-9a-f-]{36}\?done=booked$/);
  await expect(page.getByText("Αναμένει έγκριση").first()).toBeVisible();

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, "/app/filming/queue");
    const row = queueRow(owner, "Αναμένουν έγκριση", CLIENT_PRODUCT_NAME(P));
    const actions = actionsOf(row);
    await button(actions, "Έγκριση").click();
    // Η απάντηση φαίνεται στη γραμμή· αν ήταν η τελευταία, η ουρά δείχνει ότι δεν περιμένει τίποτα.
    await expect(
      owner.getByText(/εγκρίθηκε|Τίποτα δεν περιμένει απάντηση/).first(),
    ).toBeVisible();
    await owner.reload();
    await expect(row).toHaveCount(0);
  });
});

test("ο Πελάτης ζητά μετάθεση, ο Ιδιοκτήτης την απορρίπτει και το Γύρισμα μένει", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, CLIENT_EMAIL(P));
  await visit(page, "/app/filming");
  // Ο Πελάτης κρατήσεων έχει ένα Γύρισμα: αυτό που έκλεισε στο προηγούμενο τεστ.
  await page.locator("li.part-row").getByRole("link").first().click();
  await expect(page).toHaveURL(FILMING_URL);
  await page.getByRole("link", { name: "Ζητώ άλλη μέρα", exact: true }).click();
  await bookFirstFreeSlot(page, { reschedule: true });
  await expect(page.getByText(/Ζήτησες μετάθεση/).first()).toBeVisible();

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, "/app/filming/queue");
    const row = queueRow(owner, "Αιτήματα μετάθεσης", CLIENT_PRODUCT_NAME(P));
    const actions = actionsOf(row);
    await button(actions, "Απόρριψη").click();
    await actions
      .getByLabel(/Λόγος απόρριψης της μετάθεσης/)
      .fill("e2e: δεν χωράει η ώρα");
    await button(actions, "Απορρίπτω").click();
    await expect(
      owner
        .getByText(/μένει στην παλιά ώρα|Τίποτα δεν περιμένει απάντηση/)
        .first(),
    ).toBeVisible();
    await owner.reload();
    await expect(row).toHaveCount(0);
  });
});
