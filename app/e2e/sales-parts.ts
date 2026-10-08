import { createClient } from "@supabase/supabase-js";
import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import { z } from "zod";

// Βοηθητικά του e2e/sales.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Τα δύο projects (desktop, mobile) μοιράζονται μία βάση, γι' αυτό κάθε όνομα που φτιάχνει ή ψάχνει ένα τεστ έχει το όνομα του project.

const PASSWORD = "e2e-password-123";

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Κωδικός").fill(PASSWORD);
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

export const shot = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e-results/screens/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });

export const project = () => test.info().project.name;

export const card = (page: Page, title: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

// Στο κινητό οι γραμμές του πίνακα γίνονται κάρτες, γι' αυτό ψάχνουμε `tr` με κείμενο και όχι `getByRole("row")`.
export const tableRow = (scope: Page | Locator, text: string) =>
  scope.locator("tr", { hasText: text });

// Το πεδίο ενός Field: η ετικέτα το τυλίγει, οπότε το `getByLabel(…, { exact: true })` δεν ταιριάζει ποτέ σε select
// (το κείμενο της ετικέτας περιλαμβάνει και τις επιλογές του) ούτε σε πεδίο με υπόδειξη. Εδώ ταιριάζει ακριβώς το κείμενο του τίτλου.
export const field = (scope: Page | Locator, label: string) =>
  scope
    .locator(`label:has(> span:text-is("${label}"))`)
    .locator("input, select");

// Η πλαϊνή στήλη ταυτότητας του Πελάτη (Inspector): η μόνη `aside` με πεδίο «Υπεύθυνος».
export const inspector = (page: Page) =>
  page.locator("aside", { has: page.locator("dt", { hasText: "Υπεύθυνος" }) });

export const listItem = (scope: Page | Locator, text: string) =>
  scope.locator("li", { hasText: text });

// Το service role χρησιμεύει μόνο για να βρει ένα id ή να διαβάσει μια ρύθμιση, ποτέ για να κάνει το ίδιο το τεστ.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function clientIdByName(name: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("clients")
    .select("id")
    .eq("name", name)
    .single();
  if (error) throw error;
  return z.object({ id: z.string() }).parse(data).id;
}

export async function formRouting(): Promise<string> {
  const { data, error } = await serviceClient()
    .from("sales_settings")
    .select("form_routing")
    .single();
  if (error) throw error;
  return z.object({ form_routing: z.string() }).parse(data).form_routing;
}

// Ένας άλλος Χρήστης σε δικό του browser context (δική του συνεδρία), που κλείνει πάντα όταν τελειώσει το βήμα.
export async function inContext(
  browser: Browser,
  email: string,
  run: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await signIn(page, email);
    await run(page);
  } finally {
    await context.close();
  }
}

// Η φόρμα «Νέα Ευκαιρία» με νέο Πελάτη: ό,τι είναι υποχρεωτικό, με ονόματα που φέρουν το όνομα του project.
export async function fillNewOpportunity(page: Page, P: string) {
  await field(page, "Πελάτης της Ευκαιρίας").selectOption("__new__");
  await field(page, "Όνομα Πελάτη").fill(`Νέος Πελάτης ${P}`);
  await field(page, "Κύριο πρόσωπο").fill("Σοφία Νέου");
  await field(page, "Email κύριου προσώπου").fill(
    `new.${P}@nea-pelatis.example.gr`,
  );
  await field(page, "Τίτλος Ευκαιρίας").fill(`Βίντεο παρουσίασης ${P}`);
  await field(page, "Πηγή").selectOption({ label: "Instagram" });
  await field(page, "Επόμενο βήμα").fill("Πρώτο τηλεφώνημα");
}

// Κουμπί με ακριβές όνομα: το `name` του getByRole ταιριάζει αλλιώς σε υπο-κείμενο (π.χ. «Απόσυρση» και «Μεταφορά και απόσυρση»).
export const button = (scope: Page | Locator, name: string) =>
  scope.getByRole("button", { name, exact: true });
