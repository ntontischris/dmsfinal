import { expect, test } from "@playwright/test";

import {
  LINK_URL,
  SIGNATORY,
  addCatalogueLine,
  addFreeLine,
  asVisitor,
  currentStep,
  draftProposal,
  openAgreementByTitle,
  openOpportunity,
  sendAndReadLink,
} from "./agreements-parts";
import {
  changePaymentDays,
  changeReelRounds,
  checkFrozenCost,
  checkNikosSeesNothing,
  checkPublicDocument,
  checkSignedByLink,
  declineAsVisitor,
  ownerApproves,
  ownerRejects,
  requestChangesAsVisitor,
  signAsVisitor,
  signOutsideSystem,
} from "./agreements-flows-parts";
import { control, openItem, panel, screenHeader } from "./catalogue-parts";
import {
  button,
  card,
  inContext,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";

// Συμφωνίες και υπογραφή (D1, D2, D4, D5), Ρυθμίσεις › Συμφωνίες (O3) και η πρόταση της B4 από άκρη σε άκρη. Φανταστικά στοιχεία.
// Τους Πελάτες και τις Ευκαιρίες τους φτιάχνει το e2e/seed.mjs· κάθε Συμφωνία γράφεται από την οθόνη (βοηθητικά: e2e/agreements-parts.ts).
// Τα ποσά ταιριάζουν με `\s`: το κενό πριν το «€» δεν σπάει γραμμή.
const NOT_ALLOWED = "Χωρίς δικαίωμα";

// Τα τεστ γράφουν στην ίδια βάση: μια επανάληψη θα έβρισκε τα δεδομένα της πρώτης προσπάθειας μισοαλλαγμένα
// και θα έκρυβε το πραγματικό λάθος. Τα τεστ τρέχουν με τη σειρά του αρχείου.
test.describe.configure({ retries: 0 });

test("η Άννα φτάνει από την Ευκαιρία ως την υπογραφή του πελάτη", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const title = `Πρόταση Α ${P}`;
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, { title, kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);

  const lines = panel(page, "Γραμμές");
  await expect(lines).toContainText(/1\.300,00\s€/);
  await expect(lines).toContainText("2 Γυρίσματα, 8 reels");
  await expect(card(page, "Κόστος και περιθώριο")).toHaveCount(0);
  await expect(page.locator("th", { hasText: "Ώρες" })).toHaveCount(0);
  await expect(button(page, "Αίτημα έγκρισης")).toHaveCount(0);
  await shot(page, "d2-draft");
  const link = await sendAndReadLink(page);

  const visitor = await browser.newContext();
  try {
    const anon = await visitor.newPage();
    await anon.goto(link);
    await checkPublicDocument(anon, P);
    await signAsVisitor(anon, page);

    await checkSignedByLink(page, { agreementUrl, title });

    await anon.reload();
    await expect(anon.getByText("Η πρόταση έχει ήδη υπογραφεί")).toBeVisible();
  } finally {
    await visitor.close();
  }
});

test("μια Παρέκκλιση θέλει Έγκριση: απόρριψη, νέο αίτημα, έγκριση", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const title = `Πρόταση Β ${P}`;
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, { title, kind: "εφάπαξ" });
  await addCatalogueLine(page, `Εκδήλωση ${P}`);
  await addFreeLine(page, { description: "Ειδικό βίντεο", price: "300" });

  const deviations = panel(page, "Παρεκκλίσεις");
  await expect(deviations).toContainText("Ελεύθερη γραμμή: «Ειδικό βίντεο»");
  await expect(deviations).toContainText("θέλει Έγκριση");
  await expect(button(page, "Αποστολή")).toHaveCount(0);
  await button(page, "Αίτημα έγκρισης").click();
  await expect(page.getByText("Ζητήθηκε Έγκριση")).toBeVisible();
  await expect(currentStep(page)).toContainText("Αναμένει Έγκριση");

  await inContext(browser, "owner@example.com", (owner) =>
    ownerRejects(owner, title),
  );

  await page.goto(agreementUrl);
  await expect(currentStep(page)).toContainText("Σύνταξη");
  await expect(page.getByText("Πολύ ακριβά")).toBeVisible();
  await button(page, "Αίτημα έγκρισης").click();
  await expect(page.getByText("Ζητήθηκε Έγκριση")).toBeVisible();

  await inContext(browser, "owner@example.com", (owner) =>
    ownerApproves(owner, title),
  );

  await page.goto(agreementUrl);
  await expect(currentStep(page)).toContainText("Εστάλη");
  await expect(control(page, `Σύνδεσμος για ${SIGNATORY}`)).toHaveValue(
    LINK_URL,
  );

  await inContext(browser, "nikos@example.com", (nikos) =>
    checkNikosSeesNothing(nikos, P),
  );
});

