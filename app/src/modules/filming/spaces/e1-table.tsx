import Link from "next/link";

import { explainStatus } from "@/spaces/data/glossary";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";
import { StatusHelp } from "@/spaces/screens/status-help";

import { NO_CLIENT_LABEL } from "../labels";
import {
  clientSignalsOf,
  clientStatusLook,
  daysLateLabel,
  signalsOf,
  statusLook,
  type E1Filming,
  type StatusLook,
} from "./e1-groups";
import { weekdayOf } from "./e1-format";

import "../../finance/spaces/money-lines.css";
import "./e1.css";

// Η λίστα Γυρισμάτων της νέας εμφάνισης (prototype `screens/e1-table.tsx`). Ο πελάτης βλέπει την Παραγωγή ως τίτλο,
// χωρίς Συνεργείο, με τα σήματα της σημερινής σελίδας· η λίστα της βάσης δεν φέρνει τόπο ούτε σημείωση πελάτη, άρα χωρίς δεύτερη γραμμή.

const TONE_OF: Readonly<Record<StatusLook["tone"], BadgeTone | undefined>> = {
  problem: "attention",
  pending: "waiting",
  action: "strong",
  neutral: undefined,
  ok: "ok",
  muted: "faded",
};

// Συνεργείο: πόσοι επιβεβαίωσαν. Η λίστα της βάσης δίνει πλήθος, όχι ονόματα· null = ο Χρήστης δεν βλέπει Συνεργείο.
function Crew({ filming }: { filming: E1Filming }) {
  if (filming.state === "pending")
    return <span className="e1-sub">ορίζεται μετά την έγκριση</span>;
  if (filming.crew === null) return null;
  if (filming.crew.total === 0)
    return (
      <span className="e1-sub">
        {filming.state === "scheduled" ? "χωρίς Συνεργείο" : "—"}
      </span>
    );
  return (
    <span className="e1-crew">
      {filming.state === "scheduled" && (
        <span className="e1-sub">
          {filming.crew.confirmed}/{filming.crew.total} επιβεβαίωσαν
        </span>
      )}
    </span>
  );
}

// Σήμα με δικό του τόνο και εικονίδιο ανά σημασία, ώστε να μη στηρίζεται μόνο στο χρώμα.
// Με «τι σημαίνει;» όταν ο όρος υπάρχει στο Γλωσσάρι.
export function StatusPill({ look }: { look: StatusLook }) {
  const pill = (
    <span className="badge e1-pill" data-look={look.tone} title={look.label}>
      <span aria-hidden="true">{look.icon}</span> {look.label}
    </span>
  );
  const entries = explainStatus(look.label);
  if (entries.length === 0) return pill;
  return (
    <span className="badge-with-help">
      {pill}
      <StatusHelp label={look.label} entries={entries} />
    </span>
  );
}

// Σήματα με λόγια και δρόμος για να λυθούν.
function Signals({ filming, nowMs }: { filming: E1Filming; nowMs: number }) {
  const signals = signalsOf(filming, nowMs);
  if (signals.length === 0) return <span className="e1-signals">—</span>;
  return (
    <span className="e1-signals">
      {signals.map((signal) => (
        <StatusPill
          key={signal.label}
          look={{ tone: "problem", icon: "!", label: signal.label }}
        />
      ))}
      <Link
        href={hrefOf("E3", { id: filming.id })}
        aria-label={`Λύσε το: ${signals.map((s) => s.label).join(", ")}`}
      >
        Λύσε το ›
      </Link>
    </span>
  );
}

// Τα σήματα του πελάτη (σημερινή σελίδα), χωρίς «Λύσε το»: δεν είναι δική του δουλειά να τα λύσει.
function ClientSignals({ filming }: { filming: E1Filming }) {
  const signals = clientSignalsOf(filming);
  if (signals.length === 0) return null;
  return (
    <span className="e1-signals">
      {signals.map((signal) => (
        <Badge
          key={signal.key}
          tone={signal.isAttention ? "attention" : "strong"}
        >
          {signal.label}
        </Badge>
      ))}
    </span>
  );
}

function FilmingLead({ filming }: { filming: E1Filming }) {
  const [, , day] = filming.date.split("-");
  return (
    <span className="ml-thumb e1-date" aria-hidden="true">
      <small>{weekdayOf(filming.date)}</small>
      <strong>{day}</strong>
    </span>
  );
}

const whenOf = (filming: E1Filming): string =>
  filming.end ? `${filming.start}–${filming.end}` : filming.start;

interface E1TableProps {
  filmings: readonly E1Filming[];
  nowMs: number;
  // Η ημέρα της Αθήνας «ΕΕΕΕ-ΜΜ-ΗΗ», για το «πριν από Ν ημέρες».
  today: string;
  nextId?: string;
  isLate?: boolean;
  isClient?: boolean;
  label: string;
}

// Κάθε Γύρισμα μία γραμμή ml-line: μέρα, Πελάτης (σύνδεσμος στην καρτέλα), ώρα και Παραγωγή, σήματα δεξιά.
export function E1Table({
  filmings,
  nowMs,
  today,
  nextId,
  isLate = false,
  isClient = false,
  label,
}: E1TableProps) {
  return (
    <ul className="ml-list e1-list" aria-label={label}>
      {filmings.map((filming) => {
        const look = isClient
          ? clientStatusLook(filming)
          : statusLook(filming, nowMs);
        const title = isClient
          ? filming.productionTitle
          : (filming.clientName ?? NO_CLIENT_LABEL);
        return (
          <li
            key={filming.id}
            className="ml-line e1-line"
            data-next={filming.id === nextId || undefined}
            data-faded={look.tone === "muted" || undefined}
          >
            <FilmingLead filming={filming} />
            <span className="ml-main">
              <strong>
                <Link href={hrefOf("E3", { id: filming.id })}>{title}</Link>
              </strong>
              <small>
                {whenOf(filming)}
                {isClient ? "" : ` · ${filming.productionTitle}`}
                {isLate ? ` · ${daysLateLabel(filming, today)}` : ""}
              </small>
            </span>
            <span className="e1-signals">
              {filming.id === nextId && <Badge tone="strong">Επόμενο</Badge>}
              <Badge tone={TONE_OF[look.tone]}>{look.label}</Badge>
              {isClient ? (
                <ClientSignals filming={filming} />
              ) : (
                <>
                  <Crew filming={filming} />
                  <Signals filming={filming} nowMs={nowMs} />
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
