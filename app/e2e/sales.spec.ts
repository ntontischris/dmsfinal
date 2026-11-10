import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  button,
  card,
  clientIdByName,
  fillNewOpportunity,
  field,
  formRouting,
  inSpacesContext,
  inspector,
  openNewLead,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";
import { panel } from "./catalogue-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Πελάτες και Ευκαιρίες (B1–B6) και Ρυθμίσεις › Πωλήσεις (O2) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Φανταστικά στοιχεία.
// Τους Πελάτες και τις Ευκαιρίες που διαβάζονται εδώ τους φτιάχνει το e2e/seed.mjs (βοηθητικά: e2e/sales-parts.ts).
const PIPELINE_URL = /\/app\/pipeline\/[0-9a-f-]{36}$/;

// Τα τεστ γράφουν στην ίδια βάση: μια επανάληψη θα έβρισκε τα δεδομένα της πρώτης προσπάθειας μισοαλλαγμένα
// και θα έκρυβε το πραγματικό λάθος.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

// Η κάρτα μιας Ευκαιρίας στις Στήλες του Pipeline (B3).
const boardCard = (page: Page, title: string): Locator =>
  page.locator(".kcard", { hasText: title });

// Ένα ζευγάρι των Πιθανών διπλών (B6): οι δύο πλευρές του έχουν για τίτλο το όνομα του Πελάτη.
const duplicatePair = (page: Page, name: string): Locator =>
  page
    .locator("section", { has: page.locator(".compare") })
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

// Μια γραμμή λίστας των Ρυθμίσεων (O2) με ακριβή τίτλο.
const settingsRow = (scope: Locator, title: string): Locator =>
  scope.locator("li", {
    has: scope
      .page()
      .locator(".part-title", { hasText: new RegExp(`^${title}$`) }),
  });

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
  await expect(taken).toContainText("Ανήκει σε άλλον πωλητή");
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

  const forgotten = boardCard(page, `Βίντεο εγκαινίων ${P}`);
  await expect(
    forgotten.locator(".badge", { hasText: /^Ξεχασμένη$/ }),
  ).toBeVisible();
  await expect(page.getByText(`Έξτρα reels ${P}`)).toHaveCount(0);
  await expect(page.getByText("δεν μπαίνει με το χέρι")).toBeVisible();

  // Το φίλτρο ζει στη σελίδα: το πάτημα πριν ζωντανέψει η σελίδα χάνεται, γι' αυτό ξαναπατιέται.
  const onlyForgotten = page
    .getByRole("group", { name: "Ποιες Ευκαιρίες" })
    .getByRole("button", { name: /^Ξεχασμένες/ });
  await expect(async () => {
    await onlyForgotten.click();
    await expect(onlyForgotten).toHaveAttribute("aria-pressed", "true", {
      timeout: 1_000,
    });
  }).toPass();
  await expect(
    card(page, "Πάρε τηλέφωνο").getByRole("link", {
      name: `Βίντεο εγκαινίων ${P}`,
      exact: true,
    }),
  ).toBeVisible();
  await shot(page, "b3-pipeline");
});

