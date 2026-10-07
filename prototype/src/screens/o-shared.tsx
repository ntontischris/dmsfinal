import Link from "next/link";
import type { ReactNode } from "react";

import { AREA_LABELS, auditOfArea, type AuditArea } from "@/data/audit";
import type { RoleId } from "@/data/roles";
import { settingsCapsOf } from "@/data/settings-access";
import { fmtDateTime } from "@/screens/n5-integrations";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
  type ScreenQuery,
  type ScreenState,
} from "@/screens/shared";

import "./o.css";

// Κοινά της σελίδας Ρυθμίσεων (O1–O6): καρτέλες, κλειδωμένο πεδίο, «μόνο προς τα εμπρός», λίστες, τελευταίες αλλαγές.

export const SETTINGS_TABS: readonly {
  code: string;
  label: string;
  area: AuditArea;
}[] = [
  { code: "O1", label: "Εταιρεία", area: "settings-company" },
  { code: "O2", label: "Πωλήσεις", area: "settings-sales" },
  { code: "O3", label: "Συμφωνίες", area: "settings-agreements" },
  { code: "O4", label: "Γυρίσματα", area: "settings-filming" },
  { code: "O5", label: "Παραδοτέα", area: "settings-deliverables" },
  { code: "O6", label: "Οικονομικά", area: "settings-finance" },
];

