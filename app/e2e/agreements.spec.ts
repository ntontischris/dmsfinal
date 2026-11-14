import { expect, test } from "@playwright/test";

import {
  LINK_URL,
  SIGNATORY,
  actionsBar,
  addCatalogueLine,
  addFreeLine,
  asVisitor,
  currentStep,
  draftProposal,
  inSpacesContext,
  openAgreementByTitle,
  openOpportunity,
  openWith,
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
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Συμφωνίες και υπογραφή (D1, D2, D4, D5), Ρυθμίσεις › Συμφωνίες (O3) και η πρόταση της B4 από άκρη σε άκρη. Φανταστικά στοιχεία.
// Τους Πελάτες και τις Ευκαιρίες τους φτιάχνει το e2e/seed.mjs· κάθε Συμφωνία γράφεται από την οθόνη (βοηθητικά: e2e/agreements-parts.ts).
// Τα ποσά ταιριάζουν με `\s`: το κενό πριν το «€» δεν σπάει γραμμή.
const NOT_ALLOWED = "Χωρίς δικαίωμα";

// Τα τεστ γράφουν στην ίδια βάση: μια επανάληψη θα έβρισκε τα δεδομένα της πρώτης προσπάθειας μισοαλλαγμένα
// και θα έκρυβε το πραγματικό λάθος. Τα τεστ τρέχουν με τη σειρά του αρχείου.
test.describe.configure({ retries: 0 });

// Όλες οι οθόνες εδώ είναι στη νέα εμφάνιση (Χώροι)· κάθε άλλο context τη βάζει μόνο του (inSpacesContext, asVisitor).

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
  // Οι Παροχές της γραμμής (2 Γυρίσματα, 8 reels): σε όποιον γράφει την πρόταση είναι πεδία ανά είδος.
  await expect(
    lines.getByLabel("Ποσότητα Γυρίσματα", { exact: true }),
  ).toHaveValue("2");
  await expect(lines.getByLabel("Ποσότητα reels", { exact: true })).toHaveValue(
    "8",
  );
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

  await inSpacesContext(browser, "owner@example.com", (owner) =>
    ownerRejects(owner, title),
  );

  await page.goto(agreementUrl);
  await expect(currentStep(page)).toContainText("Σύνταξη");
  await expect(page.getByText("Πολύ ακριβά").first()).toBeVisible();
  await button(page, "Αίτημα έγκρισης").click();
  await expect(page.getByText("Ζητήθηκε Έγκριση")).toBeVisible();

  await inSpacesContext(browser, "owner@example.com", (owner) =>
    ownerApproves(owner, title),
  );

  await page.goto(agreementUrl);
  await expect(currentStep(page)).toContainText("Εστάλη");
  await expect(control(page, `Σύνδεσμος για ${SIGNATORY}`)).toHaveValue(
    LINK_URL,
  );

  await inSpacesContext(browser, "nikos@example.com", (nikos) =>
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

  const revision = page.getByLabel("Τι αλλάζει (προαιρετικά)");
  await openWith(button(page, "Νέα αναθεώρηση"), revision);
  await button(page, "Συνέχεια").click();
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
    await expect(card(page, "Αιτήματα αλλαγών από τον πελάτη")).toContainText(
      "Θέλουμε 10 reels",
    );
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
  await expect(
    page.getByText("Μια χαμένη Ευκαιρία δεν ξανανοίγει."),
  ).toBeVisible();
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

  await inSpacesContext(browser, "admin@example.com", async (admin) => {
    await admin.goto(agreementUrl);
    await expect(card(admin, "Κόστος και περιθώριο")).toBeVisible();
    await expect(control(admin, "Ώρες γυρίσματος")).toHaveCount(0);
  });

  await inSpacesContext(browser, "owner@example.com", async (owner) => {
    await owner.goto(agreementUrl);
    await expect(control(owner, "Ώρες γυρίσματος")).toBeVisible();
    await expect(control(owner, "Ώρες μοντάζ")).toBeVisible();

    await signOutsideSystem(owner, P);
    await expect(
      screenHeader(owner).locator(".badge", { hasText: /^ενεργή$/ }),
    ).toBeVisible();
    await expect(
      owner.getByText(`εκτός συστήματος: symfonia-${P}.pdf`),
    ).toBeVisible();
    await shot(owner, "d2-outside");
  });

  await page.goto(agreementUrl);
  await expect(
    button(actionsBar(page), "Υπογράφηκε εκτός συστήματος"),
  ).toHaveCount(0);
});

test("η Διαχείριση βλέπει κόστος και περιθώριο της υπογεγραμμένης Συμφωνίας", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await openAgreementByTitle(page, `Πρόταση Α ${P}`);
  await checkFrozenCost(page);
  await shot(page, "d2-cost-admin");

  // Το PDF της υπογεγραμμένης Συμφωνίας (b10) κατεβαίνει από τον σύνδεσμο της Υπογραφής.
  const href = await page
    .getByRole("link", { name: "Λήψη PDF" })
    .getAttribute("href");
  const pdf = await page.request.get(href ?? "");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
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
    "Προεπιλογές τιμολόγησης",
    "Είδη Παροχής",
    "Όριο αλλαγών",
  ])
    await expect(card(page, title)).toBeVisible();
  await shot(page, "o3-agreements");

  await changePaymentDays(page);
  await changeReelRounds(page);

  // Η γραμμή του είδους «reel»: σε χρήση, με τον αριθμό των χρήσεων.
  const reel = panel(page, "Είδη Παροχής")
    .locator("li")
    .filter({ has: page.locator(".part-title", { hasText: /^reel$/ }) });
  await expect(
    reel.getByText("Σε χρήση", { exact: true }).first(),
  ).toBeVisible();
  await expect(reel.getByText(/^\d+ χρήσεις$/)).toBeVisible();
  await openItem(page, `Μηνιαία Παρουσία ${P}`);
  await expect(page.getByText(/Συμφωνίες το έχουν αντιγράψει/)).toBeVisible();

  await inSpacesContext(browser, "sales@example.com", async (sales) => {
    await sales.goto("/app/settings/agreements");
    await expect(
      sales.getByRole("heading", { name: NOT_ALLOWED, exact: true }),
    ).toBeVisible();
  });
});

test("ο Έλεγχος ετοιμότητας μένει στις 12 γραμμές χωρίς γραμμή για τις Συμφωνίες", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/readiness");
  const list = card(page, "Τι πρέπει να είναι έτοιμο");
  await expect(list.locator("li.part-row")).toHaveCount(12);
  await expect(
    list.locator("li.part-row").filter({ hasText: /Συμφωνί/ }),
  ).toHaveCount(0);
});
