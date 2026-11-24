import Link from "next/link";
import type { ReactNode } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import type { O1Change } from "./o1-adapter";

import "../../finance/spaces/money-lines.css";
import "./o.css";

// Κοινά της σελίδας Ρυθμίσεων στη νέα εμφάνιση (prototype `screens/o-shared.tsx`): καρτέλες, κλειδωμένο πεδίο, λίστες,
// τελευταίες αλλαγές. Το prototype άλλαζε κατάσταση με ?save=/?act=· εδώ τις ενέργειες τις δίνει ο καλών (πραγματικά actions).

// Οι καρτέλες του prototype (O1–O6 + O7), με τις πραγματικές διαδρομές.
// Το `needs` κρύβει την καρτέλα από όποιον δεν έχει το δικαίωμα που θέλει η σελίδα της.
export const SETTINGS_TABS: readonly {
  code: string;
  label: string;
  href: string;
  needs?: string;
}[] = [
  { code: "O1", label: "Εταιρεία", href: "/app/settings/company" },
  { code: "O2", label: "Πωλήσεις", href: "/app/settings/sales" },
  { code: "O3", label: "Συμφωνίες", href: "/app/settings/agreements" },
  { code: "O4", label: "Γυρίσματα", href: "/app/settings/filming" },
  { code: "O5", label: "Παραδοτέα", href: "/app/settings/deliverables" },
  { code: "O6", label: "Οικονομικά", href: "/app/settings/finance" },
  {
    code: "messages",
    label: "Μηνύματα",
    href: "/app/settings/messages",
    needs: "settings.manage",
  },
];

export const READINESS_HREF = "/app/settings/readiness";

// Οι υποσελίδες των Ρυθμίσεων πλοηγούνται πλέον μόνο από τις κάρτες του θέματος (spaces/data/spaces.ts): οι καρτέλες
// μέσα στη σελίδα δεν δείχνουν τίποτα. Οι κλήσεις τους φεύγουν σε επόμενο βήμα.
export function SettingsTabs(props: { code: string }): null {
  void props;
  return null;
}

export function LockedField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="o-locked">
      <span className="muted">{label}</span>
      <span>{value}</span>
      <Badge>🔒 Μόνο Ιδιοκτήτης</Badge>
    </div>
  );
}

export function Pending() {
  return <Badge tone="attention">εκκρεμεί</Badge>;
}

interface SettingsCardProps {
  title: string;
  // Μία φράση κάτω από τον τίτλο του κουτιού (τι έχει μέσα).
  hint?: string;
  // Κουτί Ρυθμίσεων (`details.ml-box`). Ανοιχτό εξ ορισμού για τις οθόνες των άλλων modules που το χρησιμοποιούν·
  // οι οθόνες που θέλουν κλειστά κουτιά περνούν isOpen={false}.
  isOpen?: boolean;
  children: ReactNode;
}

export function SettingsCard({
  title,
  hint,
  isOpen = true,
  children,
}: SettingsCardProps) {
  return (
    <details className="ml-box o-card" open={isOpen}>
      <summary>
        <h2 className="ml-box-title">{title}</h2>
        {hint && <small>{hint}</small>}
      </summary>
      <div className="o-card-body">{children}</div>
    </details>
  );
}

interface TextFieldProps {
  id: string;
  name: string;
  label: string;
  value?: string;
  isPending?: boolean;
  hint?: string;
  type?: string;
  inputMode?: "numeric" | "decimal" | "email" | "tel";
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  form?: string;
}

// Πεδίο κάρτας. Το «εκκρεμεί» το βγάζει ο καλών από τα πραγματικά δεδομένα (κενό πεδίο χωρίς προεπιλογή).
export function TextField({
  id,
  label,
  value,
  isPending,
  hint,
  ...input
}: TextFieldProps) {
  return (
    <span className="ml-field o-field">
      <label htmlFor={id}>
        {label} {isPending && <Pending />}
      </label>
      <input
        id={id}
        className="input"
        defaultValue={value}
        placeholder={isPending ? "εκκρεμεί" : undefined}
        {...input}
      />
      {hint && <small>{hint}</small>}
    </span>
  );
}

const STATUS_TONE: Readonly<Record<string, BadgeTone>> = {
  Νέα: "waiting",
  "Σε χρήση": "ok",
  Αποσύρθηκε: "faded",
};

export type ListItemStatus = "Νέα" | "Σε χρήση" | "Αποσύρθηκε";

export interface SettingsListItem {
  id: string;
  label: string;
  labelEn?: string;
  status: ListItemStatus;
  uses: number;
  // Οι πραγματικές ενέργειες της γραμμής (Διαγραφή για «Νέα», Απόσυρση για «Σε χρήση»), από τον καλούντα.
  actions?: ReactNode;
}