test("νέα Ευκαιρία, δουλειά, κλείσιμο ως χαμένη και νέα Ευκαιρία από αυτήν", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  const form = await openNewLead(page);

  await fillNewOpportunity(form, P);
  await button(form, "Δημιουργία Πελάτη και Ευκαιρίας").click();

  await expect(page).toHaveURL(PIPELINE_URL);
  await expect(
    page.getByText("Η Ευκαιρία δημιουργήθηκε στο Στάδιο «Νέα»"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Κερδισμένη/ })).toHaveCount(0);

  const activities = card(page, "Δραστηριότητες");
  await activities
    .getByLabel("Είδος Δραστηριότητας")
    .selectOption({ label: "Κλήση" });
  await activities
    .getByLabel("Κείμενο Δραστηριότητας")
    .fill(`Μίλησα με τη Σοφία ${P}`);
  await button(activities, "Καταγραφή").click();
  await expect(page.getByText(`Μίλησα με τη Σοφία ${P}`)).toBeVisible();

  // Το Στάδιο αλλάζει με την επιλογή, χωρίς κουμπί.
  await page
    .getByLabel("Στάδιο", { exact: true })
    .selectOption({ label: "Πρώτη επαφή" });
  await expect(
    page.getByText("Αλλαγή Σταδίου: «Νέα» → «Πρώτη επαφή»."),
  ).toBeVisible();
  await shot(page, "b4-opportunity");

  // Μετονομασία της Ευκαιρίας: κρατά Στάδιο και Επόμενο βήμα.
  await button(page, "Μετονομασία").click();
  const titleField = page.getByLabel("Τίτλος Ευκαιρίας", { exact: true });
  await titleField.fill(`Βίντεο παρουσίασης και reels ${P}`);
  await button(page.locator("form", { has: titleField }), "Αποθήκευση").click();
  await expect(
    page.getByRole("heading", {
      name: `Βίντεο παρουσίασης και reels ${P}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Στάδιο", { exact: true }).locator("option:checked"),
  ).toHaveText("Πρώτη επαφή");
  await expect(page.getByText("Πρώτο τηλεφώνημα, 08/01/2099")).toBeVisible();

  const lostUrl = page.url();
  await button(page, "Κλείσιμο ως χαμένη").click();
  await field(page, "Λόγος απώλειας").selectOption({ label: "Τιμή" });
  await button(page, "Κλείσιμο ως χαμένη").click();
  await expect(
    page.getByText("Μια χαμένη Ευκαιρία δεν ξανανοίγει."),
  ).toBeVisible();

  await button(page, "Νέα Ευκαιρία από αυτήν").click();
  await field(page, "Επόμενο βήμα").fill("Νέα επαφή");
  await field(page, "Πότε (υπενθύμιση)").fill("2099-01-08");
  await button(page, "Άνοιγμα νέας Ευκαιρίας").click();

  await expect(page).not.toHaveURL(lostUrl);
  await expect(page).toHaveURL(PIPELINE_URL);
  await expect(page.locator("dt", { hasText: "Συνεχίζει" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Κερδισμένη/ })).toHaveCount(0);
  // Το πάνελ «Πρόταση» (B4): η Άννα μπορεί να συντάξει, άρα βλέπει τη φόρμα δημιουργίας.
  await expect(panel(page, "Πρόταση")).toContainText("Σύνταξη πρότασης");

  // Το όνομα του Πελάτη αλλάζει από τη σελίδα του («Αλλαγή στοιχείων»).
  await page
    .getByRole("link", { name: `Νέος Πελάτης ${P}`, exact: true })
    .click();
  const side = inspector(page);
  const edit = side.locator("form", { has: page.locator('input[name="afm"]') });
  await expect(async () => {
    if (!(await edit.isVisible()))
      await button(side, "Αλλαγή στοιχείων").click();
    await expect(edit).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await field(edit, "Όνομα πελάτη ή επιχείρησης").fill(
    `Νέος Πελάτης Α.Ε. ${P}`,
  );
  await button(edit, "Αποθήκευση").click();
  await expect(
    side
      .getByRole("status")
      .filter({ hasText: `όνομα Νέος Πελάτης Α.Ε. ${P}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: `Νέος Πελάτης Α.Ε. ${P}` }),
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
  const topicField = page.getByLabel("Τι αφορά η Ευκαιρία", { exact: true });
  await expect(async () => {
    if (!(await topicField.isVisible()))
      await button(page, "Αίτημα πρόσβασης").click();
    await expect(topicField).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await topicField.fill(topic);
  await button(page, "Αποστολή αιτήματος").click();
  await expect(
    page.getByText("Το αίτημα στάλθηκε στη Διαχείριση"),
  ).toBeVisible();

  await inSpacesContext(browser, "admin@example.com", async (admin) => {
    await admin.goto("/app/unassigned");
    const request = admin.locator("li.card", { hasText: topic });
    await expect(request).toContainText(`Γυμναστήριο Κίνηση ${P}`);
    await button(request, "Έγκριση").click();
    await expect(request).toHaveCount(0);
  });

  await page.goto(clientUrl);
  await expect(inspector(page)).toContainText("Νίκος Πωλήσεις");
  // Η παλιά διεύθυνση της καρτέλας Ευκαιρίες ανοίγει τις «Πωλήσεις»· εκεί είναι η Ευκαιρία της έγκρισης.
  await page.goto(`${clientUrl}?tab=opportunities`);
  await expect(
    page.getByRole("link", { name: topic, exact: true }).first(),
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

  const item = page.locator("li.card", {
    has: page.getByRole("link", { name: title, exact: true }),
  });
  await expect(item).toContainText("Νέος Πελάτης");
  await item
    .getByLabel("Υπεύθυνος", { exact: true })
    .selectOption({ label: "Νίκος Πωλήσεις" });
  await button(item, "Ανάθεση").click();
  await expect(item).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toHaveCount(0);
  await shot(page, "b5-queue");

  await inSpacesContext(browser, "sales@example.com", async (seller) => {
    await seller.goto("/app/unassigned");
    await expect(
      seller.getByRole("heading", { name: "Χωρίς πρόσβαση", exact: true }),
    ).toBeVisible();
    // Οι ουρές της λίστας Πελατών («Χωρίς υπεύθυνο», «Πιθανά διπλά») δεν φαίνονται σε όποιον δεν τις δικαιούται.
    await seller.goto("/app/clients");
    await expect(
      seller.getByRole("link", { name: /^(Χωρίς υπεύθυνο|Πιθανά διπλά)$/ }),
    ).toHaveCount(0);
  });
});

test("τα Πιθανά διπλά: το «Είναι άλλος» κλείνει το σήμα", async ({ page }) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await page.goto("/app/clients/duplicates");

  const pair = duplicatePair(page, `Καφέ Αθήναιον ${P}`);
  await expect(pair).toContainText("ίδιο τηλέφωνο");
  await shot(page, "b6-duplicates");
  await button(pair, "Είναι άλλος").click();
  await expect(pair).toHaveCount(0);

  await page.reload();
  await expect(duplicatePair(page, `Καφέ Αθήναιον ${P}`)).toHaveCount(0);
});

test("Ρυθμίσεις › Πωλήσεις: λίστες και πού πάνε οι νέες Ευκαιρίες", async ({
  page,
  browser,
}) => {
  const P = project();
  await inSpacesContext(browser, "sales@example.com", async (seller) => {
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

  const sources = panel(page, "Πηγές");
  const newValue = sources.getByLabel("Νέα τιμή", { exact: true });
  await expect(async () => {
    if (!(await newValue.isVisible()))
      await button(sources, "+ Νέα τιμή").click();
    await expect(newValue).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await newValue.fill(`Έκθεση ${P}`);
  await button(sources, "Προσθήκη").click();
  const added = settingsRow(sources, `Έκθεση ${P}`);
  await expect(added.locator(".badge", { hasText: /^Νέα$/ })).toBeVisible();
  await button(added, "Διαγραφή").click();
  await expect(added).toHaveCount(0);
  // Η γραμμή έφυγε με την ανανέωση· το μήνυμά της πρέπει να μείνει ορατό στη λίστα.
  await expect(sources.getByText(`«Έκθεση ${P}» διαγράφηκε`)).toBeVisible();

  const phone = settingsRow(sources, "Τηλέφωνο");
  await expect(phone.getByText(/^\d+ χρήσ(η|εις)$/)).toBeVisible();
  await expect(button(phone, "Απόσυρση")).toBeVisible();
  await expect(button(phone, "Διαγραφή")).toHaveCount(0);
  await shot(page, "o2-sales");

  // Η ρύθμιση γράφεται στη βάση και δεν πρέπει να μείνει στην ουρά ό,τι κι αν συμβεί (τα άλλα τεστ περιμένουν «Ιδιοκτήτης»).
  const routing = panel(page, "Νέες Ευκαιρίες από τη φόρμα");
  const choice = routing.getByLabel("Νέες Ευκαιρίες από τη φόρμα πάνε σε");
  try {
    await choice.selectOption({ label: "Χωρίς υπεύθυνο" });
    await button(routing, "Αποθήκευση").click();
    await expect(routing.getByRole("status")).toContainText("Αποθηκεύτηκε");
    await expect.poll(formRouting).toBe("queue");
  } finally {
    // Το «Αποθήκευση» ανάβει μόνο όταν κάτι αλλάξει: επιστροφή μόνο αν η ρύθμιση δεν είναι ήδη «Ιδιοκτήτης».
    if ((await formRouting()) !== "owner") {
      await page.reload();
      await choice.selectOption({ label: "Ιδιοκτήτης" });
      await button(routing, "Αποθήκευση").click();
      await expect.poll(formRouting).toBe("owner");
    }
  }
});
