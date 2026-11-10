import { expect, test } from "@playwright/test";

import { switchUserInSpaces } from "./messages-parts";
import { project, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Τα Αιτήματα (Jδ, #163) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Αιτημάτων {project}» και ο Χρήστης πελάτη
// «requests.{project}@example.com» (Πλήρης, Υπεύθυνος του Πελάτη η Άννα) έρχονται από το seed. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const MESSAGES_PATH = "/app/messages";

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

test("ο πελάτης στέλνει Αίτημα «άλλο», η ομάδα το απορρίπτει με απάντηση και ο πελάτης τη βλέπει", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const P = project();
  const text = `Θέλουμε ένα βίντεο για το event ${P}`;
  const reply = `Δεν προλαβαίνουμε φέτος ${P}`;

  // 1. Ο πελάτης διαλέγει «Ζήτα κάτι να γίνει» με είδος «Κάτι άλλο» και περιγράφει τι χρειάζεται.
  await signIn(page, `requests.${P}@example.com`);
  await page.goto(MESSAGES_PATH);
  const composer = page.locator("form", {
    has: page.getByRole("heading", { name: "Νέο μήνυμα", exact: true }),
  });
  await page.waitForLoadState("networkidle");
  await composer.getByRole("button", { name: /^Ζήτα κάτι να γίνει/ }).click();
  const other = composer.getByRole("radio", { name: "Κάτι άλλο" });
  await other.check();
  await expect(other).toBeChecked();
  await composer.getByLabel("Περίγραψε τι χρειάζεσαι").fill(text);
  await composer.getByRole("button", { name: "Στείλε το αίτημα" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Το Αίτημα στάλθηκε." }),
  ).toBeVisible();

  // 2. Το Μήνυμα έγινε Αίτημα: ανοιχτό, χωρίς υπεύθυνο προς τον πελάτη και χωρίς διαγραφή.
  const sent = page.locator("article", { hasText: text });
  const box = sent.getByRole("region", { name: "Αίτημα · Άλλο" });
  await expect(box).toContainText("ανοιχτό");
  await expect(box).not.toContainText("Ανατέθηκε");
  await expect(sent.getByRole("button", { name: "Διαγραφή" })).toHaveCount(0);
  await expect(sent).toContainText("δεν διαγράφεται");

  // 3. Η καρτέλα «Αιτήματα (1 ανοιχτά)» το έχει πρώτο.
  await page.goto(`${MESSAGES_PATH}?tab=requests`);
  await expect(
    page.getByRole("link", { name: "Αιτήματα (1 ανοιχτά)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: text }),
  ).toContainText("ανοιχτό");

  // 4. Ο Ιδιοκτήτης το βρίσκει στα «όλα τα ανοιχτά» (υπεύθυνη είναι η Άννα), το ανοίγει και το απορρίπτει με απάντηση.
  await switchUserInSpaces(page, "owner@example.com");
  await page.goto(`${MESSAGES_PATH}?tab=requests&view=open`);
  const row = page.getByRole("listitem").filter({ hasText: text });
  await expect(row).toContainText("Υπεύθυνος: Άννα");
  await row.getByRole("link", { name: "Άνοιγμα" }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}#m-/);
  const request = page
    .locator("article", { hasText: text })
    .getByRole("region", { name: "Αίτημα: Άλλο" });
  await request.getByRole("button", { name: "Απόρριψη", exact: true }).click();
  await request
    .getByLabel("Απάντηση προς τον πελάτη (υποχρεωτική)")
    .fill(reply);
  await request.getByRole("button", { name: "Απόρριψη Αιτήματος" }).click();
  await expect(request).toContainText("απορρίφθηκε");
  await expect(request).toContainText(reply);

  // 5. Ο πελάτης βλέπει «Απάντηση της ομάδας: …» στην καρτέλα Αιτήματα, χωρίς υπεύθυνο.
  await switchUserInSpaces(page, `requests.${P}@example.com`);
  await page.goto(`${MESSAGES_PATH}?tab=requests`);
  const item = page.getByRole("listitem").filter({ hasText: text });
  await expect(item).toContainText("απορρίφθηκε");
  await expect(item).toContainText(`Απάντηση της ομάδας: ${reply}`);
  await expect(item).not.toContainText("Υπεύθυνος");
  await expect(
    page.getByRole("link", { name: "Αιτήματα (0 ανοιχτά)" }),
  ).toBeVisible();
});
