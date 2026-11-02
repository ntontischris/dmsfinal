import Link from "next/link";
import type { ReactNode } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import {
  Badge,
  StateNotice,
  fmtMoney,
  type BadgeTone,
} from "@/spaces/screens/shared";

import type { ChangeRow, HourCostGlance, MethodItem } from "./o6-adapter";

// Τα κοινά της σελίδας Ρυθμίσεων από το prototype (`screens/o-shared.tsx`) που χρειάζεται η O6, και τα μπλοκ της
// `o6-cost.tsx` που έχουν πραγματική πηγή.

// Οι καρτέλες του prototype (O1–O6 + O7) με τις πραγματικές διαδρομές των Ρυθμίσεων.
const SETTINGS_TABS: readonly { id: string; label: string; href: string }[] = [
  { id: "O1", label: "Εταιρεία", href: "/app/settings/company" },
  { id: "O2", label: "Πωλήσεις", href: "/app/settings/sales" },
  { id: "O3", label: "Συμφωνίες", href: "/app/settings/agreements" },
  { id: "O4", label: "Γυρίσματα", href: "/app/settings/filming" },
  { id: "O5", label: "Παραδοτέα", href: "/app/settings/deliverables" },
  { id: "O6", label: "Οικονομικά", href: "/app/settings/finance" },
];

export function SettingsTabs({ code }: { code: string }) {
  return (
    <nav className="tabs" aria-label="Ενότητες Ρυθμίσεων">
      {SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.id}
          className="tab"
          href={tab.href}
          aria-current={tab.id === code ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
      <Link className="tab" href={hrefOf("O7")}>
        Έλεγχος ετοιμότητας
      </Link>
    </nav>
  );
}

export function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="o-card">
      <Panel label={title}>{children}</Panel>
    </div>
  );
}

export function Pending() {
  return <Badge tone="attention">εκκρεμεί</Badge>;
}

export function NoCostPermission() {
  return (
    <StateNotice kind="denied" title="Θέλει το Δικαίωμα «Διαχειρίζεται κόστος»">
      Τα έξοδα περιέχουν μισθούς, οπότε τα βλέπει και τα αλλάζει μόνο όποιος
      έχει αυτό το Δικαίωμα (αρχικά μόνο ο Ιδιοκτήτης).
    </StateNotice>
  );
}

// Χωρίς «Διαχειρίζεται κόστος»: μόνο το σύνολο Κόστος ώρας του μήνα (prototype `O6AdminCost`).
export function AdminCost({ glance }: { glance: HourCostGlance }) {
  return (
    <>
      <NoCostPermission />
      <SettingsCard
        title={
          glance.monthLabel
            ? `Κόστος ώρας, ${glance.monthLabel}`
            : "Κόστος ώρας"
        }
      >
        <p>
          {glance.hourCost === null ? (
            <Pending />
          ) : (
            <strong>{fmtMoney(glance.hourCost)} ανά ώρα</strong>
          )}
        </p>
        <p className="muted o-hint">
          Βλέπεις μόνο το σύνολο· τα έξοδα και οι μισθοί φαίνονται σε όποιον
          έχει το Δικαίωμα.
        </p>
      </SettingsCard>
    </>
  );
}

const STATUS_TONE: Readonly<Record<MethodItem["status"], BadgeTone>> = {
  "Σε χρήση": "ok",
  Αποσύρθηκε: "faded",
};

// Οι Τρόποι είσπραξης μόνο για ανάγνωση, στη μορφή του ListEditor του prototype.
export function MethodsList({ items }: { items: readonly MethodItem[] }) {
  return (
    <div className="o-card">
      <Panel label="Τρόποι είσπραξης" aside={<Badge>μόνο ελληνικά</Badge>}>
        <RowList>
          {items.map((item, index) => (
            <ListRow
              key={item.id}
              isFaded={item.status === "Αποσύρθηκε"}
              lead={<span>{index + 1}</span>}
              title={item.label}
              aside={
                <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
              }
            />
          ))}
        </RowList>
        <p className="muted o-hint">
          Αλλάζουν μόνο από όποιον «Διαχειρίζεται Ρυθμίσεις».
        </p>
      </Panel>
    </div>
  );
}

export function RecentChanges({
  rows,
  canSeeAudit,
}: {
  rows: readonly ChangeRow[];
  canSeeAudit: boolean;
}) {
  return (
    <div className="o-recent">
      <Panel
        label="Τελευταίες αλλαγές"
        aside={
          canSeeAudit && (
            <Link href={hrefOf("P1")}>Όλες οι αλλαγές στο Ίχνος</Link>
          )
        }
        isFlush
      >
        {rows.length === 0 ? (
          <p className="muted o-recent-empty">
            Καμία αλλαγή ακόμα σε αυτή την ενότητα.
          </p>
        ) : (
          <RowList>
            {rows.map((row) => (
              <ListRow
                key={row.key}
                lead={<span className="part-sub">{row.when}</span>}
                title={row.title}
                sub={row.sub}
              />
            ))}
          </RowList>
        )}
      </Panel>
    </div>
  );
}