interface ListEditorProps {
  title: string;
  items: readonly SettingsListItem[];
  isBilingual?: boolean;
  // Αν φαίνονται οι αποσυρμένες, και ο σύνδεσμος που τις δείχνει/κρύβει (ζει στη διεύθυνση της σελίδας).
  showRetired: boolean;
  toggleRetiredHref: string;
  // Η φόρμα «+ Νέα τιμή» (πραγματικό action) και ένα μήνυμα μετά από ενέργεια.
  addSlot?: ReactNode;
  notice?: ReactNode;
}

// Λίστα Ρύθμισης: σειρά, ετικέτα (και αγγλικά όπου τη βλέπει πελάτης), Νέα → διαγραφή, Σε χρήση → απόσυρση.
export function ListEditor({
  title,
  items,
  isBilingual,
  showRetired,
  toggleRetiredHref,
  addSlot,
  notice,
}: ListEditorProps) {
  const visible = items.filter(
    (item) => showRetired || item.status !== "Αποσύρθηκε",
  );
  const retiredCount = items.length - visible.length;
  return (
    <div className="o-card">
      <Panel
        label={title}
        aside={
          <>
            <Badge>
              {isBilingual ? "ελληνικά και αγγλικά" : "μόνο ελληνικά"}
            </Badge>
          </>
        }
      >
        {notice && (
          <div className="note" role="status">
            {notice}
          </div>
        )}
        <RowList>
          {visible.map((item, index) => (
            <ListRow
              key={item.id}
              isFaded={item.status === "Αποσύρθηκε"}
              lead={
                <span>
                  {index + 1}{" "}
                  <span className="muted" aria-hidden="true">
                    ↑↓
                  </span>
                </span>
              }
              title={item.label}
              sub={
                isBilingual
                  ? (item.labelEn ?? <Badge tone="attention">λείπει</Badge>)
                  : undefined
              }
              aside={
                <>
                  <span className="part-sub">
                    {item.status !== "Νέα" && `${item.uses} χρήσεις`}
                  </span>
                  <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  {item.actions}
                  {item.status === "Αποσύρθηκε" && (
                    <span className="muted">ξαναμπαίνει με το χέρι</span>
                  )}
                </>
              }
            />
          ))}
        </RowList>
        <div className="btn-row o-list-actions">
          {addSlot}
          {(retiredCount > 0 || showRetired) && (
            <Link className="button" href={toggleRetiredHref}>
              {showRetired
                ? "Κρύψε αποσυρμένες"
                : `Δείξε αποσυρμένες (${retiredCount})`}
            </Link>
          )}
        </div>
        {isBilingual && (
          <p className="muted o-hint">
            Τη βλέπει πελάτης ή Επισκέπτης, οπότε η αποθήκευση θέλει και τις δύο
            γλώσσες.
          </p>
        )}
      </Panel>
    </div>
  );
}

interface RecentChangesProps {
  changes: readonly O1Change[];
  // Ο σύνδεσμος στο Ίχνος, μόνο για όποιον «Βλέπει ίχνος ενεργειών».
  auditHref: string | null;
  areaLabel: string;
}

// Οι 3 τελευταίες αλλαγές της ενότητας, από το Ίχνος. Χωρίς «Βλέπει ίχνος ενεργειών» η βάση δεν δίνει τίποτα.
export function RecentChanges({
  changes,
  auditHref,
  areaLabel,
}: RecentChangesProps) {
  return (
    <details className="ml-box o-recent">
      <summary>
        <h2 className="ml-box-title">Τελευταίες αλλαγές</h2>
        <small>
          {changes.length === 0
            ? "καμία ακόμα"
            : `${changes.length} πιο πρόσφατες · ${changes[0]?.at ?? ""}`}
        </small>
      </summary>
      <div className="o-card-body">
        {changes.length === 0 ? (
          <p className="ml-empty">Καμία αλλαγή ακόμα σε αυτή την ενότητα.</p>
        ) : (
          <ul className="ml-list">
            {changes.map((entry) => (
              <li key={entry.id} className="ml-line o-line">
                <span className="ml-main">
                  <strong>{`${entry.actor} · ${entry.subject}`}</strong>
                  <small>
                    {[entry.at, entry.fields].filter(Boolean).join(" · ")}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}
        {auditHref && (
          <div className="ml-quick o-left">
            <Link href={auditHref}>
              Όλες οι αλλαγές στο Ίχνος ({areaLabel})
            </Link>
          </div>
        )}
      </div>
    </details>
  );
}
