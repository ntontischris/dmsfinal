import { expect, test } from "@playwright/test";

import {
  DELIVERABLE_URL,
  addTeamComment,
  addVersion,
  createDeliverable,
  createInternalProduction,
  deliverablesPanel,
  pageTitle,
  versionsPanel,
} from "./deliverables-parts";
import { visit } from "./filming-parts";
import { button, project, shot, signIn, tableRow } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Παραδοτέα (H1, H2, ενότητα της G2) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Η Εσωτερική Παραγωγή φτιάχνεται εδώ
// (Υπεύθυνος ο Ιδιοκτήτης), άρα το Παραδοτέο δεν θέλει Παροχή και ο Ιδιοκτήτης είναι ελεγκτής. Δεν χρησιμοποιεί την
// «Showreel» του seed: η έγκριση του μοναδικού της Παραδοτέου την παραδίδει αυτόματα (#143) και τα τεστ της Παραγωγής
// την θέλουν ανοιχτή. Σειριακά και χωρίς retries, όπως τα άλλα e2e (η βάση μοιράζεται).
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const LINK = "https://drive.google.com/file/d/e2e-deliverable-v1";
const COMMENT = "Ο ήχος θέλει διόρθωση";
const TIMECODE = "0:42";

test("ο Ιδιοκτήτης φτιάχνει Παραδοτέο, το στέλνει, το σχολιάζει και το εγκρίνει στην Εσωτερική Παραγωγή", async ({
  page,
}) => {
  const P = project();
  const PRODUCTION = `Παραδοτέα ${P}`;
  const DELIVERABLE = `Reel ${P}`;

  await signIn(page, "owner@example.com");
  await createInternalProduction(page, PRODUCTION);
  await createDeliverable(page, DELIVERABLE);
  await deliverablesPanel(page)
    .getByRole("link", { name: DELIVERABLE, exact: true })
    .click();

  await expect(page).toHaveURL(DELIVERABLE_URL);
  await expect(pageTitle(page, DELIVERABLE)).toBeVisible();

  await addVersion(page, LINK, {
    version: 1,
    state: "αναμένει εσωτερικό έλεγχο",
  });

  await addTeamComment(page, { body: COMMENT, timecode: TIMECODE });
  await expect(versionsPanel(page)).toContainText(TIMECODE);
  await shot(page, "h2-owner-version-sent");

  await visit(page, "/app/deliverables");
  // Τα Παραδοτέα είναι καρτέλα του Χώρου «Παραγωγή».
  await expect(
    page
      .getByRole("navigation", { name: "Παραγωγή" })
      .getByRole("link", { name: "Παραδοτέα", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Προβολή ουράς" })
    .getByRole("link", { name: /^προς έλεγχο \(\d+\)$/ })
    .click();
  await expect(tableRow(page, DELIVERABLE)).toBeVisible();
  await shot(page, "h1-review-tab");

  await tableRow(page, DELIVERABLE)
    .getByRole("link", { name: "Άνοιγμα για έλεγχο", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/deliverables\/[0-9a-f-]{36}/);
  await button(page, "Εγκρίνω (οριστικό)").click();
  // Μετά την έγκριση οι Ενέργειες φεύγουν (δεν ζητιούνται πια), γι' αυτό ελέγχουμε την κατάσταση, όχι το μήνυμα.
  await expect(
    page.getByText("εγκρίθηκε", { exact: true }).first(),
  ).toBeVisible();
  await expect(button(page, "Εγκρίνω (οριστικό)")).toHaveCount(0);
});
