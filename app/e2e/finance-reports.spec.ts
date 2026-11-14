import { expect, test } from "@playwright/test";

import { filterCard, startsWith } from "./finance-parts";
import { signIn } from "./sales-parts";

// Οι Αναφορές του παλιού DMS (d8): ο Ιδιοκτήτης βλέπει τα τέσσερα νέα πλακίδια, ανοίγει το καθένα με φίλτρο Περιόδου
// και βλέπει είτε τον πίνακα (τίτλος του Panel) είτε το «δεν υπάρχουν». Οι αριθμοί και οι αρνήσεις ελέγχονται στο pgTAP
// (finance_reports_test.sql)· εδώ μόνο η ροή. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const REPORTS_PATH = "/app/reports";

const REPORTS = [
  {
    id: "expenses",
    title: "Έξοδα ανά κατηγορία",
    shown: ["Κατηγορίες", "Δεν υπάρχουν Έξοδα"],
  },
  {
    id: "profit",
    title: "Έσοδα, Έξοδα και Κέρδος",
    shown: ["Μήνες", "Μήνες"],
  },
  {
    id: "payment-methods",
    title: "Τρόποι είσπραξης",
    shown: ["Τρόποι πληρωμής", "Δεν υπάρχουν Εισπράξεις"],
  },
  {
    id: "productions",
    title: "Παραγωγές ανά κατάσταση",
    shown: ["Είδη", "Δεν υπάρχουν Παραγωγές"],
  },
] as const;

test("ο Ιδιοκτήτης ανοίγει τις Αναφορές Εξόδων, Κέρδους, Τρόπων πληρωμής και Παραγωγών", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page, "owner@example.com");
  await page.goto(REPORTS_PATH);
  for (const report of REPORTS)
    await expect(
      page.getByRole("link", { name: new RegExp(report.title) }),
    ).toBeVisible();

  for (const report of REPORTS) {
    await page.goto(`${REPORTS_PATH}?report=${report.id}`);
    await expect(
      page.getByRole("heading", { level: 2, name: report.title }),
    ).toBeVisible();
    await expect(
      filterCard(page, "Περίοδος").locator(".kit-fb-chip"),
    ).toHaveText(startsWith("Φέτος"));
    await expect(
      page
        .getByRole("heading", { name: report.shown[0], exact: true })
        .or(page.getByText(report.shown[1], { exact: true }))
        .first(),
    ).toBeVisible();
  }
});
