import { expect, test } from "@playwright/test";

import { switchUser } from "./booking-parts";
import { fieldOf } from "./productions-parts";
import { button, card, project, signIn } from "./sales-parts";

// Καρτέλα Πελάτη (I5) και όψη πελάτη από άκρη σε άκρη (#153). Ο Πελάτης «Πελάτης Καρτέλας {project}» και ο Χρήστης πελάτη
// «ledger.{project}@example.com» (Πλήρης) έρχονται από το seed. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_NAME = (P: string): string => `Πελάτης Καρτέλας ${P}`;
const CLIENT_EMAIL = (P: string): string => `ledger.${P}@example.com`;
const LEDGER_PATH = "/app/finance/ledger";
const RECEIPTS_PATH = "/app/finance/receipts";
const NAV_FINANCE_LINK = /Οικονομικά$/;
const TO_INVOICE = "Προς τιμολόγηση";

test("ο Ιδιοκτήτης καταχωρεί Είσπραξη και ο πελάτης βλέπει την Καρτέλα του χωρίς «Προς τιμολόγηση»", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const clientName = CLIENT_NAME(P);

  // 1. Προκαταβολή: Είσπραξη χωρίς Τιμολόγιο.
  await signIn(page, "owner@example.com");
  await page.goto(RECEIPTS_PATH);
  const form = card(page, "Νέα Είσπραξη");
  await fieldOf(form, "Πελάτης").selectOption({ label: clientName });
  await fieldOf(form, "Ποσό (€, με ΦΠΑ)").fill("400");
  await fieldOf(form, "Τρόπος").selectOption({ label: "Τραπεζική κατάθεση" });
  await button(form, "Καταχώρηση Είσπραξης").click();
  await expect(form.getByRole("status")).toContainText(
    "Η Είσπραξη καταχωρήθηκε.",
  );

  // 2. Η Καρτέλα της ομάδας: αρνητικό υπόλοιπο «υπέρ του πελάτη» και «Προς τιμολόγηση».
  await page.goto(LEDGER_PATH);
  await expect(
    page.getByRole("heading", { level: 1, name: "Καρτέλα Πελάτη" }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(clientName) }).click();
  await expect(
    page.getByText("Υπόλοιπο υπέρ του πελάτη", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("400,00").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: TO_INVOICE })).toBeVisible();

  // 3. Ο Χρήστης πελάτη ανοίγει τα Οικονομικά από την πλοήγηση και βλέπει τη δική του Καρτέλα, χωρίς «Προς τιμολόγηση».
  await switchUser(page, CLIENT_EMAIL(P));
  await page
    .getByRole("navigation", { name: "Οθόνες" })
    .getByRole("link", { name: NAV_FINANCE_LINK })
    .click();
  await expect(page).toHaveURL(new RegExp(`${LEDGER_PATH}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Καρτέλα Πελάτη" }),
  ).toBeVisible();
  await expect(
    page.getByText("Υπόλοιπο υπέρ σου", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Είσπραξη/ }).first(),
  ).toBeVisible();
  await expect(page.getByText(TO_INVOICE)).toHaveCount(0);
});

test("ο Χρήστης πελάτη βλέπει τη λίστα Τιμολογίων του χωρίς καταχώρηση", async ({
  page,
}) => {
  await signIn(page, CLIENT_EMAIL(project()));
  await page.goto("/app/finance/invoices");
  await expect(
    page.getByRole("heading", { level: 1, name: "Τιμολόγια" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Καταχώρηση Τιμολογίου" }),
  ).toHaveCount(0);
  await expect(page.getByText("Ανεξόφλητα", { exact: true })).toHaveCount(0);
});