test("ο Σύνδεσμος που ακυρώθηκε, οι αλλαγές και η απόρριψη του πελάτη", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const title = `Πρόταση Δ ${P}`;
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, { title, kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  const oldLink = await sendAndReadLink(page);

  await button(page, "Νέα αναθεώρηση").click();
  await expect(
    page.getByText("Νέα αναθεώρηση: οι παλιοί Σύνδεσμοι"),
  ).toBeVisible();
  await asVisitor(browser, async (anon) => {
    await anon.goto(oldLink);
    await expect(
      anon.getByText("Υπάρχει νεότερη έκδοση της πρότασης"),
    ).toBeVisible();
    await expect(
      anon.getByText("Επικοινωνήστε με Άννα Πωλήσεις"),
    ).toBeVisible();
  });

  await page.goto(agreementUrl);
  const newLink = await sendAndReadLink(page);
  expect(newLink).not.toBe(oldLink);

  const visitor = await browser.newContext();
  try {
    const anon = await visitor.newPage();
    await anon.goto(newLink);
    await requestChangesAsVisitor(anon);

    await page.goto(agreementUrl);
    await expect(
      page.getByText("Αιτήματα αλλαγών από τον πελάτη"),
    ).toBeVisible();
    await expect(page.getByText("Θέλουμε 10 reels")).toBeVisible();
    await page.goto("/app/agreements");
    await expect(tableRow(page, title)).toContainText("Ζήτησε αλλαγές");

    await anon.reload();
    await declineAsVisitor(anon);
  } finally {
    await visitor.close();
  }

  await page.goto(agreementUrl);
  await expect(currentStep(page)).toContainText("Χάθηκε");
  await expect(button(page, "Αποστολή")).toHaveCount(0);
  await expect(button(page, "Νέα αναθεώρηση")).toHaveCount(0);
  await openOpportunity(page, title);
  await expect(page.getByText("Η Ευκαιρία έκλεισε ως χαμένη")).toBeVisible();
});

test("ο Ιδιοκτήτης καταχωρίζει υπογραφή εκτός συστήματος", async ({
  page,
  browser,
}) => {
  const P = project();
  const title = `Πρόταση Γ ${P}`;
  await signIn(page, "sales@example.com");
  const agreementUrl = await draftProposal(page, { title, kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);

  await inContext(browser, "admin@example.com", async (admin) => {
    await admin.goto(agreementUrl);
    await expect(card(admin, "Κόστος και περιθώριο")).toBeVisible();
    await expect(control(admin, "Ώρες γυρίσματος")).toHaveCount(0);
  });

  await inContext(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await expect(control(owner, "Ώρες γυρίσματος")).toBeVisible();
    await expect(control(owner, "Ώρες μοντάζ")).toBeVisible();

    await signOutsideSystem(owner, P);
    await expect(
      screenHeader(owner).getByText("ενεργή", { exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByText(`εκτός συστήματος: symfonia-${P}.pdf`),
    ).toBeVisible();
    await shot(owner, "d2-outside");
  });

  await page.goto(agreementUrl);
  await expect(button(page, "Υπογράφηκε εκτός συστήματος")).toHaveCount(0);
});

test("η Διαχείριση βλέπει κόστος και περιθώριο της υπογεγραμμένης Συμφωνίας", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await openAgreementByTitle(page, `Πρόταση Α ${P}`);
  await checkFrozenCost(page);
  await shot(page, "d2-cost-admin");
});

test("οι Ρυθμίσεις Συμφωνιών (O3) αλλάζουν τις προεπιλογές και φαίνονται οι χρήσεις", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/agreements");
  await expect(
    page
      .getByRole("navigation", { name: "Ενότητες Ρυθμίσεων" })
      .getByRole("link", { name: "Συμφωνίες", exact: true }),
  ).toHaveAttribute("aria-current", /.+/);
  for (const title of [
    "Όροι Συμφωνίας",
    "Πολιτική Γυρισμάτων του πελάτη",
    "Προεπιλογές τιμολόγησης και πρότασης",
    "Είδη Παροχής",
    "Όριο αλλαγών",
  ])
    await expect(card(page, title)).toBeVisible();
  await shot(page, "o3-agreements");

  await changePaymentDays(page);
  await changeReelRounds(page);

  await expect(
    tableRow(panel(page, "Είδη Παροχής"), "reel").getByText(/Σε χρήση σε \d+/),
  ).toBeVisible();
  await openItem(page, `Μηνιαία Παρουσία ${P}`);
  await expect(page.getByText(/Συμφωνίες το έχουν αντιγράψει/)).toBeVisible();

  await inContext(
    browser,
    "sales@example.com",
    async (sales) => {
      await sales.goto("/app/settings/agreements");
      await expect(
        sales.getByRole("heading", { name: NOT_ALLOWED, exact: true }),
      ).toBeVisible();
    },
  );
});

test("ο Έλεγχος ετοιμότητας μένει στις 11 γραμμές χωρίς γραμμή για τις Συμφωνίες", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/readiness");
  const list = card(page, "Πριν το άνοιγμα σε πελάτες");
  await expect(list.getByRole("listitem")).toHaveCount(11);
  await expect(
    list.getByRole("listitem").filter({ hasText: /Συμφωνί/ }),
  ).toHaveCount(0);
});
