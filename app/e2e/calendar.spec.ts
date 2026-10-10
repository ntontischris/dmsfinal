import { expect, test, type Page } from "@playwright/test";

import { currentFifteenth, visit } from "./filming-parts";
import { button, field, project, shot, signIn } from "./sales-parts";

// Ημερολόγιο (A5), Κλεισμένος χρόνος (A6) και Σύνδεσμος ημερολογίου από άκρη σε άκρη. Σειριακά, χωρίς retries.
// Κάθε τεστ φτιάχνει τα δικά του στοιχεία με όνομα του project (desktop, mobile), γιατί τα δύο projects μοιράζονται βάση.

test.describe.configure({ mode: "serial", retries: 0 });

const CALENDAR = "/app/calendar";
const CALENDAR_LINK_HEADING = "Σύνδεσμος ημερολογίου";

const entryNamed = (page: Page, title: string) =>
  page.getByRole("link", { name: new RegExp(title) });

const linkPanel = (page: Page) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: CALENDAR_LINK_HEADING }),
  });

// Ο κλεισμένος χρόνος μπαίνει από τη φόρμα Α6· η μέρα είναι του Ημερολογίου αν δεν δοθεί.
async function addBlockedTime(
  page: Page,
  {
    title,
    from,
    to,
    day,
  }: { title: string; from: string; to: string; day?: string },
): Promise<void> {
  await visit(page, `/app/calendar/blocked/new${day ? `?date=${day}` : ""}`);
  await field(page, "Από").fill(from);
  await field(page, "Έως").fill(to);
  await field(page, "Τίτλος").fill(title);
  await button(page, "Αποθήκευση").click();
  await expect(page).toHaveURL(/\/app\/calendar\?view=week/);
}

// Ζητά σύνδεσμο (ή ανανέωση, με επιβεβαίωση αν υπάρχει ήδη) και γυρίζει τη διεύθυνση που φάνηκε.
async function issueLink(page: Page): Promise<string> {
  const panel = linkPanel(page);
  const address = panel.locator("code");
  const renew = button(panel, "Ανανέωση συνδέσμου");
  const create = button(panel, "Δημιουργία συνδέσμου");
  // Η κατάσταση του συνδέσμου έρχεται με τη σελίδα· αποφασίζουμε μόνο αφού φανεί ένα από τα δύο.
  await expect(renew.or(create)).toBeVisible();
  const previous = (await address.count()) > 0 ? await address.innerText() : "";
  const hasLink = await renew.isVisible();
  await (hasLink ? renew : create).click();
  if (hasLink) await button(panel, "Ανανέωση τώρα").click();
  await expect(address).toBeVisible();
  if (previous) await expect(address).not.toHaveText(previous);
  // Πριν την επόμενη κλήση, η σελίδα πρέπει να δείχνει ότι υπάρχει σύνδεσμος (αλλιώς η απόφαση πάει σε παλιά κατάσταση).
  await expect(renew).toBeVisible();
  return (await address.innerText()).trim();
}

test("ο Ιδιοκτήτης κλείνει χρόνο, τον βλέπει στην εβδομάδα, τον ανοίγει και τον σβήνει", async ({
  page,
}) => {
  const P = project();
  const title = `Ραντεβού ${P}`;
  await signIn(page, "owner@example.com");
  await addBlockedTime(page, { title, from: "14:00", to: "15:00" });

  await expect(entryNamed(page, title)).toBeVisible();
  await shot(page, "calendar-week");
  await entryNamed(page, title).click();
  await expect(page).toHaveURL(/\/app\/calendar\/blocked\/[0-9a-f-]{36}$/);
  await expect(field(page, "Τίτλος")).toHaveValue(title);

  await button(page, "Διαγραφή").click();
  await button(page, "Διαγραφή τώρα").click();
  await expect(page).toHaveURL(/\/app\/calendar\?view=week/);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("ο Ιδιοκτήτης δημιουργεί σύνδεσμο, το .ics ανοίγει και η ανανέωση σταματά τον παλιό", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await visit(page, CALENDAR);

  const first = await issueLink(page);
  const feed = await page.request.get(first);
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("BEGIN:VCALENDAR");

  const second = await issueLink(page);
  expect(second).not.toBe(first);
  expect((await page.request.get(first)).status()).toBe(404);
  expect((await page.request.get(second)).status()).toBe(200);
});

// Η προσυμπλήρωση της φόρμας (ώρα, διάρκεια, κρυφό πεδίο) ελέγχεται στα τεστ μονάδας· εδώ ελέγχουμε τον σύνδεσμο
// και ότι η φόρμα ανοίγει. Η φόρμα θέλει Συμφωνία με Περίοδο, και το seed έχει μία Ευκαιρία ανά project: μια νέα
// Συμφωνία εδώ θα χαλούσε το filming.spec.
test("η μετατροπή κλεισμένου χρόνου ανοίγει το νέο Γύρισμα με την ώρα και τη διάρκειά του", async ({
  page,
}) => {
  const P = project();
  const title = `Μετατροπή ${P}`;
  const day = currentFifteenth();
  await signIn(page, "owner@example.com");
  await addBlockedTime(page, { title, from: "16:00", to: "18:00", day });

  await visit(page, `/app/calendar?view=week&date=${day}`);
  await entryNamed(page, title).click();
  const convert = page.getByRole("link", {
    name: "Μετατροπή σε Γύρισμα",
    exact: true,
  });
  await expect(convert).toHaveAttribute(
    "href",
    /fromBlocked=[0-9a-f-]{36}&startsAt=.+&hours=2$/,
  );
  await convert.click();
  await expect(page).toHaveURL(/\/app\/filming\/new\?/);
  await expect(
    page.getByRole("heading", { name: "Νέο Γύρισμα", exact: true }),
  ).toBeVisible();
});
