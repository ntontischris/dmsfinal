import { createClient } from "@supabase/supabase-js";
import {
  expect,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import { z } from "zod";

import { control, panel } from "./catalogue-parts";
import { button, tableRow } from "./sales-parts";

// Βοηθητικά του e2e/agreements.spec.ts (σε δικό τους αρχείο για να μένει το spec κάτω από 300 γραμμές).
// Οι Πελάτες και οι Ευκαιρίες έρχονται από το e2e/seed.mjs· κάθε Συμφωνία γράφεται από την οθόνη, όπως θα την έγραφε ο πωλητής.
// Τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε όνομα έχει το όνομα του project.

export const AGREEMENT_URL = /\/app\/agreements\/[0-9a-f-]{36}$/;
export const LINK_URL = /\/p\/[0-9a-f]{64}$/;
export const SIGNATORY = "Μαρία Συμφωνίου";

// Το service role βρίσκει μόνο το id μιας Ευκαιρίας· την Ευκαιρία δεν την αγγίζει ποτέ.
export async function opportunityIdByTitle(title: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  const { data, error } = await createClient(url, key, {
    auth: { persistSession: false },
  })
    .from("opportunities")
    .select("id")
    .eq("title", title)
    .single();
  if (error) throw error;
  return z.object({ id: z.string() }).parse(data).id;
}

export async function openOpportunity(page: Page, title: string) {
  await page.goto(`/app/pipeline/${await opportunityIdByTitle(title)}`);
  await expect(panel(page, "Πρόταση")).toBeVisible();
}

// B4 → «Σύνταξη πρότασης» → D2. Επιστρέφει τη διεύθυνση της D2.
export async function draftProposal(
  page: Page,
  proposal: { title: string; kind: "μηνιαία" | "εφάπαξ" },
): Promise<string> {
  await openOpportunity(page, proposal.title);
  const form = panel(page, "Πρόταση");
  await control(form, "Είδος").selectOption({ label: proposal.kind });
  await button(form, "Σύνταξη πρότασης").click();
  await expect(page).toHaveURL(AGREEMENT_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: proposal.title, exact: true }),
  ).toBeVisible();
  return page.url();
}

export async function addCatalogueLine(page: Page, name: string) {
  const lines = panel(page, "Γραμμές");
  await control(lines, "Προσθήκη από τον Κατάλογο").selectOption({
    label: name,
  });
  await button(lines, "Προσθήκη").click();
  await expect(
    lines.getByRole("status").filter({ hasText: "Η γραμμή προστέθηκε" }),
  ).toBeVisible();
}

export async function addFreeLine(
  page: Page,
  line: { description: string; price: string },
) {
  const lines = panel(page, "Γραμμές");
  await control(lines, "Περιγραφή ελεύθερης γραμμής").fill(line.description);
  await control(lines, "Τιμή ελεύθερης γραμμής (€)").fill(line.price);
  await button(lines, "Προσθήκη ελεύθερης γραμμής").click();
  await expect(
    lines
      .getByRole("status")
      .filter({ hasText: "Η ελεύθερη γραμμή προστέθηκε" }),
  ).toBeVisible();
}

// Το βήμα της πορείας που φωτίζεται: Σύνταξη, Αναμένει Έγκριση, Εστάλη ή Χάθηκε.
export const currentStep = (page: Page): Locator =>
  page
    .getByRole("list", { name: "Πορεία της πρότασης" })
    .locator('[aria-current="step"]');

// Ο Σύνδεσμος που περιμένει στα εξερχόμενα για τον Υπογράφοντα (πεδίο μόνο για ανάγνωση).
export async function readLink(page: Page): Promise<string> {
  const field = control(page, `Σύνδεσμος για ${SIGNATORY}`);
  await expect(field).toHaveValue(LINK_URL);
  return field.inputValue();
}

// «Αποστολή» και ο Σύνδεσμος που βγαίνει στα εξερχόμενα (δεν υπάρχει πάροχος email).
export async function sendAndReadLink(page: Page): Promise<string> {
  await button(page, "Αποστολή").click();
  await expect(page.getByText("Η πρόταση στάλθηκε")).toBeVisible();
  return readLink(page);
}

// Ο επισκέπτης δεν έχει συνεδρία: ανοίγει τον Σύνδεσμο σε δικό του context, που κλείνει πάντα όταν τελειώσει το βήμα.
export async function asVisitor(
  browser: Browser,
  run: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext();
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

// Ο εξαψήφιος κωδικός υπογραφής όπως τον δείχνουν τα εξερχόμενα («481 920»), μόνο ψηφία.
export async function readSigningCode(page: Page): Promise<string> {
  await page.reload();
  const body = page.locator("body");
  const shown = /Κωδικός υπογραφής για[^:]*:\s*(\d{3})\s?(\d{3})/;
  await expect(body).toContainText(shown);
  const match = (await body.innerText()).match(shown);
  if (!match) throw new Error("Δεν βρέθηκε ο κωδικός υπογραφής στα εξερχόμενα");
  return `${match[1]}${match[2]}`;
}

// Ένας κωδικός που σίγουρα δεν είναι ο σωστός: ίδιος, με άλλο τελευταίο ψηφίο.
export const wrongCodeFor = (code: string): string =>
  `${code.slice(0, 5)}${(Number(code[5]) + 1) % 10}`;

// Ανοίγει τη D2 μιας Συμφωνίας από τη λίστα D1, με τον τίτλο της.
export async function openAgreementByTitle(page: Page, title: string) {
  await page.goto("/app/agreements");
  await control(page, "Προβολή").selectOption({ label: "Όλες" });
  await tableRow(page, title)
    .getByRole("link", { name: title, exact: true })
    .click();
  await expect(page).toHaveURL(AGREEMENT_URL);
}

// Η 1η του προηγούμενου μήνα, με ημερολόγιο Αθήνας (YYYY-MM-DD): Έναρξη που ήδη πέρασε.
export function previousMonthStart(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Athens",
  }).format(now);
  const [year = 0, month = 1] = today.split("-").map(Number);
  const previous =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `${previous.year}-${String(previous.month).padStart(2, "0")}-01`;
}
