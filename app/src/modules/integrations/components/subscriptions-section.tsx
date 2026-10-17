import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { formatDay, formatMoney } from "../labels";
import type { Subscription, SubscriptionsView } from "../schemas";
import { SubscriptionForm } from "./subscription-form";

const PAGE = "/app/settings/integrations";
const subHref = (sub: string): string =>
  `${PAGE}?sub=${encodeURIComponent(sub)}#subscriptions`;

function SubscriptionRow({ sub }: { sub: Subscription }) {
  return (
    <Tr>
      <Td data-label="Πάροχος">{sub.provider}</Td>
      <Td data-label="Τι καλύπτει">{sub.covers || "—"}</Td>
      <Td data-label="Πλάνο">{sub.plan || "—"}</Td>
      <Td data-label="Μηνιαίο κόστος" isNumeric>
        {formatMoney(sub.monthlyCost, sub.currency)}
      </Td>
      <Td data-label="Ανανέωση">{formatDay(sub.renewsOn)}</Td>
      <Td data-label="Λογαριασμός">{sub.account || "—"}</Td>
      <Td data-label="Ποιος πληρώνει">{sub.paidBy || "—"}</Td>
      <Td data-label="Ενέργειες">
        <span className="flex flex-wrap gap-3">
          {sub.link && (
            <a href={sub.link} target="_blank" rel="noreferrer">
              Πάροχος
            </a>
          )}
          <Link
            href={subHref(sub.id)}
            aria-label={`Επεξεργασία: ${sub.provider}`}
          >
            Επεξεργασία
          </Link>
        </span>
      </Td>
    </Tr>
  );
}

function Totals({ totals }: { totals: SubscriptionsView["totals"] }) {
  return (
    <div className="grid gap-1">
      <dl
        className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"
        aria-label="Σύνολα ανά νόμισμα"
      >
        {totals.map((total) => (
          <div key={total.currency} className="contents">
            <dt className="text-muted-foreground">
              Σύνολο μηνιαίως σε {total.currency}
            </dt>
            <dd className="m-0 font-semibold tabular-nums">
              {formatMoney(total.total, total.currency)}
            </dd>
          </div>
        ))}
      </dl>
      {totals.length > 1 && (
        <p className="m-0 text-sm text-muted-foreground">
          Τα νομίσματα δεν αθροίζονται μεταξύ τους.
        </p>
      )}
    </div>
  );
}

interface SubscriptionsSectionProps {
  view: SubscriptionsView;
  // «new», το id μιας συνδρομής, ή τίποτα (από το ?sub=).
  open: string | null;
}

// Μητρώο συνδρομών (Ν10): ό,τι πληρώνει η εταιρεία ή ο developer για το σύστημα, με σύνολο ανά νόμισμα από τη βάση.
export function SubscriptionsSection({
  view,
  open,
}: SubscriptionsSectionProps) {
  const editing =
    open && open !== "new"
      ? (view.items.find((sub) => sub.id === open) ?? null)
      : null;
  const isFormOpen = open === "new" || editing !== null;
  return (
    <Panel
      label="Συνδρομές"
      aside={
        <Link className={buttonVariants({ size: "sm" })} href={subHref("new")}>
          Νέα συνδρομή
        </Link>
      }
    >
      <div id="subscriptions" className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Η αλλαγή πλάνου γίνεται στον πάροχο· εδώ καταγράφεται. Επτά μέρες πριν
          από κάθε ανανέωση έρχεται Ειδοποίηση.
        </p>
        {isFormOpen && (
          <SubscriptionForm key={editing?.id ?? "new"} sub={editing} />
        )}
        {view.items.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Δεν έχει καταγραφεί καμία συνδρομή. Πρόσθεσε με «Νέα συνδρομή» ό,τι
            πληρώνεται για το σύστημα.
          </p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Πάροχος</Th>
                  <Th>Τι καλύπτει</Th>
                  <Th>Πλάνο</Th>
                  <Th isNumeric>Μηνιαίο κόστος</Th>
                  <Th>Ανανέωση</Th>
                  <Th>Λογαριασμός</Th>
                  <Th>Ποιος πληρώνει</Th>
                  <Th>
                    <span className="sr-only">Ενέργειες</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((sub) => (
                  <SubscriptionRow key={sub.id} sub={sub} />
                ))}
              </tbody>
            </Table>
            <Totals totals={view.totals} />
          </>
        )}
      </div>
    </Panel>
  );
}
