import { expect, test } from "@playwright/test";

import {
  button,
  card,
  clientIdByName,
  fillNewOpportunity,
  field,
  formRouting,
  inContext,
  inspector,
  listItem,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";

// Πελάτες και Ευκαιρίες (B1–B6) και Ρυθμίσεις › Πωλήσεις (O2) από άκρη σε άκρη. Φανταστικά στοιχεία.
// Τους Πελάτες και τις Ευκαιρίες που διαβάζονται εδώ τους φτιάχνει το e2e/seed.mjs (βοηθητικά: e2e/sales-parts.ts).
const PIPELINE_URL = /\/app\/pipeline\/[0-9a-f-]{36}$/;

// Τα τεστ γράφουν στην ίδια βάση: μια επανάληψη θα έβρισκε τα δεδομένα της πρώτης προσπάθειας μισοαλλαγμένα
// και θα έκρυβε το πραγματικό λάθος.
test.describe.configure({ retries: 0 });

test("οι πωλητές βλέπουν τους Πελάτες των άλλων ως «Κατειλημμένους»", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await page.goto("/app/clients");
  await expect(
    page.getByRole("link", { name: `Κυψέλη Καφέ ${P}`, exact: true }),
  ).toBeVisible();

  const taken = tableRow(page, `Ταβέρνα Αρμύρα ${P}`);
  await expect(taken).toContainText("Κατειλημμένος");
  await expect(taken).toContainText("Νίκος Πωλήσεις");
  await expect(taken.getByRole("link")).toHaveCount(0);
  await shot(page, "b1-sales");

  await page.goto(
    `/app/clients/${await clientIdByName(`Ταβέρνα Αρμύρα ${P}`)}`,
  );
  await expect(
    page.getByRole("heading", {
      name: "Ο Πελάτης ανήκει σε άλλον πωλητή",
      exact: true,
    }),
  ).toBeVisible();
  await expect(button(page, "Αίτημα πρόσβασης")).toBeVisible();

  await page.goto("/app/clients");
  await page
    .getByRole("link", { name: `Κυψέλη Καφέ ${P}`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/clients\/[0-9a-f-]{36}$/);
  await expect(inspector(page)).toContainText("Άννα Πωλήσεις");
});

test("το Pipeline δείχνει τις ξεχασμένες Ευκαιρίες και το φίλτρο τις κρατά", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await page.goto("/app/pipeline");

  const forgotten = listItem(page, `Βίντεο εγκαινίων ${P}`);
  await expect(forgotten.getByText("Ξεχασμένη", { exact: true })).toBeVisible();
  await expect(page.getByText(`Έξτρα reels ${P}`)).toHaveCount(0);
  await expect(
    page.getByText("Κερδισμένη δεν μπαίνει με το χέρι"),
  ).toBeVisible();

  await page.getByRole("link", { name: /Μόνο ξεχασμένες/ }).click();
  await expect(page).toHaveURL(/forgotten=1/);
  await expect(
    page.getByRole("link", { name: `Βίντεο εγκαινίων ${P}`, exact: true }),
  ).toBeVisible();
  await shot(page, "b3-pipeline");
});

