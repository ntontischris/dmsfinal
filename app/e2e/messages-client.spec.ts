import { expect, test, type Browser, type Page } from "@playwright/test";

import { addCatalogueLine, draftProposal } from "./agreements-parts";
import { signOutsideSystem } from "./agreements-flows-parts";
import { switchUserInSpaces } from "./messages-parts";
import { inContext, project } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Η Συνομιλία του πελάτη (J3) από άκρη σε άκρη (#161). Ο Πελάτης «Πελάτης Συνομιλίας {project}» και ο Χρήστης πελάτη
// «chat.{project}@example.com» (Πλήρης) έρχονται από το seed· η Παραγωγή του (ετικέτα) βγαίνει από μηνιαία Συμφωνία που
// υπογράφεται μέσα από τις οθόνες. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_NAME = (P: string): string => `Πελάτης Συνομιλίας ${P}`;
const CLIENT_EMAIL = (P: string): string => `chat.${P}@example.com`;
const MESSAGES_PATH = "/app/messages";
const SENT_NOTICE = "Το μήνυμα στάλθηκε.";
const COMPOSER = "Νέο Μήνυμα";

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

// Ο συντάκτης του πελάτη: η φόρμα με τίτλο «Νέο μήνυμα».
const clientComposer = (page: Page) =>
  page.locator("form", {
    has: page.getByRole("heading", { name: "Νέο μήνυμα", exact: true }),
  });
const PDF_FIXTURE = "e2e/fixtures/sample-invoice.pdf";
const PDF_NAME = "sample-invoice.pdf";

// Υπογράφει τη μηνιαία Συμφωνία του Πελάτη Συνομιλίας: ο Πωλητής τη συντάσσει, ο Ιδιοκτήτης την καταχωρίζει.
// Σε δικά τους contexts με την εμφάνιση που περιμένουν τα βοηθητικά των Συμφωνιών (agreements-parts), όποια κι αν είναι.
async function signedChatAgreement(browser: Browser, P: string): Promise<void> {
  let agreementUrl = "";
  await inContext(browser, "sales@example.com", async (seller) => {
    agreementUrl = await draftProposal(seller, {
      title: `Συνομιλία ${P}`,
      kind: "μηνιαία",
    });
    await addCatalogueLine(seller, `Μηνιαία Παρουσία ${P}`);
  });
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
  await signedChatAgreement(browser, P);

  // 1. Ο Χρήστης πελάτη ανοίγει τον Χώρο «Μηνύματα» από την πλοήγηση: άδεια Συνομιλία.
  await switchUserInSpaces(page, CLIENT_EMAIL(P));
  await page
    .getByRole("navigation", { name: "Χώροι" })
    .getByRole("link", { name: "Μηνύματα", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${MESSAGES_PATH}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Μηνύματα" }),
  ).toBeVisible();
  await expect(page.getByText("Καμία συζήτηση ακόμα")).toBeVisible();

  // 2. Στέλνει Μήνυμα με ετικέτα την Παραγωγή του (η πρώτη μετά το «Όχι, κάτι γενικό»).
  const composer = clientComposer(page);
  const tag = composer.getByLabel("Αφορά συγκεκριμένη δουλειά;");
  await expect(tag.locator("option").first()).toHaveText("Όχι, κάτι γενικό");
  const productionTitle = (
    await tag.locator("option").nth(1).textContent()
  )?.trim();
  expect(productionTitle).toBeTruthy();
  await tag.selectOption({ index: 1 });
  await composer.getByLabel("Το μήνυμά σου").fill(question);
  // Και ο πελάτης επισυνάπτει αρχείο (Jγ): ανεβαίνει αμέσως, η Αποστολή περιμένει.
  await page.waitForLoadState("networkidle");
  await composer.getByLabel("Πρόσθεσε αρχείο").setInputFiles(PDF_FIXTURE);
  const chips = composer.locator("ul.jfiles");
  await expect(chips).toContainText(PDF_NAME);
  await expect(chips).not.toContainText("ανεβαίνει…");
  await composer.getByRole("button", { name: "Στείλε το μήνυμα" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: SENT_NOTICE }),
  ).toBeVisible();
  const sent = page.locator("article", { hasText: question });
  await expect(sent).toBeVisible();
  await expect(sent).toContainText(productionTitle ?? "");
  await expect(sent.getByRole("link", { name: PDF_NAME })).toBeVisible();
  await expect(sent.getByRole("button", { name: "Διόρθωση" })).toBeVisible();
  await expect(sent.getByRole("button", { name: "Διαγραφή" })).toBeVisible();

  // 3. Ο Ιδιοκτήτης βλέπει «1 αδιάβαστα» στα Εισερχόμενα, ανοίγει τη Συνομιλία και στέλνει Εσωτερικό και απάντηση.
  await switchUserInSpaces(page, "owner@example.com");
  await page.goto(MESSAGES_PATH);
  const row = page.getByRole("listitem").filter({
    has: page.getByRole("link", { name: CLIENT_NAME(P), exact: true }),
  });
  await expect(row).toContainText("1 αδιάβαστα");
  await row.getByRole("link", { name: CLIENT_NAME(P), exact: true }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}$/);
  await expect(page.locator("article", { hasText: question })).toBeVisible();

  const team = page.getByRole("region", { name: COMPOSER });
  await team
    .getByRole("button", { name: "Εσωτερικό Μήνυμα", exact: true })
    .click();
  await team.getByPlaceholder("Γράψε το Μήνυμα…").fill(internal);
  await team.getByRole("button", { name: "Αποστολή στην ομάδα" }).click();
  await expect(page.locator("article", { hasText: internal })).toBeVisible();
  await expect(team.getByPlaceholder("Γράψε το Μήνυμα…")).toHaveValue("");
  await team.getByPlaceholder("Γράψε το Μήνυμα…").fill(reply);
  await team.getByRole("button", { name: "Αποστολή στον πελάτη" }).click();
  await expect(page.locator("article", { hasText: reply })).toBeVisible();

  // 4. Ο πελάτης βλέπει την απάντηση (με «νέο») αλλά όχι το Εσωτερικό.
  await switchUserInSpaces(page, CLIENT_EMAIL(P));
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
    .getByLabel("Διόρθωση Μηνύματος", { exact: true })
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