export function SettingsTabs({ role, code }: { role: RoleId; code: string }) {
  return (
    <nav className="tabs" aria-label="Ενότητες Ρυθμίσεων">
      {SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.code}
          className="tab"
          href={screenHref(role, tab.code, {})}
          aria-current={tab.code === code ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
      <Link className="tab" href={screenHref(role, "O7", {})}>
        Έλεγχος ετοιμότητας
      </Link>
    </nav>
  );
}

interface SettingsFrameProps extends ScreenProps {
  code: string;
  what: string;
  children: (state: ScreenState) => ReactNode;
}

// Πλαίσιο κάθε καρτέλας: εναλλαγή κατάστασης, καρτέλες, σφάλμα, περιεχόμενο, τελευταίες αλλαγές.
export function SettingsFrame({
  role,
  query,
  code,
  what,
  children,
}: SettingsFrameProps) {
  const state = parseState(query.state);
  const keep = { ...query, state: undefined };
  const tab = SETTINGS_TABS.find((t) => t.code === code);
  return (
    <>
      <StateSwitcher role={role} code={code} state={state} keep={keep} />
      <SettingsTabs role={role} code={code} />
      {state === "error" ? (
        <ErrorNotice what={what} />
      ) : (
        <>
          {state === "empty" && (
            <p className="note o-first" role="status">
              Πρώτο στήσιμο: οι προτεινόμενες τιμές είναι ήδη συμπληρωμένες.
              Ό,τι δεν έχει προεπιλογή γράφει «εκκρεμεί» και φαίνεται στον{" "}
              <Link href={screenHref(role, "O7", {})}>
                Έλεγχο ετοιμότητας (O7)
              </Link>
              .
            </p>
          )}
          {children(state)}
          {tab && state === "normal" && (
            <RecentChanges role={role} area={tab.area} />
          )}
        </>
      )}
    </>
  );
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

export function ForwardNote({
  affected,
  what,
}: {
  affected: number;
  what: string;
}) {
  return (
    <p className="note" role="status">
      Πριν την αποθήκευση: επηρεάζονται {affected} {what}, που{" "}
      <strong>δεν αλλάζουν</strong>. Η νέα τιμή ισχύει μόνο για ό,τι
      δημιουργείται από εδώ και πέρα. Η αλλαγή γράφεται στο Ίχνος.
    </p>
  );
}

interface SaveRowProps {
  role: RoleId;
  query: ScreenQuery;
  code: string;
  card: string;
  forward?: { affected: number; what: string };
}

// Αποθήκευση κάρτας: με ?save=<card> φαίνεται η επιβεβαίωση «μόνο προς τα εμπρός» (αν αφορά υπάρχοντα).
export function SaveRow({ role, query, code, card, forward }: SaveRowProps) {
  const isSaving = query.save === card;
  return (
    <>
      {isSaving && forward && <ForwardNote {...forward} />}
      {isSaving && !forward && (
        <p className="note" role="status">
          Αποθηκεύτηκε. Η αλλαγή γράφτηκε στο Ίχνος.
        </p>
      )}
      <div className="btn-row">
        <Link
          className="button"
          data-primary="true"
          href={screenHref(role, code, {
            state: query.state,
            save: isSaving ? undefined : card,
          })}
        >
          {isSaving && forward ? "Επιβεβαίωση αποθήκευσης" : "Αποθήκευση"}
        </Link>
        {isSaving && (
          <Link
            className="button"
            href={screenHref(role, code, { state: query.state })}
          >
            Άκυρο
          </Link>
        )}
      </div>
    </>
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
    <section className="card o-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function TextField({
  id,
  label,
  value,
  pending,
  hint,
}: {
  id: string;
  label: string;
  value?: string;
  pending?: boolean;
  hint?: string;
}) {
  return (
    <span className="stack o-field">
      <label htmlFor={id}>
        {label} {pending && <Pending />}
      </label>
      <input
        id={id}
        className="input"
        defaultValue={pending ? "" : value}
        placeholder={pending ? "εκκρεμεί" : undefined}
      />
      {hint && <span className="muted o-hint">{hint}</span>}
    </span>
  );
}

export type ListItemStatus = "Νέα" | "Σε χρήση" | "Αποσύρθηκε";

export interface SettingsListItem {
  id: string;
  label: string;
  labelEn?: string;
  status: ListItemStatus;
  uses: number;
}

interface ListEditorProps {
  role: RoleId;
  query: ScreenQuery;
  code: string;
  listId: string;
  title: string;
  items: readonly SettingsListItem[];
  isBilingual?: boolean;
  retireNote?: (item: SettingsListItem) => ReactNode;
}

// Λίστα Ρύθμισης: σειρά, ετικέτα (και αγγλικά όπου τη βλέπει πελάτης), Νέα → διαγραφή, Σε χρήση → απόσυρση.
export function ListEditor({
  role,
  query,
  code,
  listId,
  title,
  items,
  isBilingual,
  retireNote,
}: ListEditorProps) {
  const showRetired = query.retired === listId;
  const visible = items.filter(
    (item) => showRetired || item.status !== "Αποσύρθηκε",
  );
  const retiredCount = items.length - visible.length;
  const [actId, actKind] = (query.act ?? "").split(":");
  const acted = items.find((item) => `${listId}-${item.id}` === actId);
  const href = (params: Record<string, string | undefined>) =>
    screenHref(role, code, {
      state: query.state,
      retired: query.retired,
      ...params,
    });
  return (
    <section className="card o-card">
      <div className="card-title">
        <h2>{title}</h2>
        <Badge>{isBilingual ? "ελληνικά και αγγλικά" : "μόνο ελληνικά"}</Badge>
      </div>
      {acted && actKind === "retire" && (
        <div className="note" role="status">
          {retireNote?.(acted) ?? (
            <>
              «{acted.label}» αποσύρθηκε: φεύγει από τις νέες επιλογές, μένει
              στα {acted.uses} παλιά στοιχεία και μετριέται στις Αναφορές.
            </>
          )}
        </div>
      )}
      {acted && actKind === "delete" && (
        <p className="note" role="status">
          «{acted.label}» διαγράφηκε: δεν είχε χρησιμοποιηθεί ποτέ.
        </p>
      )}
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Σειρά</th>
              <th>Ετικέτα</th>
              {isBilingual && <th>Αγγλικά</th>}
              <th>Κατάσταση</th>
              <th>Ενέργεια</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item, index) => (
              <tr
                key={item.id}
                className={
                  item.status === "Αποσύρθηκε" ? "archived" : undefined
                }
              >
                <td data-label="Σειρά">
                  {index + 1}{" "}
                  <span className="muted" aria-hidden="true">
                    ↑↓
                  </span>
                </td>
                <td data-label="Ετικέτα">{item.label}</td>
                {isBilingual && (
                  <td data-label="Αγγλικά">
                    {item.labelEn ?? <Badge tone="attention">λείπει</Badge>}
                  </td>
                )}
                <td data-label="Κατάσταση">
                  {item.status}
                  {item.status !== "Νέα" && (
                    <span className="muted"> · {item.uses} χρήσεις</span>
                  )}
                </td>
                <td data-label="Ενέργεια">
                  {item.status === "Νέα" && (
                    <Link href={href({ act: `${listId}-${item.id}:delete` })}>
                      Διαγραφή
                    </Link>
                  )}
                  {item.status === "Σε χρήση" && (
                    <Link href={href({ act: `${listId}-${item.id}:retire` })}>
                      Απόσυρση
                    </Link>
                  )}
                  {item.status === "Αποσύρθηκε" && (
                    <span className="muted">ξαναμπαίνει με το χέρι</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row o-list-actions">
        <button type="button" className="button">
          + Νέα τιμή
        </button>
        {(retiredCount > 0 || showRetired) && (
          <Link
            className="button"
            href={href({ retired: showRetired ? undefined : listId })}
          >
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
    </section>
  );
}

export function RecentChanges({
  role,
  area,
}: {
  role: RoleId;
  area: AuditArea;
}) {
  const caps = settingsCapsOf(role);
  const entries = auditOfArea(area).slice(0, 3);
  return (
    <section className="o-recent">
      <h2>Τελευταίες αλλαγές</h2>
      {entries.length === 0 ? (
        <p className="muted">Καμία αλλαγή ακόμα σε αυτή την ενότητα.</p>
      ) : (
        <ul className="list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="muted">{fmtDateTime(entry.at)}</span> ·{" "}
              {entry.actor} · {entry.subject}:{" "}
              {entry.sensitivity === "cost" && !caps.canManageCost ? (
                <span className="muted">— κρυφό κόστος —</span>
              ) : (
                <>
                  {entry.before ?? "—"} → {entry.after ?? "—"}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {caps.seesAudit && (
        <Link href={screenHref(role, "P1", { area })}>
          Όλες οι αλλαγές στο Ίχνος ({AREA_LABELS[area]})
        </Link>
      )}
    </section>
  );
}

export function NoCostPermission() {
  return (
    <StateNotice kind="denied" title="Θέλει το Δικαίωμα «Διαχειρίζεται κόστος»">
      Τα έξοδα περιέχουν μισθούς, οπότε τα βλέπει και τα αλλάζει μόνο όποιος
      έχει αυτό το Δικαίωμα (αρχικά μόνο ο Ιδιοκτήτης).
    </StateNotice>
  );
}