test("νέα Ευκαιρία, δουλειά, κλείσιμο ως χαμένη και νέα Ευκαιρία από αυτήν", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await page.goto("/app/clients");
  await button(page, "Νέα Ευκαιρία").click();

  await fillNewOpportunity(page, P);
  await button(page, "Δημιουργία Ευκαιρίας").click();

  await expect(page).toHaveURL(PIPELINE_URL);
  await expect(
    page.getByText("Η Ευκαιρία δημιουργήθηκε στο Στάδιο «Νέα»"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Κερδισμένη/ })).toHaveCount(0);

  const activities = card(page, "Δραστηριότητες");
  await field(activities, "Είδος Δραστηριότητας").selectOption({
    label: "Κλήση",
  });
  await field(activities, "Τι έγινε;").fill(`Μίλησα με τη Σοφία ${P}`);
  await button(activities, "Καταγραφή").click();
  await expect(page.getByText(`Μίλησα με τη Σοφία ${P}`)).toBeVisible();

  const work = card(page, "Δουλειά στην Ευκαιρία");
  await field(work, "Στάδιο").selectOption({ label: "Πρώτη επαφή" });
  await button(work, "Αποθήκευση").click();
  await expect(
    page.getByText("Αλλαγή Σταδίου: «Νέα» → «Πρώτη επαφή»."),
  ).toBeVisible();
  await shot(page, "b4-opportunity");

  const lostUrl = page.url();
  await button(page, "Κλείσιμο ως χαμένη").click();
  await field(page, "Λόγος απώλειας").selectOption({ label: "Τιμή" });
  await button(page, "Επιβεβαίωση κλεισίματος").click();
  await expect(
    page.getByRole("heading", {
      name: "Η Ευκαιρία έκλεισε ως χαμένη",
      exact: true,
    }),
  ).toBeVisible();

  await button(page, "Νέα Ευκαιρία από αυτήν").click();
  await field(page, "Επόμενο βήμα").fill("Νέα επαφή");
  await field(page, "Ημερομηνία επόμενου βήματος").fill("2099-01-01");
  await button(page, "Άνοιγμα Ευκαιρίας").click();

  await expect(page).not.toHaveURL(lostUrl);
  await expect(page).toHaveURL(PIPELINE_URL);
  await expect(page.locator("dt", { hasText: "Συνεχίζει" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Κερδισμένη/ })).toHaveCount(0);
  await expect(
    page.getByText("Οι προτάσεις έρχονται με το module Συμφωνίες"),
  ).toBeVisible();
});

