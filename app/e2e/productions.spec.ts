import { expect, test } from "@playwright/test";

import {
  fieldOf,
  openNewInternal,
  openProduction,
  PRODUCTION_URL,
} from "./productions-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";

// Παραγωγές (G1, G2) από άκρη σε άκρη. Το «Showreel {project}» το φτιάχνει το e2e/seed.mjs (Εσωτερική, Υπεύθυνος ο Ιδιοκτήτης).
// Τα τεστ γράφουν στην ίδια βάση, σειριακά: οι νέες εγγραφές φέρουν το όνομα του project.
// Σειριακά και χωρίς retries. Η Ρένα είναι ήδη Μέλος του seed, γι' αυτό το τεστ προσθέτει άλλον Χρήστη.
test.describe.configure({ retries: 0 });

const DELIVERY_NOTE = "Drive, φάκελος Οκτωβρίου";
const REOPEN_REASON = "Ζητήθηκε αλλαγή στο μοντάζ";
const CANCEL_REASON = "Δεν θα γυριστεί";
const MEMBER_NAME = "Δημήτρης Διαχείριση";
const OWNER_NAME = "Γιώργος Ιδιοκτήτης";

test("ο Ιδιοκτήτης βλέπει την Παραγωγή, προσθέτει Μέλος, την παραδίδει και την ξανανοίγει", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Showreel ${P}`;

  await signIn(page, "owner@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: /Παραγωγές$/ })).toBeVisible();

  await page.goto("/app/productions");
  await expect(tableRow(page, TITLE)).toBeVisible();
  await expect(
    page.getByText("Νέα Εσωτερική Παραγωγή", { exact: true }),
  ).toBeVisible();

  await openProduction(page, TITLE);
  await expect(card(page, "Κατάσταση")).toContainText("Ανοιχτή");
  await expect(card(page, "Υπεύθυνος")).toContainText(OWNER_NAME);
  await expect(card(page, "Συμφωνία")).toContainText("δεν ανήκει σε Συμφωνία");
  await expect(card(page, "Περίοδος")).toContainText("καμία Περίοδος");

  const members = card(page, "Μέλη");
  await fieldOf(members, "Μέλος ομάδας").selectOption({ label: MEMBER_NAME });
  await button(members, "Προσθήκη").click();
  await expect(members.getByRole("status")).toContainText(
    "Το Μέλος προστέθηκε.",
  );
  await expect(card(page, "Μέλη")).toContainText(MEMBER_NAME);

  const deliver = page.locator("form", {
    has: page.getByRole("button", { name: "Παράδοση", exact: true }),
  });
  await fieldOf(deliver, "Τι παραδόθηκε και πού (υποχρεωτικό)").fill(
    DELIVERY_NOTE,
  );
  await button(deliver, "Παράδοση").click();
  await expect(card(page, "Κατάσταση")).toContainText("Παραδομένη");
  await expect(card(page, "Ιστορικό")).toContainText(
    `Παραδόθηκε: ${DELIVERY_NOTE}`,
  );
  await shot(page, "g2-owner-delivered");

  const reopen = page.locator("form", {
    has: page.getByRole("button", { name: "Επανάνοιγμα", exact: true }),
  });
  await fieldOf(reopen, "Λόγος επανανοίγματος (υποχρεωτικός)").fill(
    REOPEN_REASON,
  );
  await button(reopen, "Επανάνοιγμα").click();
  await expect(card(page, "Κατάσταση")).toContainText("Ανοιχτή");
  await expect(card(page, "Ιστορικό")).toContainText(
    `Ξανανοίχτηκε. Λόγος: ${REOPEN_REASON}`,
  );
});

test("ο Ιδιοκτήτης φτιάχνει Εσωτερική Παραγωγή και την ακυρώνει με λόγο", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Εσωτερική ${P}`;

  await signIn(page, "owner@example.com");
  await page.goto("/app/productions");
  const form = await openNewInternal(page);
  await fieldOf(form, "Τίτλος").fill(TITLE);
  await fieldOf(form, "Υπεύθυνος").selectOption({ label: OWNER_NAME });
  await button(form, "Δημιουργία").click();

  await expect(page).toHaveURL(PRODUCTION_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE, exact: true }),
  ).toBeVisible();
  await expect(card(page, "Συμφωνία")).toContainText("δεν ανήκει σε Συμφωνία");

  const cancel = page.locator("form", {
    has: page.getByRole("button", { name: "Ακύρωση", exact: true }),
  });
  await fieldOf(cancel, "Λόγος ακύρωσης (υποχρεωτικός)").fill(CANCEL_REASON);
  await button(cancel, "Ακύρωση").click();
  await expect(card(page, "Κατάσταση")).toContainText("Ακυρωμένη");
  await expect(card(page, "Κατάσταση")).toContainText(
    `Λόγος: ${CANCEL_REASON}`,
  );

  await page.goto("/app/productions?tab=all&internal=1");
  await expect(tableRow(page, TITLE)).toContainText("Ακυρωμένη");
});

test("η Παραγωγή με Εύρος «όσα με αφορούν» βλέπει μόνο τις δικές της και δεν μεταβιβάζει", async ({
  page,
}) => {
  const P = project();

  await signIn(page, "production@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: /Παραγωγές$/ })).toBeVisible();

  await page.goto("/app/productions?tab=all&internal=1");
  await expect(tableRow(page, `Showreel ${P}`)).toBeVisible();
  await expect(tableRow(page, `Εσωτερική ${P}`)).toHaveCount(0);
  await expect(
    page.getByText("Νέα Εσωτερική Παραγωγή", { exact: true }),
  ).toHaveCount(0);

  await openProduction(page, `Showreel ${P}`);
  await expect(
    card(page, "Υπεύθυνος").getByRole("button", {
      name: "Μεταβίβαση",
      exact: true,
    }),
  ).toHaveCount(0);
  await shot(page, "g2-production");
});
