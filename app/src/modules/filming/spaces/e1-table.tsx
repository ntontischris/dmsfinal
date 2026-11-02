import Link from "next/link";

import { explainStatus } from "@/spaces/data/glossary";
import { hrefOf } from "@/spaces/data/screens";
import { DateLead, Due, ListRow, RowList, TimeLead } from "@/spaces/kit/parts";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";
import { StatusHelp } from "@/spaces/screens/status-help";

import { NO_CLIENT_LABEL } from "../labels";
import {
  daysLateLabel,
  signalsOf,
  statusLook,
  type E1Filming,
  type StatusLook,
} from "./e1-groups";
import { weekdayOf } from "./e1-format";

import "./e1.css";

// Η λίστα Γυρισμάτων της νέας εμφάνισης (prototype `screens/e1-table.tsx`), μόνο για την ομάδα.

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
    return <span className="part-sub">ορίζεται μετά την έγκριση</span>;
  if (filming.crew === null) return null;
  if (filming.crew.total === 0)
    return (
      <span className="part-sub">
        {filming.state === "scheduled" ? "χωρίς Συνεργείο" : "—"}
      </span>
    );
  return (
    <span className="e1-crew">
      {filming.state === "scheduled" && (
        <span className="part-sub">
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

function FilmingLead({
  filming,
  isLate,
  today,
}: {
  filming: E1Filming;
  isLate: boolean;
  today: string;
}) {
  const [, , day] = filming.date.split("-");
  return (
    <span className="e1-lead">
      <DateLead weekday={weekdayOf(filming.date)} day={day} />
      <span>
        <TimeLead start={filming.start} end={filming.end} />
        {isLate && <Due isLate>{daysLateLabel(filming, today)}</Due>}
      </span>
    </span>
  );
}

interface E1TableProps {
  filmings: readonly E1Filming[];
  nowMs: number;
  // Η ημέρα της Αθήνας «ΕΕΕΕ-ΜΜ-ΗΗ», για το «πριν από Ν ημέρες».
  today: string;
  nextId?: string;
  isLate?: boolean;
}

export function E1Table({
  filmings,
  nowMs,
  today,
  nextId,
  isLate = false,
}: E1TableProps) {
  return (
    <RowList>
      {filmings.map((filming) => {
        const look = statusLook(filming, nowMs);
        return (
          <ListRow
            key={filming.id}
            isHighlighted={filming.id === nextId}
            isFaded={look.tone === "muted"}
            lead={
              <FilmingLead filming={filming} isLate={isLate} today={today} />
            }
            href={hrefOf("E3", { id: filming.id })}
            title={filming.clientName ?? NO_CLIENT_LABEL}
            sub={filming.productionTitle}
            aside={
              <>
                {filming.id === nextId && <Badge tone="strong">Επόμενο</Badge>}
                <Badge tone={TONE_OF[look.tone]}>{look.label}</Badge>
                <Crew filming={filming} />
                <Signals filming={filming} nowMs={nowMs} />
              </>
            }
          />
        );
      })}
    </RowList>
  );
}