test("Αίτημα πρόσβασης: ο πωλητής ζητά, η Διαχείριση εγκρίνει", async ({
  page,
  browser,
}) => {
  const P = project();
  const topic = `Βίντεο καμπάνιας ${P}`;
  const clientUrl = `/app/clients/${await clientIdByName(`Γυμναστήριο Κίνηση ${P}`)}`;

  await signIn(page, "sales@example.com");
  await page.goto(clientUrl);
  await field(page, "Τι αφορά").fill(topic);
  await field(page, "Πηγή").selectOption({ label: "Τηλέφωνο" });
  await button(page, "Αίτημα πρόσβασης").click();
  await expect(
    page.getByText("Το αίτημα στάλθηκε στη Διαχείριση"),
  ).toBeVisible();

  await inContext(browser, "admin@example.com", async (admin) => {
    await admin.goto("/app/unassigned");
    const request = listItem(card(admin, "Αιτήματα πρόσβασης"), topic);
    await expect(request).toContainText(`Γυμναστήριο Κίνηση ${P}`);
    await button(request, "Έγκριση").click();
    await expect(request).toHaveCount(0);
  });

  await page.goto(clientUrl);
  await expect(inspector(page)).toContainText("Νίκος Πωλήσεις");
  await page.goto(`${clientUrl}?tab=opportunities`);
  // Ο τίτλος γράφεται και στη σημείωση πρόσβασης (GrantedNote)· η Ευκαιρία είναι ο σύνδεσμος της λίστας.
  await expect(
    page.getByRole("link", { name: topic, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Έξτρα reels ${P}`)).toHaveCount(0);
});

test("η ουρά «Χωρίς υπεύθυνο»: η Διαχείριση αναθέτει, ο πωλητής δεν τη βλέπει", async ({
  page,
  browser,
}) => {
  const P = project();
  const title = `Βίντεο γνωριμίας ${P}`;
  await signIn(page, "admin@example.com");
  await page.goto("/app/unassigned");

  const item = listItem(card(page, "Ευκαιρίες χωρίς Υπεύθυνο"), title);
  await expect(item).toContainText("Νέος Πελάτης");
  // Το aria-label δίνει όνομα στο select, γι' αυτό το exact ταιριάζει· χωρίς αυτό θα ταίριαζε και σε τίτλο που περιέχει τον δικό μας.
  await item
    .getByLabel(`Νέος Υπεύθυνος: ${title}`, { exact: true })
    .selectOption({ label: "Νίκος Πωλήσεις" });
  await button(item, "Ανάθεση").click();
  await expect(item).toHaveCount(0);
  await page.reload();
  await expect(
    listItem(card(page, "Ευκαιρίες χωρίς Υπεύθυνο"), title),
  ).toHaveCount(0);
  await shot(page, "b5-queue");

  await inContext(browser, "sales@example.com", async (seller) => {
    await seller.goto("/app/unassigned");
    await expect(
      seller.getByRole("heading", { name: "Χωρίς δικαίωμα", exact: true }),
    ).toBeVisible();
    const nav = seller.getByRole("navigation", { name: "Οθόνες" });
    await expect(
      nav.getByRole("link", { name: /Χωρίς υπεύθυνο|Πιθανά διπλά/ }),
    ).toHaveCount(0);
  });
});

test("τα Πιθανά διπλά: το «Είναι άλλος» κλείνει το σήμα", async ({ page }) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await page.goto("/app/clients/duplicates");

  const pair = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: new RegExp(`^Καφέ Αθήναιον ${P} ~`),
    }),
  });
  await expect(pair).toContainText("ίδιο τηλέφωνο");
  await shot(page, "b6-duplicates");
  await button(pair, "Είναι άλλος").click();
  await expect(pair).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: new RegExp(`^Καφέ Αθήναιον ${P} ~`) }),
  ).toHaveCount(0);
});

test("Ρυθμίσεις › Πωλήσεις: λίστες και πού πάνε οι νέες Ευκαιρίες", async ({
  page,
  browser,
}) => {
  const P = project();
  await inContext(browser, "sales@example.com", async (seller) => {
    await seller.goto("/app/settings/sales");
    await expect(
      seller.getByRole("heading", { name: "Χωρίς δικαίωμα", exact: true }),
    ).toBeVisible();
  });

  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/company");
  await page
    .getByRole("navigation", { name: "Ενότητες Ρυθμίσεων" })
    .getByRole("link", { name: "Πωλήσεις", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/settings\/sales$/);

  const sources = card(page, "Πηγές");
  await field(sources, "Νέα τιμή").fill(`Έκθεση ${P}`);
  await button(sources, "Προσθήκη").click();
  const added = tableRow(sources, `Έκθεση ${P}`);
  await expect(added.getByText("Νέα", { exact: true })).toBeVisible();
  await button(added, "Διαγραφή").click();
  await expect(added).toHaveCount(0);
  // Η γραμμή έφυγε με την ανανέωση· το μήνυμά της πρέπει να μείνει ορατό στη λίστα.
  await expect(sources.getByText(`«Έκθεση ${P}» διαγράφηκε`)).toBeVisible();

  const phone = tableRow(sources, "Τηλέφωνο");
  await expect(phone.getByText(/Σε χρήση σε \d+/)).toBeVisible();
  await expect(button(phone, "Απόσυρση")).toBeVisible();
  await expect(button(phone, "Διαγραφή")).toHaveCount(0);
  await shot(page, "o2-sales");

  // Η ρύθμιση γράφεται στη βάση και δεν πρέπει να μείνει στην ουρά ό,τι κι αν συμβεί (τα άλλα τεστ περιμένουν «Ιδιοκτήτης»).
  const routing = card(page, "Νέες Ευκαιρίες από τη φόρμα");
  const choice = field(routing, "Νέες Ευκαιρίες από τη φόρμα πάνε σε");
  try {
    await choice.selectOption({ label: "Χωρίς υπεύθυνο" });
    await button(routing, "Αποθήκευση").click();
    await expect(routing.getByRole("status")).toContainText("Αποθηκεύτηκε");
    await expect.poll(formRouting).toBe("queue");
  } finally {
    await choice.selectOption({ label: "Ιδιοκτήτης" });
    await button(routing, "Αποθήκευση").click();
    await expect.poll(formRouting).toBe("owner");
  }
});
