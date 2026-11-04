import { expect, test, type Page } from "@playwright/test";

import {
  clientIdByName,
  field,
  inspector,
  project,
  signIn,
} from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομή 03: Πελάτες. Νέος Πελάτης με Επωνυμία, Πόλη και ΑΦΜ· νέα Ευκαιρία σε υπάρχοντα χωρίς
// Πηγή· «Πιθανό διπλό» και στις δύο μεριές· η γραμμή «Σχέση με τον Πελάτη» με ορατό τίτλο. Ένας Πελάτης που μπήκε
// κατά λάθος σβήνεται· ένας με δουλειά όχι. Ό,τι φτιάχνει το τεστ το σβήνει στο τέλος.
const OWNER = "owner@example.com";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context, page }) => {
  await useSpacesLook(context);
  await signIn(page, OWNER);
});

// Δικό του κομμάτι σε κάθε project και προσπάθεια, ώστε μια αποτυχημένη να μην μπερδεύει την επόμενη.
const stamp = () => `${project()} ${test.info().retry} ${Date.now()}`;

// Έγκυρο ΑΦΜ (ψηφίο ελέγχου) από 8 ψηφία του χρόνου: μοναδικό ανά προσπάθεια, ώστε να μη βρει «ίδιο» Πελάτη.
const validAfm = (): string => {
  const head = String(Date.now()).slice(-8);
  const sum = [...head].reduce(
    (total, digit, index) => total + Number(digit) * 2 ** (8 - index),
    0,
  );
  return `${head}${(sum % 11) % 10}`;
};

// Τηλέφωνο που δεν έχει κανείς άλλος (μόνο το ζευγάρι του τεστ το μοιράζεται).
const uniquePhone = (): string => `69${String(Date.now()).slice(-8)}`;

