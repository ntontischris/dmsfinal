import { expect, test, type Page } from "@playwright/test";

import {
  AGREEMENT_URL,
  addCatalogueLine,
  draftProposal,
  inSpacesContext,
  readSigningCode,
  wrongCodeFor,
} from "./agreements-parts";
import { control } from "./catalogue-parts";
import { button, project, shot, signIn } from "./sales-parts";
import { openFolds } from "./today-parts";

// Υπογραφή μέσα στην εφαρμογή (b11): ο Χρήστης πελάτη «insign.{project}@example.com» (Πλήρης) είναι και ο Υπογράφων
// της πρότασης του «Πελάτης Υπογραφής {project}» (από το seed). Βλέπει την κάρτα «Για υπογραφή» στη Σήμερα, ανοίγει την
// πρόταση και υπογράφει με κωδικό 6 ψηφίων, χωρίς Σύνδεσμο. Σειριακά, χωρίς retries (γράφει στην ίδια βάση).
test.describe.configure({ mode: "serial", retries: 0 });

const TO_SIGN = "Για υπογραφή";
const SIGNER = "Θεόδωρος Υπογραφής";

const card = (page: Page, label: string) =>
  page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: label, exact: true }),
  });

test("ο Υπογράφων υπογράφει την πρόταση μέσα από την εφαρμογή", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const P = project();
  const title = `Υπογραφή εντός ${P}`;

  // 1. Η Άννα συντάσσει και στέλνει την πρόταση.
  await signIn(page, "sales@example.com");
  await draftProposal(page, { title, kind: "μηνιαία" });
  await addCatalogueLine(page, `Μηνιαία Παρουσία ${P}`);
  await button(page, "Αποστολή").click();
  await expect(page.getByText("Η πρόταση στάλθηκε")).toBeVisible();

  await inSpacesContext(browser, `insign.${P}@example.com`, async (client) => {
    // 2. Η Σήμερα του πελάτη δείχνει την κάρτα «Για υπογραφή» με την πρόταση.
    await expect(
      client.getByRole("heading", { level: 1, name: "Σήμερα" }),
    ).toBeVisible();
    await openFolds(client);
    const toSign = card(client, TO_SIGN);
    await expect(toSign).toBeVisible();
    await expect(toSign.getByLabel("1 σε αναμονή")).toBeVisible();
    await shot(client, "a1-client-to-sign");
    await toSign
      .getByRole("link", { name: new RegExp(title) })
      .first()
      .click();
    await expect(client).toHaveURL(AGREEMENT_URL);

    // 3. Όνομα και «Αποδέχομαι» → ο κωδικός πάει στα εξερχόμενα της ομάδας.
    await button(client, "Υπογραφή").click();
    await control(client, "Ονοματεπώνυμο").fill(SIGNER);
    await client
      .getByRole("checkbox", { name: "Αποδέχομαι τους όρους" })
      .check();
    await button(client, "Συνέχεια").click();
    await expect(
      client.getByText("Θα σας δώσουμε τον εξαψήφιο κωδικό"),
    ).toBeVisible();

    // 4. Λάθος κωδικός, μετά ο σωστός.
    const code = await readSigningCode(page);
    await control(client, "Κωδικός 6 ψηφίων").fill(wrongCodeFor(code));
    await button(client, "Επιβεβαίωση").click();
    await expect(client.getByText("Ο κωδικός δεν είναι σωστός")).toBeVisible();
    await control(client, "Κωδικός 6 ψηφίων").fill(code);
    await button(client, "Επιβεβαίωση").click();

    // 5. Η σελίδα ξαναδιαβάζεται: η Συμφωνία έχει υπογραφή και δεν ζητά πια υπογραφή.
    const signature = card(client, "Υπογραφή");
    await expect(signature).toContainText("Υπέγραψε");
    await expect(signature).toContainText(SIGNER);
    await expect(button(client, "Υπογραφή")).toHaveCount(0);
    await shot(client, "d2-client-signed");

    // 6. Στη Σήμερα η κάρτα φεύγει στη γραμμή «Τίποτα σε αναμονή».
    await client.goto("/app");
    await openFolds(client);
    await expect(card(client, TO_SIGN)).toHaveCount(0);
  });
});
