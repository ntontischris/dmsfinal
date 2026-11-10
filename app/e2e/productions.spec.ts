import { expect, test, type Page } from "@playwright/test";

import { visit } from "./filming-parts";
import {
  confirmWithReason,
  createInternal,
  openProduction,
} from "./productions-parts";
import { button, card, project, shot, signIn, tableRow } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Παραγωγές (G1, G2) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Το «Showreel {project}» το φτιάχνει το e2e/seed.mjs
// (Εσωτερική, Υπεύθυνος ο Ιδιοκτήτης). Τα τεστ γράφουν στην ίδια βάση, σειριακά: οι νέες εγγραφές φέρουν το όνομα του project.
// Σειριακά και χωρίς retries. Η Ρένα είναι ήδη Μέλος του seed, γι' αυτό το τεστ προσθέτει άλλον Χρήστη.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const DELIVERY_NOTE = "Drive, φάκελος Οκτωβρίου";
const REOPEN_REASON = "Ζητήθηκε αλλαγή στο μοντάζ";
const CANCEL_REASON = "Δεν θα γυριστεί";
const MEMBER_NAME = "Δημήτρης Διαχείριση";
const OWNER_NAME = "Γιώργος Ιδιοκτήτης";

// Οι καρτέλες του Χώρου «Παραγωγή» (κεφαλίδα της σελίδας): εκεί φαίνεται αν ο Χρήστης έχει τις Παραγωγές.
const productionTab = (page: Page) =>
  page
    .getByRole("navigation", { name: "Παραγωγή", exact: true })
    .getByRole("link", { name: "Παραγωγές", exact: true });

test("ο Ιδιοκτήτης βλέπει την Παραγωγή, προσθέτει Μέλος, την παραδίδει και την ξανανοίγει", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Showreel ${P}`;

  await signIn(page, "owner@example.com");
  await visit(page, "/app/productions");
  await expect(productionTab(page)).toBeVisible();
  await expect(tableRow(page, TITLE)).toBeVisible();
  await expect(button(page, "Νέα Εσωτερική Παραγωγή")).toBeVisible();

  await openProduction(page, TITLE);
  const state = card(page, "Κατάσταση");
  // Η λέξη της κατάστασης είναι το σήμα στην κεφαλίδα του πάνελ (το κείμενο από κάτω αναφέρει κι άλλες καταστάσεις).
  const stateWord = state.locator(".kit-panel-head");
  await expect(stateWord).toContainText("ανοιχτή");
  await expect(state).toContainText(OWNER_NAME);
  // Εσωτερική χωρίς Συμφωνία και χωρίς Περίοδο: η κεφαλίδα το λέει και δεν υπάρχουν Παροχές Περιόδου.
  const header = page.locator(".g2-header");
  await expect(header).toContainText("Εσωτερική Παραγωγή");
  await expect(header.getByText("Συμφωνία", { exact: true })).toHaveCount(0);
  await expect(card(page, "Παροχές της Περιόδου")).toHaveCount(0);

  const members = card(page, "Μέλη");
  await expect(async () => {
    await members.getByLabel("Νέο Μέλος").selectOption({ label: MEMBER_NAME });
    await expect(button(members, "Προσθήκη Μέλους")).toBeEnabled({
      timeout: 1_000,
    });
  }).toPass();
  await button(members, "Προσθήκη Μέλους").click();
  await expect(members.getByRole("status")).toContainText(
    "Το Μέλος προστέθηκε.",
  );
  await expect(
    members.locator("li.g2-member", { hasText: MEMBER_NAME }),
  ).toBeVisible();

  await confirmWithReason(page, {
    open: "Παράδοση χειροκίνητα",
    label: "Σχόλιο παράδοσης (υποχρεωτικό)",
    confirm: "Παράδοση",
    reason: DELIVERY_NOTE,
  });
  await expect(stateWord).toContainText("παραδομένη");
  await expect(state).toContainText(`Σχόλιο: ${DELIVERY_NOTE}`);
  await expect(card(page, "Ίχνος ενεργειών")).toContainText(
    `Παραδόθηκε: ${DELIVERY_NOTE}`,
  );
  await shot(page, "g2-owner-delivered");

  await confirmWithReason(page, {
    open: "Επανάνοιγμα",
    label: "Λόγος επανανοίγματος (υποχρεωτικός)",
    confirm: "Επανάνοιγμα",
    reason: REOPEN_REASON,
  });
  await expect(stateWord).toContainText("ανοιχτή");
  await expect(card(page, "Ίχνος ενεργειών")).toContainText(
    `Ξανανοίχτηκε. Λόγος: ${REOPEN_REASON}`,
  );
});

test("ο Ιδιοκτήτης φτιάχνει Εσωτερική Παραγωγή και την ακυρώνει με λόγο", async ({
  page,
}) => {
  const P = project();
  const TITLE = `Εσωτερική ${P}`;

  await signIn(page, "owner@example.com");
  await createInternal(page, TITLE, OWNER_NAME);
  await expect(page.locator(".g2-header")).toContainText("Εσωτερική Παραγωγή");
  await expect(card(page, "Κατάσταση")).toContainText(OWNER_NAME);

  await confirmWithReason(page, {
    open: "Ακύρωση Παραγωγής",
    label: "Λόγος ακύρωσης (υποχρεωτικός)",
    confirm: "Ακύρωση Παραγωγής",
    reason: CANCEL_REASON,
  });
  const state = card(page, "Κατάσταση");
  await expect(state.locator(".kit-panel-head")).toContainText("ακυρωμένη");
  await expect(state).toContainText(`Λόγος: ${CANCEL_REASON}`);

  // Οι παλιές διευθύνσεις (?tab=all&internal=1) ανοίγουν την προβολή «Εσωτερικές», με όλες τις καταστάσεις.
  await visit(page, "/app/productions?tab=all&internal=1");
  await expect(tableRow(page, TITLE)).toContainText("ακυρωμένη");
});

test("η Παραγωγή με Εύρος «όσα με αφορούν» βλέπει μόνο τις δικές της και δεν μεταβιβάζει", async ({
  page,
}) => {
  const P = project();

  await signIn(page, "production@example.com");
  await visit(page, "/app/productions?tab=all&internal=1");
  await expect(productionTab(page)).toBeVisible();
  await expect(tableRow(page, `Showreel ${P}`)).toBeVisible();
  await expect(tableRow(page, `Εσωτερική ${P}`)).toHaveCount(0);
  await expect(button(page, "Νέα Εσωτερική Παραγωγή")).toHaveCount(0);

  await openProduction(page, `Showreel ${P}`);
  // Η μεταβίβαση είναι το «Αλλαγή» του Υπευθύνου στο πάνελ «Κατάσταση».
  await expect(button(card(page, "Κατάσταση"), "Αλλαγή")).toHaveCount(0);
  await shot(page, "g2-production");
});
