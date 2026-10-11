import { expect, test, type Browser, type Page } from "@playwright/test";

import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { signOutsideSystem } from "./agreements-flows-parts";
import { switchUser } from "./booking-parts";
import { inContext, project, signIn } from "./sales-parts";

// Η Συνομιλία του πελάτη (J3) από άκρη σε άκρη (#161). Ο Πελάτης «Πελάτης Συνομιλίας {project}» και ο Χρήστης πελάτη
// «chat.{project}@example.com» (Πλήρης) έρχονται από το seed· η Παραγωγή του (ετικέτα) βγαίνει από μηνιαία Συμφωνία που
// υπογράφεται μέσα από τις οθόνες. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_NAME = (P: string): string => `Πελάτης Συνομιλίας ${P}`;
const CLIENT_EMAIL = (P: string): string => `chat.${P}@example.com`;
const MESSAGES_PATH = "/app/messages";
const NAV_MESSAGES_LINK = /Μηνύματα$/;
const SENT_NOTICE = "Το Μήνυμα στάλθηκε.";
const COMPOSER = "Νέο Μήνυμα";
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const PDF_NAME = "sample-invoice.pdf";

// Υπογράφει τη μηνιαία Συμφωνία του Πελάτη Συνομιλίας: ο Πωλητής τη συντάσσει, ο Ιδιοκτήτης την καταχωρίζει.
async function signedChatAgreement(
  page: Page,
  browser: Browser,
  P: string,
): Promise<void> {
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, {
    title: `Συνομιλία ${P}`,
    kind: "μηνιαία",
  });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await inContext(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await signOutsideSystem(owner, P);
  });
}

test("ο πελάτης γράφει με ετικέτα Παραγωγής, η ομάδα απαντά και ο πελάτης δεν βλέπει το Εσωτερικό", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const P = project();
  const question = `Ερώτηση πελάτη ${P}`;
  const internal = `Εσωτερική σημείωση ${P}`;
  const reply = `Απάντηση ομάδας ${P}`;

  // 0. Η Συμφωνία και η Παραγωγή του Πελάτη.
  await signedChatAgreement(page, browser, P);

  // 1. Ο Χρήστης πελάτη ανοίγει «Μηνύματα» από την πλοήγηση: άδεια Συνομιλία.
  await switchUser(page, CLIENT_EMAIL(P));
  await page
    .getByRole("navigation", { name: "Οθόνες" })
    .getByRole("link", { name: NAV_MESSAGES_LINK })
    .click();
  await expect(page).toHaveURL(new RegExp(`${MESSAGES_PATH}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Μηνύματα" }),
  ).toBeVisible();
  await expect(page.getByText("Καμία συζήτηση ακόμα")).toBeVisible();

  // 2. Στέλνει Μήνυμα με ετικέτα την Παραγωγή του (η πρώτη μετά το «Γενικά, χωρίς Παραγωγή»).
  const composer = page.getByRole("region", { name: COMPOSER });
  const tag = composer.getByLabel("Για ποια Παραγωγή;");
  await expect(tag.locator("option").first()).toHaveText(
    "Γενικά, χωρίς Παραγωγή",
  );
  const productionTitle = (
    await tag.locator("option").nth(1).textContent()
  )?.trim();
  expect(productionTitle).toBeTruthy();
  await tag.selectOption({ index: 1 });
  await composer.getByLabel("Μήνυμα προς την ομάδα").fill(question);
  // Και ο πελάτης επισυνάπτει αρχείο (Jγ): ανεβαίνει αμέσως, η Αποστολή περιμένει.
  await page.waitForLoadState("networkidle");
  await composer.getByLabel("Επισύναψη αρχείων").setInputFiles(PDF_FIXTURE);
  const chips = composer.getByRole("list", { name: "Συνημμένα" });
  await expect(chips).toContainText(PDF_NAME);
  await expect(chips).not.toContainText("ανεβαίνει…");
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(SENT_NOTICE);
  const sent = page.locator("article", { hasText: question });
  await expect(sent).toBeVisible();
  await expect(sent).toContainText(productionTitle ?? "");
  await expect(sent.getByRole("link", { name: PDF_NAME })).toBeVisible();
  await expect(sent.getByRole("button", { name: "Διόρθωση" })).toBeVisible();
  await expect(sent.getByRole("button", { name: "Διαγραφή" })).toBeVisible();

  // 3. Ο Ιδιοκτήτης βλέπει «1 αδιάβαστα» στα Εισερχόμενα, ανοίγει τη Συνομιλία και στέλνει Εσωτερικό και απάντηση.
  await switchUser(page, "owner@example.com");
  await page.goto(MESSAGES_PATH);
  const row = page.getByRole("link", {
    name: new RegExp(`${CLIENT_NAME(P)}.*1 αδιάβαστα`),
  });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);
  await expect(page.locator("article", { hasText: question })).toBeVisible();

  const team = page.getByRole("region", { name: COMPOSER });
  await team
    .getByRole("button", { name: "Εσωτερικό Μήνυμα", exact: true })
    .click();
  await team.getByPlaceholder("Γράψε το Μήνυμα…").fill(internal);
  await team.getByRole("button", { name: "Αποστολή" }).click();
  await expect(page.locator("article", { hasText: internal })).toBeVisible();
  await team.getByPlaceholder("Γράψε το Μήνυμα…").fill(reply);
  await team.getByRole("button", { name: "Αποστολή" }).click();
  await expect(page.locator("article", { hasText: reply })).toBeVisible();

  // 4. Ο πελάτης βλέπει την απάντηση (με «νέο») αλλά όχι το Εσωτερικό.
  await switchUser(page, CLIENT_EMAIL(P));
  await page.goto(MESSAGES_PATH);
  const answer = page.locator("article", { hasText: reply });
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("νέο");
  await expect(page.getByText(internal)).toHaveCount(0);
  await expect(
    page.getByText("Εσωτερικό · δεν το βλέπει ο πελάτης"),
  ).toHaveCount(0);

  // 5. Διορθώνει και διαγράφει το δικό του Μήνυμα.
  const own = page.locator("article", { hasText: question });
  await own.getByRole("button", { name: "Διόρθωση" }).click();
  await own
    .getByLabel("Διόρθωση", { exact: true })
    .fill(`${question} διορθωμένη`);
  await own.getByRole("button", { name: "Αποθήκευση" }).click();
  const fixed = page.locator("article", { hasText: `${question} διορθωμένη` });
  await expect(fixed).toContainText("διορθώθηκε");
  await fixed.getByRole("button", { name: "Διαγραφή" }).first().click();
  await fixed.getByRole("button", { name: "Διαγραφή" }).last().click();
  await expect(
    page.locator("article").filter({ hasText: "Το Μήνυμα διαγράφηκε." }),
  ).toBeVisible();
  await expect(page.locator("article", { hasText: question })).toHaveCount(0);
});
