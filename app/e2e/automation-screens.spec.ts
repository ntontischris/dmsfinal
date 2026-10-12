import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { fieldOf, visit } from "./filming-parts";
import { project, signIn } from "./sales-parts";

// K1 Αυτοματισμοί, K2 Μηνύματα συστήματος και A2 Προτιμήσεις (#173) από άκρη σε άκρη. Ο Χρήστης πελάτη
// «notify.{project}@example.com» (Πλήρης) έρχεται από το seed. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία
// βάση, γι' αυτό ό,τι αλλάζει επανέρχεται στο finally.
test.describe.configure({ mode: "serial", retries: 0 });

const CLIENT_EMAIL = (P: string): string => `notify.${P}@example.com`;
const MARKER = (P: string): string => `Δοκιμή K1 ${P}`;

// Το service role χρησιμεύει μόνο για να επανέλθει η βάση αν το τεστ σταματήσει στη μέση.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function restoreOwnerChanges(P: string): Promise<void> {
  const admin = serviceClient();
  const { error: autoError } = await admin
    .from("automations")
    .delete()
    .like("body_el", `${MARKER(P)}%`);
  if (autoError) throw autoError;
  const { error: textError } = await admin
    .from("system_messages")
    .update({
      subject_el: null,
      subject_en: null,
      body_el: null,
      body_en: null,
    })
    .eq("code", "invite");
  if (textError) throw textError;
}

async function restoreClientPrefs(P: string): Promise<void> {
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((item) => item.email === CLIENT_EMAIL(P));
  if (!user) return;
  const { error: deleteError } = await admin
    .from("automation_optouts")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) throw deleteError;
}

test("ο Ιδιοκτήτης προσθέτει και σβήνει Αυτοματισμό στο «Νέο Μήνυμα» και αλλάζει το θέμα της πρόσκλησης", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const P = project();
  try {
    await signIn(page, "owner@example.com");

    // K1: κατάλογος → Γεγονός «Νέο Μήνυμα».
    await visit(page, "/app/settings/automations");
    await page
      .getByRole("link", { name: /Νέο Μήνυμα/ })
      .first()
      .click();
    await expect(page).toHaveURL(
      /\/app\/settings\/automations\/message\.created$/,
    );
    await expect(page.getByText("Μία περίπτωση")).toBeVisible();

    // Δεύτερος Αυτοματισμός Ειδοποίησης προς συγκεκριμένο Χρήστη.
    await page.getByRole("button", { name: "Προσθήκη Αυτοματισμού" }).click();
    const form = page.getByRole("region", { name: "Νέος Αυτοματισμός" });
    await fieldOf(form, "Παραλήπτες").selectOption("users");
    await form.getByLabel("Δημήτρης Διαχείριση").check();
    await form.getByLabel("Κείμενο, ελληνικά").fill(`${MARKER(P)}: `);
    await form.getByRole("button", { name: "{sender}" }).click();
    await expect(form.getByLabel("Κείμενο, ελληνικά")).toHaveValue(
      `${MARKER(P)}: {sender}`,
    );
    await form.getByRole("button", { name: "Αποθήκευση" }).click();

    const card = page.getByRole("region", { name: new RegExp(MARKER(P)) });
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("heading", {
        name: "Ειδοποίηση · προστέθηκε από τη Διαχείριση",
      }),
    ).toBeVisible();
    await expect(
      card.locator("dd", { hasText: "Δημήτρης Διαχείριση" }),
    ).toBeVisible();

    // Τον σβήνει (off) και μετά τον διαγράφει.
    await card.getByRole("checkbox", { name: "Ενεργός" }).uncheck();
    await expect(card.getByRole("status")).toContainText(
      "Ο Αυτοματισμός σβήστηκε.",
    );
    await card.getByRole("button", { name: "Διαγραφή" }).click();
    await card.getByRole("button", { name: "Ναι, διαγραφή" }).click();
    await expect(card).toHaveCount(0);

    // K2: το θέμα της πρόσκλησης αλλάζει και επανέρχεται.
    await visit(page, "/app/settings/system-messages");
    await page.getByRole("link", { name: "Επεξεργασία: Πρόσκληση" }).click();
    await expect(page).toHaveURL(/\/app\/settings\/system-messages\/invite$/);
    const subject = page.getByLabel("Θέμα, ελληνικά");
    await expect(subject).toHaveValue("Πρόσκληση στο DMS: {place}");
    await subject.fill(`Καλώς ήρθες στο DMS ${P}`);
    await page.getByRole("button", { name: "Αποθήκευση" }).click();
    await expect(page.getByText("αλλαγμένο κείμενο")).toBeVisible();
    await expect(
      page.getByText(`Καλώς ήρθες στο DMS ${P}`, { exact: true }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Επαναφορά αρχικού κειμένου" })
      .click();
    await expect(page.getByText("αλλαγμένο κείμενο")).toHaveCount(0);
    await expect(page.getByLabel("Θέμα, ελληνικά")).toHaveValue(
      "Πρόσκληση στο DMS: {place}",
    );
  } finally {
    await restoreOwnerChanges(P);
  }
});

test("ο πελάτης βλέπει κλειδωμένο το απαραίτητο και σβήνει ένα μη απαραίτητο στις Προτιμήσεις", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  try {
    await signIn(page, CLIENT_EMAIL(P));
    await visit(page, "/app/notifications");
    await page.getByRole("link", { name: "Προτιμήσεις" }).click();
    await expect(page).toHaveURL(/tab=prefs/);

    const locked = page.getByRole("checkbox", {
      name: "Λαμβάνω: Αίτημα ολοκληρώθηκε ή απορρίφθηκε · Ειδοποίηση",
    });
    await expect(locked).toBeChecked();
    await expect(locked).toBeDisabled();
    await expect(
      page.getByText("απαραίτητο: δεν σβήνει").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Γλώσσα των email" }),
    ).toBeVisible();

    const message = page.getByRole("checkbox", {
      name: "Λαμβάνω: Νέο Μήνυμα · Ειδοποίηση",
    });
    await expect(message).toBeEnabled();
    await message.uncheck();
    await expect(page.getByRole("status")).toContainText(
      "Δεν θα το λαμβάνεις.",
    );
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Λαμβάνω: Νέο Μήνυμα · Ειδοποίηση" }),
    ).not.toBeChecked();
  } finally {
    await restoreClientPrefs(P);
  }
});
