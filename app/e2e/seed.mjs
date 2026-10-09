// Φτιάχνει τους φανταστικούς Χρήστες των τεστ σε τοπικό Supabase. Τρέχει μόνο στο CI, ποτέ σε πραγματική βάση.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || !/127\.0\.0\.1|localhost/.test(url)) {
  console.error("seed: μόνο σε τοπικό Supabase (NEXT_PUBLIC_SUPABASE_URL στο 127.0.0.1)");
  process.exit(1);
}

export const PASSWORD = "e2e-password-123";
const USERS = [
  { email: "owner@example.com", name: "Γιώργος Ιδιοκτήτης", role: "Ιδιοκτήτης" },
  { email: "admin@example.com", name: "Δημήτρης Διαχείριση", role: "Διαχείριση" },
  { email: "sales@example.com", name: "Άννα Πωλήσεις", role: "Πωλήσεις" },
  { email: "nikos@example.com", name: "Νίκος Πωλήσεις", role: "Πωλήσεις" },
  { email: "production@example.com", name: "Ρένα Παραγωγή", role: "Παραγωγή" },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: roles, error: rolesError } = await admin.from("roles").select("id, name").eq("kind", "team");
if (rolesError) throw rolesError;

const ids = {};
for (const user of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  ids[user.email] = data.user.id;
  const { error: memberError } = await admin.from("team_users").insert({ user_id: data.user.id, name: user.name, email: user.email });
  if (memberError) throw memberError;
  const roleId = roles.find((role) => role.name === user.role)?.id;
  const { error: roleError } = await admin.from("team_user_roles").insert({ user_id: data.user.id, role_id: roleId });
  if (roleError) throw roleError;
  console.log(`seed: ${user.email} → ${user.role}`);
}

// ───────────── Πωλήσεις: Πελάτες και Ευκαιρίες για το e2e/sales.spec.ts ─────────────
// Τα δύο projects του Playwright (desktop, mobile) μοιράζονται μία βάση, γι' αυτό κάθε όνομα και email έχει το όνομα του project.
// Σε αντίθεση με τους Χρήστες, οι Πελάτες μπαίνουν απευθείας με service role: δεν υπάρχει ακόμα άλλος τρόπος να γεννηθούν σε κατάσταση «κατειλημμένου».

const ANNA = ids["sales@example.com"];
const NIKOS = ids["nikos@example.com"];

async function codeId(table, code) {
  const { data, error } = await admin.from(table).select("id").eq("code", code).single();
  if (error) throw error;
  return data.id;
}

