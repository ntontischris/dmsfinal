import { expect, test } from "@playwright/test";

import {
  openTab,
  pickFilter,
  spaceLink,
  switchUserInSpaces,
} from "./finance-parts";
import { button, card, project, signIn } from "./sales-parts";

// Καρτέλα Πελάτη (I5) και όψη πελάτη από άκρη σε άκρη (#153). Ο Πελάτης «Πελάτης Καρτέλας {project}» και ο Χρήστης πελάτη
// «ledger.{project}@example.com» (Πλήρης) έρχονται από το seed. Σειριακά, χωρίς retries. Στη νέα εμφάνιση (Χώροι).
test.describe.configure({ mode: "serial", retries: 0 });


const CLIENT_NAME = (P: string): string => `Πελάτης Καρτέλας ${P}`;
const CLIENT_EMAIL = (P: string): string => `ledger.${P}@example.com`;
const LEDGER_PATH = "/app/finance/ledger";
const ACCOUNT = "Λογαριασμός";
const TO_INVOICE = "Δουλειά που δεν τιμολογήθηκε ακόμα";

test("ο Ιδιοκτήτης καταχωρεί Είσπραξη και ο πελάτης βλέπει την Καρτέλα του χωρίς «Προς τιμολόγηση»", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const clientName = CLIENT_NAME(P);

  // 1. Προκαταβολή: Είσπραξη χωρίς Τιμολόγιο.
  await signIn(page, "owner@example.com");
  await openTab(page, "Χρήματα", "Εισπράξεις");
  const form = card(page, "Νέα Είσπραξη");
  await form.getByLabel("Πελάτης").selectOption({ label: clientName });
  await form.getByLabel("Ποσό (€, με ΦΠΑ)").fill("400");
  await form.getByLabel("Τρόπος").selectOption({ label: "Τραπεζική κατάθεση" });
  await button(form, "Καταχώρηση Είσπραξης").click();
  await expect(form.getByRole("status")).toContainText(/Καταχωρήθηκε 400\s€ από/);

  // 2. Η Καρτέλα της ομάδας: αρνητικό υπόλοιπο «υπέρ του πελάτη» και «Προς τιμολόγηση». Ο Πελάτης διαλέγεται από την
  // κάρτα «Πελάτης», με το υπόλοιπό του δίπλα στο όνομα.
  await page.goto(LEDGER_PATH);
  await pickFilter(page, "Πελάτης", clientName);
  await expect(page).toHaveURL(/client=[0-9a-f-]{36}/);
  await expect(
    page.getByRole("heading", { name: "Υπόλοιπο υπέρ του πελάτη (με ΦΠΑ)" }),
  ).toBeVisible();
  await expect(page.getByText(/^400\s€$/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: TO_INVOICE })).toBeVisible();

  // 3. Ο Χρήστης πελάτη ανοίγει την Καρτέλα από τον Χώρο «Λογαριασμός» και βλέπει τη δική του, χωρίς «Προς τιμολόγηση».
  await switchUserInSpaces(page, CLIENT_EMAIL(P));
  await openTab(page, ACCOUNT, "Καρτέλα");
  await expect(page).toHaveURL(new RegExp(`${LEDGER_PATH}$`));
  await expect(
    page.getByRole("heading", { name: "Υπόλοιπο υπέρ σου (με ΦΠΑ)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Είσπραξη/ }).first(),
  ).toBeVisible();
  await expect(page.getByText(TO_INVOICE)).toHaveCount(0);
  await expect(page.getByText("Προς τιμολόγηση")).toHaveCount(0);
});

test("ο Χρήστης πελάτη βλέπει τη λίστα Τιμολογίων του χωρίς καταχώρηση", async ({
  page,
}) => {
  await signIn(page, CLIENT_EMAIL(project()));
  await expect(spaceLink(page, ACCOUNT)).toBeVisible();
  await openTab(page, ACCOUNT, "Τιμολόγια");
  await expect(page).toHaveURL(/\/app\/finance\/invoices$/);
  await expect(
    page.getByRole("link", { name: "Καταχώρηση Τιμολογίου" }),
  ).toHaveCount(0);
  // Χωρίς τα σύνολα της ομάδας («Μας χρωστούν…»).
  await expect(page.getByText("Μας χρωστούν", { exact: false })).toHaveCount(0);
});
