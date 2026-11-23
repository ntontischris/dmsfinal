import { agreementCaps, listAgreements } from "@/modules/agreements";
import { catalogueCaps, listCatalogue } from "@/modules/catalogue";
import type { Viewer } from "@/modules/access";

import { athensToday, canSeeAmounts, salesCaps } from "../helpers";
import { getPipelineValue } from "../queries-forecast";
import { listPipeline } from "../queries-opportunities";
import { listClientsOnce, listOverviewsOnce } from "./clients-once";

// Οι αριθμοί των καρτών του Χώρου «Πελάτες», μόνο από τις υπάρχουσες αναγνώσεις. null = δεν τον βλέπεις ή δεν φόρτωσε.
export interface ClientsNumbers {
  clients: { active: number; burning: number; overdue: number } | null;
  pipeline: { open: number; total: number | null } | null;
  agreements: {
    waiting: number;
    approval: number;
    total: number | null;
  } | null;
  catalogue: { packages: number; services: number } | null;
}

// Ενεργοί Πελάτες (sales_client_overview) και Επόμενα βήματα ανοιχτών Ευκαιριών που λήγουν σήμερα ή πέρασαν.
async function loadClients(today: string): Promise<ClientsNumbers["clients"]> {
  const [clients, pipeline] = await Promise.all([
    listClientsOnce(""),
    listPipeline(),
  ]);
  if (!clients.ok || !pipeline.ok) return null;
  const overviews = await listOverviewsOnce(
    clients.data.filter((row) => row.canOpen).map((row) => row.id),
  );
  if (!overviews.ok) return null;
  const due = pipeline.data.open.flatMap((item) =>
    item.nextStepDue !== null && item.nextStepDue <= today
      ? [item.nextStepDue]
      : [],
  );
  return {
    active: overviews.data.filter((row) => row.status === "active").length,
    burning: due.length,
    overdue: due.filter((day) => day < today).length,
  };
}

// Ανοιχτές Ευκαιρίες και η Αξία τους (sales_pipeline_value)· η Αξία μόνο με «Βλέπει ποσά».
async function loadPipeline(
  today: string,
  hasAmounts: boolean,
): Promise<ClientsNumbers["pipeline"]> {
  const value = await getPipelineValue(today);
  if (!value.ok) return null;
  return {
    open: value.data.open,
    total: hasAmounts && value.data.hasAmounts ? value.data.total : null,
  };
}

// Προτάσεις που περιμένουν ναι: Έγκριση μέσα ή απάντηση του Πελάτη (agreements_list).
async function loadAgreements(
  hasAmounts: boolean,
): Promise<ClientsNumbers["agreements"]> {
  const rows = await listAgreements();
  if (!rows.ok) return null;
  const waiting = rows.data.filter(
    (row) =>
      row.state === "proposal" &&
      (row.path === "awaiting_approval" || row.path === "sent"),
  );
  return {
    waiting: waiting.length,
    approval: waiting.filter((row) => row.path === "awaiting_approval").length,
    total: hasAmounts
      ? waiting.reduce((sum, row) => sum + (row.total ?? 0), 0)
      : null,
  };
}

// Πακέτα και Υπηρεσίες του Καταλόγου (catalogue_items_view, χωρίς τα αρχειοθετημένα).
async function loadCatalogue(): Promise<ClientsNumbers["catalogue"]> {
  const items = await listCatalogue();
  if (!items.ok) return null;
  const packages = items.data.filter((item) => item.kind === "package").length;
  return { packages, services: items.data.length - packages };
}

const unless = <T>(isAllowed: boolean, load: () => Promise<T>) =>
  isAllowed ? load() : Promise.resolve(null);

export async function loadClientsNumbers(
  viewer: Viewer,
): Promise<ClientsNumbers> {
  const today = athensToday();
  const sales = salesCaps(viewer);
  const agreements = agreementCaps(viewer);
  const hasAmounts = canSeeAmounts(viewer);
  const [clients, pipeline, proposals, catalogue] = await Promise.all([
    unless(sales.canViewClients, () => loadClients(today)),
    unless(sales.canManage, () => loadPipeline(today, hasAmounts)),
    unless(agreements.canView, () =>
      loadAgreements(hasAmounts && agreements.canSeeAmounts),
    ),
    unless(catalogueCaps(viewer).canView, loadCatalogue),
  ]);
  return { clients, pipeline, agreements: proposals, catalogue };
}
