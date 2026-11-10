import { expect, test, type Browser, type Page } from "@playwright/test";

import { signOutsideSystem } from "./agreements-flows-parts";
import { addCatalogueLine, draftProposal } from "./agreements-parts";
import {
  DELIVERABLE_URL,
  addTeamComment,
  addVersion,
  createDeliverable,
  deliverablesPanel,
  pageTitle,
} from "./deliverables-parts";
import { inSpaces, visit } from "./filming-parts";
import {
  button,
  card,
  inContext,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Ο κύκλος με τον πελάτη (H3, H4) στη νέα εμφάνιση (Χώροι): ο Ιδιοκτήτης ανεβάζει, ο Χρήστης πελάτη ζητά αλλαγές και
// εγκρίνει. Η Παραγωγή βγαίνει από μηνιαία Συμφωνία του Πελάτη Παραδοτέων (seed) που υπογράφεται μέσα από τις οθόνες.
// Ο Χρήστης πελάτη είναι «deliv.{project}@example.com» και κρατά τη σελίδα του τεστ· ο Ιδιοκτήτης δουλεύει σε δικό του
// context. Σειριακά και χωρίς retries, όπως τα άλλα e2e.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const CLIENT_NAME = (P: string): string => `Πελάτης Παραδοτέων ${P}`;
const CLIENT_EMAIL = (P: string): string => `deliv.${P}@example.com`;
const OWNER = "owner@example.com";
const LINK_V1 = "https://drive.google.com/file/d/e2e-client-v1";
const LINK_V2 = "https://drive.google.com/file/d/e2e-client-v2";
const CHANGE_NOTE = "Κόψε το τέλος";
const INTERNAL_COMMENT = "Εσωτερικό: μην το δείξεις στον πελάτη";

// Υπογράφει τη μηνιαία Συμφωνία του Πελάτη Παραδοτέων: ο Πωλητής τη συντάσσει, ο Ιδιοκτήτης την καταχωρίζει.
// Οι οθόνες των Συμφωνιών δεν είναι της παραγωγής: τρέχουν σε δικό τους context, με την εμφάνιση που ορίζει η εφαρμογή.
async function signedDeliverablesAgreement(
  browser: Browser,
  P: string,
): Promise<void> {
  await inContext(browser, "sales@example.com", async (sales) => {
    const agreementUrl = await draftProposal(sales, {
      title: `Παραδοτέα ${P}`,
      kind: "μηνιαία",
    });
    await addCatalogueLine(sales, `Μηνιαία Παρουσία ${P}`);
    await inContext(browser, OWNER, async (owner) => {
      await owner.goto(agreementUrl);
      await signOutsideSystem(owner, P);
    });
  });
}

async function openClientDeliverable(page: Page, title: string): Promise<void> {
  await visit(page, "/app/deliverables");
  // Το Παραδοτέο φαίνεται και στο «Περιμένουν εσένα» και στην Περίοδό του· ο πρώτος σύνδεσμος οδηγεί στο ίδιο.
  await page.getByRole("link", { name: title, exact: true }).first().click();
  await expect(page).toHaveURL(DELIVERABLE_URL);
  await expect(pageTitle(page, title)).toBeVisible();
}

test("ο Ιδιοκτήτης ανεβάζει, ο πελάτης ζητά αλλαγές, ο Ιδιοκτήτης ανεβάζει ξανά και ο πελάτης εγκρίνει", async ({
  page,
  browser,
}) => {
  const P = project();
  const DELIVERABLE = `Reel πελάτη ${P}`;
  let deliverableUrl = "";

  // 0. Η Συμφωνία και η Παραγωγή του Πελάτη.
  await signedDeliverablesAgreement(browser, P);

  // 1. Ο Ιδιοκτήτης φτιάχνει το Παραδοτέο και ανεβάζει Έκδοση 1 (ως Ελεγκτής πάει κατευθείαν στον πελάτη).
  await inSpaces(browser, OWNER, async (owner) => {
    await visit(owner, "/app/productions");
    await tableRow(owner, CLIENT_NAME(P)).getByRole("link").first().click();
    await createDeliverable(owner, DELIVERABLE);
    await deliverablesPanel(owner)
      .getByRole("link", { name: DELIVERABLE, exact: true })
      .click();
    await expect(owner).toHaveURL(DELIVERABLE_URL);
    deliverableUrl = owner.url();
    await addVersion(owner, LINK_V1, { version: 1, state: "αναμένει πελάτη" });
  });

  // 2. Ο πελάτης βλέπει το Παραδοτέο στο «Περιμένουν εσένα» και ζητά αλλαγές με σημείωση.
  await signIn(page, CLIENT_EMAIL(P));
  // Τα Παραδοτέα είναι καρτέλα του Χώρου «Η δουλειά μου».
  await page
    .getByRole("navigation", { name: "Χώροι" })
    .getByRole("link", { name: "Η δουλειά μου" })
    .first()
    .click();
  await page
    .getByRole("navigation", { name: "Η δουλειά μου" })
    .getByRole("link", { name: "Παραδοτέα", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/deliverables$/);
  await expect(
    card(page, "Περιμένουν εσένα").getByRole("link", {
      name: DELIVERABLE,
      exact: true,
    }),
  ).toBeVisible();
  await shot(page, "h3-client-waiting");
  await openClientDeliverable(page, DELIVERABLE);
  await button(page, "Ζητώ αλλαγές").click();
  await page.getByLabel("Τι θέλεις να αλλάξει;").fill(CHANGE_NOTE);
  await button(page, "Στέλνω το αίτημα αλλαγών").click();
  // Μετά την απάντηση η απόφαση φεύγει (δεν ζητιέται πια)· ελέγχουμε την κατάσταση.
  await expect(
    page.getByRole("heading", {
      name: "Στάλθηκε το αίτημα αλλαγών",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("ζητήθηκαν αλλαγές", { exact: true }).first(),
  ).toBeVisible();
  await shot(page, "h4-client-changes-requested");

  // 3. Ο Ιδιοκτήτης ανεβάζει Έκδοση 2 και σχολιάζει εσωτερικά.
  await inSpaces(browser, OWNER, async (owner) => {
    await visit(owner, deliverableUrl);
    await addVersion(owner, LINK_V2, { version: 2, state: "αναμένει πελάτη" });
    await addTeamComment(owner, { body: INTERNAL_COMMENT, isInternal: true });
  });

  // 4. Ο πελάτης βλέπει την Έκδοση 2 χωρίς το εσωτερικό σχόλιο και την εγκρίνει (με επιβεβαίωση: η έγκριση είναι τελική).
  await openClientDeliverable(page, DELIVERABLE);
  await expect(page.getByText(INTERNAL_COMMENT)).toHaveCount(0);
  await button(page, "Έγκριση").click();
  await expect(
    page.getByText("Η έγκριση είναι οριστική.", { exact: true }),
  ).toBeVisible();
  await button(page, "Επιβεβαιώνω την έγκριση").click();
  // Με τελικά αρχεία η έγκριση το παραδίδει αμέσως: «Παραδόθηκε ✓» αντί για «Εγκρίθηκε ✓».
  await expect(page.getByRole("link", { name: "v2 · εγκρίθηκε", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^(Εγκρίθηκε|Παραδόθηκε) ✓$/ }),
  ).toBeVisible();
  await shot(page, "h4-client-approved");
});
