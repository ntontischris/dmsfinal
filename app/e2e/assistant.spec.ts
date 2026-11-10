import { expect, test, type Page } from "@playwright/test";

import { project, shot, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Ο Βοηθός (A9) και Ρυθμίσεις › Εταιρεία › Βοηθός από άκρη σε άκρη (#193). Το CI δεν έχει κλειδιά παρόχων AI, άρα ο Βοηθός
// απαντά «δεν είναι διαθέσιμος τώρα» χωρίς καμία κλήση AI. Ο Χρήστης πελάτη «know.{project}@example.com» (Πλήρης) έρχεται από
// το seed της Γνώσης. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const RETENTION =
  "Οι Συζητήσεις κρατιούνται 12 μήνες από το τελευταίο μήνυμα και τις βλέπει η εταιρεία.";
const CAP_LABEL = "Πλαφόν μήνα ($)";

// Η κάρτα «Βοηθός» των Ρυθμίσεων (O1).
const assistantCard = (page: Page) =>
  page.locator(".o-card").filter({
    has: page.getByRole("heading", { name: "Βοηθός", exact: true }),
  });

test("ο Χρήστης πελάτη ρωτά τον Βοηθό και, χωρίς AI, παίρνει σύνδεσμο στη Συνομιλία", async ({
  page,
}) => {
  await signIn(page, `know.${project()}@example.com`);
  const launcher = page.getByRole("button", { name: "Βοηθός", exact: true });
  await launcher.click();

  const dialog = page.getByRole("dialog", { name: "Βοηθός" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(RETENTION)).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Ερώτηση" })).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Πώς εγκρίνω ένα Παραδοτέο;" }),
  ).toBeVisible();
  await shot(page, "a9-welcome");

  await dialog.getByRole("button", { name: "Πώς κλείνω Γύρισμα;" }).click();
  await expect(
    dialog
      .getByRole("listitem")
      .getByText("Ο Βοηθός δεν είναι διαθέσιμος τώρα."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Γράψε στη Συνομιλία με την ομάδα" }),
  ).toHaveAttribute("href", "/app/messages");
  await shot(page, "a9-unavailable");

  // Γραμμή ερώτησης με μετρητή· «Νέα Συζήτηση» ξεκινά από την αρχή· Esc κλείνει και το focus γυρίζει στο κουμπί.
  await dialog
    .getByRole("textbox", { name: "Ερώτηση" })
    .fill("Τι ώρα ανοίγετε;");
  await expect(dialog.getByText("16/1000")).toBeVisible();
  await dialog.getByRole("button", { name: "Νέα Συζήτηση" }).click();
  await expect(
    dialog
      .getByRole("listitem")
      .getByText("Ο Βοηθός δεν είναι διαθέσιμος τώρα."),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
});

test("ο Ιδιοκτήτης αλλάζει το πλαφόν του Βοηθού, η Διαχείριση όχι", async ({
  page,
}) => {
  const cap = project() === "mobile" ? "32" : "31";
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/company");
  const card = assistantCard(page);
  await expect(card.getByText(/Τρέχουσα χρήση:/)).toBeVisible();
  // Δύο φόρμες στην κάρτα: όρια widget και πλαφόν (μόνο Ιδιοκτήτης), η καθεμία με δική της αποθήκευση.
  const capForm = card.locator("form", { has: page.getByLabel(CAP_LABEL) });
  await capForm.getByLabel(CAP_LABEL).fill(cap);
  await capForm.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(capForm.getByRole("status")).toContainText("Αποθηκεύτηκε");
  await expect(card.getByText(`από $${cap}.00.`)).toBeVisible();
  await shot(page, "o1-assistant-owner");

  await page.context().clearCookies();
  await useSpacesLook(page.context());
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/company");
  // Η Διαχείριση βλέπει το πλαφόν κλειδωμένο («Μόνο Ιδιοκτήτης»), χωρίς πεδίο για να το αλλάξει.
  await expect(assistantCard(page).getByLabel(CAP_LABEL)).toHaveCount(0);
  await expect(
    assistantCard(page).locator(".o-locked", { hasText: "Πλαφόν μήνα" }),
  ).toContainText("Μόνο Ιδιοκτήτης");
  await expect(
    assistantCard(page).getByLabel("Μηνύματα ανά Συζήτηση"),
  ).toBeEnabled();
});