async function insertRow(table, values) {
  const { data, error } = await admin.from(table).insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

const stages = { new: await codeId("sales_stages", "new"), meeting: await codeId("sales_stages", "meeting") };
const phoneSource = await codeId("sales_sources", "phone");

// Πελάτης με τον Υπεύθυνό του και μία ανοιχτή Ευκαιρία. Η Πηγή «Τηλέφωνο» χρησιμοποιείται, άρα στις Ρυθμίσεις αποσύρεται, δεν σβήνεται.
async function seedClient({ name, email, contactName, phone = "", managerId, opportunity }) {
  const clientId = await insertRow("clients", {
    name,
    city: "Αθήνα",
    contact_name: contactName,
    contact_email: email,
    contact_phone: phone,
    manager_id: managerId,
  });
  await insertRow("opportunities", {
    client_id: clientId,
    manager_id: managerId,
    stage_id: stages[opportunity.stage],
    source_id: phoneSource,
    title: opportunity.title,
    next_step: opportunity.nextStep,
    next_step_due: opportunity.due,
  });
}

// Ευκαιρία από τη φόρμα της Ιστοσελίδας, με ουρά «Χωρίς υπεύθυνο» όσο τρέχει.
async function intake({ name, email, contactName, phone = "", title }) {
  const { error } = await admin.rpc("sales_intake_form", {
    p_client: { name, contact_name: contactName, contact_email: email, contact_phone: phone },
    p_title: title,
  });
  if (error) throw error;
}

async function setRouting(routing) {
  const { error } = await admin.from("sales_settings").update({ form_routing: routing, form_assignee_id: null }).eq("id", true);
  if (error) throw error;
}

for (const [P, n] of [["desktop", 1], ["mobile", 2]]) {
  await seedClient({
    name: `Κυψέλη Καφέ ${P}`,
    email: `kypseli.${P}@example.com`,
    contactName: "Μαρία Κυψελιώτου",
    managerId: ANNA,
    // Ξεχασμένη: η ημερομηνία του Επόμενου βήματος έχει περάσει.
    opportunity: { title: `Βίντεο εγκαινίων ${P}`, stage: "meeting", nextStep: "Ρώτα αν είδε την πρόταση", due: "2026-01-05" },
  });
  await seedClient({
    name: `Ταβέρνα Αρμύρα ${P}`,
    email: `armyra.${P}@example.com`,
    contactName: "Κώστας Αρμυράκης",
    managerId: NIKOS,
    opportunity: { title: `Νέο βίντεο εστιατορίου ${P}`, stage: "new", nextStep: "Κλείσε συνάντηση", due: "2099-01-01" },
  });
  // Στόχος του τεστ Αιτήματος πρόσβασης.
  await seedClient({
    name: `Γυμναστήριο Κίνηση ${P}`,
    email: `kinisi.${P}@example.com`,
    contactName: "Ελένη Κινητάκη",
    managerId: NIKOS,
    opportunity: { title: `Έξτρα reels ${P}`, stage: "new", nextStep: "Στείλε προσφορά", due: "2099-01-01" },
  });
  // Το τηλέφωνο το ξαναχρησιμοποιεί η φόρμα παρακάτω: έτσι γεννιέται το «Πιθανό διπλό».
  await seedClient({
    name: `Καφέ Αθηνά ${P}`,
    email: `athina.${P}@athina-cafe.example.gr`,
    contactName: "Αθηνά Παπαδοπούλου",
    phone: `231033300${n}`,
    managerId: NIKOS,
    opportunity: { title: `Social πακέτο Αθηνά ${P}`, stage: "new", nextStep: "Τηλεφώνημα γνωριμίας", due: "2099-01-01" },
  });

  await setRouting("queue");
  try {
    await intake({
      name: `Καφέ Αθήναιον ${P}`,
      email: `giannis.${P}@athinaion.example.gr`,
      contactName: "Γιάννης Αθηναίου",
      phone: `231033300${n}`,
      title: `Πακέτο social ${P}`,
    });
    await intake({
      name: `Φούρνος Σπόρος ${P}`,
      email: `niki.${P}@sporos.example.gr`,
      contactName: "Νίκη Σπόρου",
      title: `Βίντεο γνωριμίας ${P}`,
    });
  } finally {
    await setRouting("owner");
  }
  console.log(`seed: Πωλήσεις (${P})`);
}

// ───────────── Κατάλογος και Κόστος: Πακέτα, Υπηρεσίες και Κόστος ώρας για το e2e/catalogue.spec.ts ─────────────
// Οι πίνακες του Καταλόγου είναι κλειστοί στην εφαρμογή (μόνο RPC), αλλά όχι στο service role· τα RPC θέλουν συνδεδεμένο Χρήστη,
// γι' αυτό τα fixtures μπαίνουν απευθείας. Κάθε ενεργό στοιχείο έχει τιμή: το «Κατάλογος» του Ελέγχου ετοιμότητας είναι έτοιμο σε όλο το τρέξιμο.

async function insertPlain(table, values) {
  const { error } = await admin.from(table).insert(values);
  if (error) throw error;
}

const kindIds = {
  shoot: await codeId("provision_kinds", "shoot"),
  reel: await codeId("provision_kinds", "reel"),
  video: await codeId("provision_kinds", "video"),
};

// Ένα στοιχείο σε τέσσερις πίνακες: ονόματα, τιμή, ώρες και Άμεσο κόστος, Παροχές.
async function seedCatalogueItem({ item, price, hours, directCost = 0, directCostNote = "", provisions }) {
  const itemId = await insertRow("catalogue_items", item);
  await insertPlain("catalogue_item_amounts", { item_id: itemId, price });
  await insertPlain("catalogue_item_costs", {
    item_id: itemId,
    hours_shoot: hours[0],
    hours_edit: hours[1],
    direct_cost: directCost,
    direct_cost_note: directCostNote,
  });
  for (const [code, quantity] of provisions) {
    await insertPlain("catalogue_item_provisions", { item_id: itemId, kind_id: kindIds[code], quantity });
  }
}

for (const P of ["desktop", "mobile"]) {
  await seedCatalogueItem({
    item: { kind: "package", billing: "monthly", name: `Μηνιαία Παρουσία ${P}`, description: "Το βασικό μηνιαίο πακέτο social." },
    price: 1300,
    hours: [6, 14],
    provisions: [["shoot", 2], ["reel", 8]],
  });
  await seedCatalogueItem({
    item: { kind: "service", name: `Έξτρα reel ${P}`, unit: "ανά reel" },
    price: 150,
    hours: [1, 3],
    provisions: [["reel", 1]],
  });
  // Το στοιχείο που επεξεργάζεται ο Ιδιοκτήτης στο τεστ.
  await seedCatalogueItem({
    item: { kind: "package", billing: "one_off", name: `Εκδήλωση ${P}` },
    price: 400,
    hours: [4, 6],
    provisions: [["shoot", 1], ["video", 1]],
  });
  await seedCatalogueItem({
    item: { kind: "service", name: `Drone ${P}`, unit: "ανά ώρα" },
    price: 80,
    hours: [0, 0],
    directCost: 40,
    directCostNote: "ενοικίαση",
    provisions: [],
  });
  await seedCatalogueItem({
    item: { kind: "package", billing: "monthly", name: `Παλιό πακέτο ${P}`, retired_at: new Date().toISOString() },
    price: 500,
    hours: [0, 0],
    provisions: [["reel", 4]],
  });
  console.log(`seed: Κατάλογος (${P})`);
}

// Κόστος ώρας του τρέχοντος μήνα Αθήνας: 8.800 € ÷ 220 ώρες = 40,00 €. Οι πολλαπλασιαστές μένουν στα προεπιλεγμένα 1,3 / 1,6 / 2.
const currentMonth =
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit" }).format(new Date()) + "-01";
await insertPlain("cost_months", { month: currentMonth, expenses_total: 8800, productive_hours: 220 });
console.log(`seed: Κόστος ώρας (${currentMonth})`);

// ───────────── Συμφωνίες: Πελάτες και Ευκαιρίες για το e2e/agreements.spec.ts ─────────────
// Οι πίνακες των Συμφωνιών είναι κλειστοί και τα RPC θέλουν συνδεδεμένο Χρήστη, άρα το seed βάζει μόνο Πελάτες και Ευκαιρίες·
// κάθε Συμφωνία των τεστ γράφεται από την οθόνη. Τα δύο projects μοιράζονται μία βάση, γι' αυτό κάθε όνομα έχει το όνομα του project.

const proposalStage = await codeId("sales_stages", "proposal");
const threeDaysAhead = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Athens" }).format(new Date(Date.now() + 3 * 24 * 3600 * 1000));

// Πελάτης με το κύριο πρόσωπό του και ανοιχτές Ευκαιρίες στο στάδιο «Πρόταση».
async function seedProposalClient({ name, email, contactName, managerId, titles }) {
  const clientId = await insertRow("clients", {
    name,
    city: "Αθήνα",
    contact_name: contactName,
    contact_email: email,
    contact_phone: "",
    manager_id: managerId,
  });
  for (const title of titles) {
    await insertRow("opportunities", {
      client_id: clientId,
      manager_id: managerId,
      stage_id: proposalStage,
      source_id: phoneSource,
      title,
      next_step: "Πρόταση",
      next_step_due: threeDaysAhead,
    });
  }
}

for (const P of ["desktop", "mobile"]) {
  await seedProposalClient({
    name: `Πελάτης Συμφωνιών ${P}`,
    email: `symfonies.${P}@pelatis.example.gr`,
    contactName: "Μαρία Συμφωνίου",
    managerId: ANNA,
    titles: ["Α", "Β", "Γ", "Δ"].map((letter) => `Πρόταση ${letter} ${P}`),
  });
  await seedProposalClient({
    name: `Πελάτης Νίκου ${P}`,
    email: `nikou.${P}@pelatis.example.gr`,
    contactName: "Νίκος Πελάτου",
    managerId: NIKOS,
    titles: [`Πρόταση Νίκου ${P}`],
  });
  console.log(`seed: Συμφωνίες (${P})`);
}

// ───────────── Εξοπλισμός: ένα αντικείμενο ανά project για το e2e/equipment.spec.ts ─────────────
// Τα αντικείμενα μπαίνουν απευθείας με service role: το Πρότυπο της Παραγωγής δουλεύει πάνω σε αυτά.
async function nameId(table, name) {
  const { data, error } = await admin.from(table).select("id").eq("name", name).single();
  if (error) throw error;
  return data.id;
}

const cameraCategory = await nameId("equipment_categories", "Κάμερες");
for (const P of ["desktop", "mobile"]) {
  await insertRow("equipment_items", {
    category_id: cameraCategory,
    name: `Κάμερα ${P}`,
    code: "SN-A7-001",
    note: "Στο ντουλάπι του studio",
  });
}
console.log("seed: Εξοπλισμός");