async function openNewForm(page: Page, query = "") {
  const search = query === "" ? "" : `?q=${encodeURIComponent(query)}`;
  await page.goto(`/app/clients${search}`);
  const form = page.locator("form.new-lead");
  // Το κουμπί ζωντανεύει μόλις φορτώσει η σελίδα· μέχρι τότε το πάτημα χάνεται.
  await expect(async () => {
    if (!(await form.isVisible()))
      await page
        .getByRole("button", { name: "Νέος Πελάτης / Ευκαιρία", exact: true })
        .click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return form;
}

interface NewClient {
  name: string;
  email: string;
  phone?: string;
  legalName?: string;
  city?: string;
  afm?: string;
}

async function createClient(page: Page, client: NewClient): Promise<string> {
  const form = await openNewForm(page);
  await field(form, "Όνομα πελάτη ή επιχείρησης").fill(client.name);
  await field(form, "Κύριο πρόσωπο").fill("Σοφία Δοκιμής");
  if (client.phone) await field(form, "Τηλέφωνο").fill(client.phone);
  await field(form, "Email").fill(client.email);
  if (client.legalName) await field(form, "Επωνυμία").fill(client.legalName);
  if (client.city) await field(form, "Πόλη").fill(client.city);
  if (client.afm) await field(form, "ΑΦΜ (προαιρετικό)").fill(client.afm);
  await form.locator('textarea[name="title"]').fill("Βίντεο δοκιμής");
  await field(form, "Πηγή").selectOption({ label: "Τηλέφωνο" });
  await field(form, "Επόμενο βήμα").fill("Κλήση");
  await form
    .getByRole("button", {
      name: "Δημιουργία Πελάτη και Ευκαιρίας",
      exact: true,
    })
    .click();
  let clientId = "";
  await expect(async () => {
    clientId = await clientIdByName(client.name);
  }).toPass();
  return clientId;
}

async function deleteClient(page: Page, clientId: string, name: string) {
  await page.goto(`/app/clients/${clientId}`);
  const side = inspector(page);
  const dialog = page.getByRole("alertdialog", {
    name: `Διαγραφή Πελάτη: ${name}`,
  });
  await expect(async () => {
    if (!(await dialog.isVisible()))
      await side
        .getByRole("button", { name: "Διαγραφή Πελάτη", exact: true })
        .click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  const confirm = dialog.getByRole("button", { name: "Διαγραφή", exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Γράψε «${name}» για επιβεβαίωση`).fill(name);
  await confirm.click();
  await expect(page).toHaveURL(/\/app\/clients\?deleted=1$/);
}

test("03 · νέος Πελάτης με Επωνυμία, Πόλη και ΑΦΜ, που αλλάζουν και από τη σελίδα του", async ({
  page,
}) => {
  const s = stamp();
  const name = `Αρτοποιείο Στοιχείων ${s}`;
  const legalName = `Στοιχεία ${s} ΙΚΕ`;
  const afm = validAfm();
  const clientId = await createClient(page, {
    name,
    email: `walk-${Date.now()}@stoixeia.example.gr`,
    legalName,
    city: "Θεσσαλονίκη",
    afm,
  });

  await page.goto(`/app/clients/${clientId}`);
  const side = inspector(page);
  await expect(side).toContainText(legalName);
  await expect(side).toContainText("Θεσσαλονίκη");
  await expect(side).toContainText(afm);
  await expect(
    page.getByRole("heading", { name: "Σχέση με τον Πελάτη", exact: true }),
  ).toBeVisible();

  const edit = side.locator("form", { has: page.locator('input[name="afm"]') });
  await expect(async () => {
    if (!(await edit.isVisible()))
      await side
        .getByRole("button", { name: "Αλλαγή στοιχείων", exact: true })
        .click();
    await expect(edit).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(field(edit, "ΑΦΜ (προαιρετικό)")).toHaveValue(afm);
  await expect(field(edit, "Επωνυμία")).toHaveValue(legalName);
  await field(edit, "Πόλη").fill("Καβάλα");
  await edit.getByRole("button", { name: "Αποθήκευση", exact: true }).click();
  await expect(
    side.getByRole("status").filter({ hasText: "πόλη Καβάλα" }),
  ).toBeVisible();

  await deleteClient(page, clientId, name);
});

test("03 · νέα Ευκαιρία σε υπάρχοντα Πελάτη δεν ρωτά Πηγή", async ({
  page,
}) => {
  const name = `Αρτοποιείο Πηγής ${stamp()}`;
  const clientId = await createClient(page, {
    name,
    email: `walk-${Date.now()}@pigi.example.gr`,
  });

  // Η λίστα (και ο κατάλογος της φόρμας) φιλτράρεται στο όνομα, ώστε ο Πελάτης να είναι στις επιλογές.
  await openNewForm(page, name);
  await page
    .getByRole("button", { name: "Υπάρχων πελάτης", exact: true })
    .click();
  await page.getByLabel("Πελάτης της Ευκαιρίας").selectOption({ label: name });
  const form = page.locator("form.new-lead");
  await expect(form.locator('textarea[name="title"]')).toBeVisible();
  await expect(field(form, "Πηγή")).toHaveCount(0);
  await form.locator('textarea[name="title"]').fill("Δεύτερο βίντεο");
  await field(form, "Επόμενο βήμα").fill("Κλήση");
  await form
    .getByRole("button", { name: "Δημιουργία Ευκαιρίας", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/pipeline\/[0-9a-f-]+$/);

  await deleteClient(page, clientId, name);
});

test("03 · «Πιθανό διπλό» φαίνεται και στον νέο και στον υπάρχοντα Πελάτη", async ({
  page,
}) => {
  const s = stamp();
  const phone = uniquePhone();
  const existing = `Αρτοποιείο Ζευγαριού ${s}`;
  const candidate = `Δοκιμή Διπλού ${s}`;
  const existingId = await createClient(page, {
    name: existing,
    email: `walk-${Date.now()}@zeugari-a.example.gr`,
    phone,
  });
  const candidateId = await createClient(page, {
    name: candidate,
    email: `walk-${Date.now()}@zeugari-b.example.gr`,
    phone,
  });

  for (const [name, id] of [
    [existing, existingId],
    [candidate, candidateId],
  ] as const) {
    await page.goto(`/app/clients?q=${encodeURIComponent(name)}`);
    await expect(
      page.getByRole("link", {
        name: "Πιθανό διπλό: συγχώνευση ή όχι",
        exact: true,
      }),
    ).toHaveAttribute("href", "/app/clients/duplicates");
    await page.goto(`/app/clients/${id}`);
    await expect(
      page.locator("p.note", { hasText: "Σήμα «Πιθανό διπλό»." }),
    ).toBeVisible();
  }

  await deleteClient(page, candidateId, candidate);
  await deleteClient(page, existingId, existing);
});

test("03 · ο Ιδιοκτήτης σβήνει έναν Πελάτη που μπήκε κατά λάθος, γράφοντας το όνομά του", async ({
  page,
}) => {
  const name = `Λάθος Πελάτης ${project()} ${test.info().retry}`;
  const clientId = await createClient(page, {
    name,
    email: `walk-${Date.now()}@example.com`,
  });

  await deleteClient(page, clientId, name);
  await expect(
    page.getByRole("status").filter({ hasText: "Ο Πελάτης διαγράφηκε." }),
  ).toBeVisible();
  await page.goto(`/app/clients?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});

test("03 · ένας Πελάτης με δουλειά δεν σβήνεται και η σελίδα λέει γιατί", async ({
  page,
}) => {
  // Από το seed: έχει Χρήστη πελάτη (και, όταν τρέξουν τα τεστ Κρατήσεων, Συμφωνία). Ο λόγος αλλάζει, το «δεν σβήνεται» όχι.
  const clientId = await clientIdByName(`Πελάτης Κρατήσεων ${project()}`);
  await page.goto(`/app/clients/${clientId}`);
  const side = inspector(page);
  await expect(
    side.getByRole("button", { name: "Διαγραφή Πελάτη", exact: true }),
  ).toBeDisabled();
  await expect(side.getByText(/^Δεν σβήνεται: /)).toBeVisible();
});
