import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { athensDate, athensTime } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { periodLabel } from "../helpers";
import type { ProductionDetail, ProductionFilming } from "../types";
import { G2Box } from "./g2-box";
import {
  deliverableLineOf,
  filmingWord,
  provisionRowsOf,
  provisionSub,
} from "./g2-model";
import { DeliverablesPanel } from "./g2-new-deliverable";

// Τα κουτιά περιεχομένου της Σελίδας Παραγωγής, όψη ομάδας (και τα Γυρίσματα στην όψη πελάτη).

const percentOf = (part: number, total: number): string =>
  `${total === 0 ? 0 : Math.round((part / total) * 100)}%`;

// Μία Παροχή ως μετρητής (.ml-meter): πόσα χρησιμοποιήθηκαν από το σύνολο.
export function ProvisionMeter(props: {
  label: string;
  used: number;
  total: number;
}) {
  return (
    <span
      className="ml-meter"
      role="meter"
      aria-label={`${props.label}: ${props.used} από ${props.total}`}
      aria-valuenow={props.used}
      aria-valuemin={0}
      aria-valuemax={props.total}
      style={{ "--v": percentOf(props.used, props.total) } as CSSProperties}
    >
      <span>{props.label}</span>
      <i>
        <b />
      </i>
      <strong>
        {props.used}/{props.total}
      </strong>
    </span>
  );
}

// Οι Παροχές της Περιόδου. Η εφάπαξ δεν έχει Περίοδο και η βάση δεν δίνει εδώ τις Παροχές της Συμφωνίας: το κουτί λείπει.
export function G2Provisions({ production }: { production: ProductionDetail }) {
  if (production.isInternal || !production.period) return null;
  const rows = provisionRowsOf(production.balances);
  return (
    <G2Box
      title="Παροχές της Περιόδου"
      hint={periodLabel(production.period.starts)}
    >
      {rows.length === 0 && <p className="ml-empty">Δεν υπάρχουν Παροχές.</p>}
      <ul className="g2-provisions">
        {rows.map((row) => (
          <li key={row.kindId}>
            <ProvisionMeter
              label={row.label}
              used={row.used}
              total={row.total}
            />
            <small className="g2-sub">{provisionSub(row)}</small>
          </li>
        ))}
      </ul>
    </G2Box>
  );
}

const weekdayOf = (iso: string): string =>
  new Date(`${iso}T00:00:00`)
    .toLocaleDateString("el-GR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();

const dayOf = (iso: string): string => String(Number(iso.slice(8, 10)));

// Λήξη = έναρξη + διάρκεια (ώρες, μπορεί με μισή ώρα).
const endOf = (filming: ProductionFilming): string =>
  athensTime(
    new Date(
      Date.parse(filming.startsAt) + filming.hours * 3_600_000,
    ).toISOString(),
  );

function FilmingLine({
  filming,
  isClient,
}: {
  filming: ProductionFilming;
  isClient: boolean;
}) {
  const day = athensDate(filming.startsAt);
  const word = filmingWord(filming);
  const sub = [filming.kind, filming.isExtra && "έξτρα"]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="ml-line">
      <span className="ml-thumb g2-date" aria-hidden="true">
        <small>{weekdayOf(day)}</small>
        {dayOf(day)}
      </span>
      <span className="ml-main">
        <strong>
          <Link href={hrefOf("E3", { id: filming.id })}>
            {`${fmtDate(day)} · ${athensTime(filming.startsAt)}–${endOf(filming)}`}
          </Link>
        </strong>
        {!isClient && sub && <small>{sub}</small>}
      </span>
      <span className="ml-quick">
        <Badge tone={word === "έγινε" ? "strong" : undefined}>{word}</Badge>
      </span>
    </li>
  );
}

// Τα Γυρίσματα της Παραγωγής, όσα βλέπει ο Χρήστης. Το Συνεργείο κάθε Γυρίσματος δεν έρχεται εδώ.
// Ο πελάτης βλέπει μόνο πότε και την κατάσταση (όπως η παλιά G2 πελάτη).
export function G2Filmings({
  filmings,
  isClient = false,
}: {
  filmings: readonly ProductionFilming[];
  isClient?: boolean;
}) {
  return (
    <G2Box title="Γυρίσματα" hint={`${filmings.length} Γυρίσματα`}>
      {filmings.length === 0 && (
        <p className="ml-empty">Η Παραγωγή δεν έχει ακόμα Γυρίσματα.</p>
      )}
      <ul className="ml-list">
        {filmings.map((filming) => (
          <FilmingLine key={filming.id} filming={filming} isClient={isClient} />
        ))}
      </ul>
    </G2Box>
  );
}

// Τα Παραδοτέα της Παραγωγής. Το «Νέο Παραδοτέο» είναι η φόρμα του module Παραδοτέα, μόνο για όσους «Δουλεύουν Παραδοτέα».
export function G2Deliverables({
  production,
  newForm,
}: {
  production: ProductionDetail;
  newForm: ReactNode | null;
}) {
  const lines = production.deliverables.map((card) =>
    deliverableLineOf(card, production.isInternal),
  );
  return (
    <DeliverablesPanel newForm={newForm} hint={`${lines.length} Παραδοτέα`}>
      {newForm && (
        <p className="muted">
          Η δημιουργία δεσμεύει Παροχή· στήνεται στο module Παραδοτέα.
        </p>
      )}
      {production.isInternal && (
        <p className="note">
          Εσωτερική: χωρίς Παροχή και χωρίς πελάτη· την έγκριση τη δίνει όποιος
          «Ελέγχει Παραδοτέα» (στον έναν άνθρωπο, ο Ιδιοκτήτης). Χωρίς όριο
          αλλαγών.
        </p>
      )}
      {lines.length === 0 && (
        <p className="ml-empty">Η Παραγωγή δεν έχει ακόμα Παραδοτέα.</p>
      )}
      <ul className="ml-list">
        {lines.map((line) => (
          <li
            key={line.id}
            className="ml-line"
            data-faded={line.isFaded ? "" : undefined}
          >
            <span className="ml-thumb">{line.lead}</span>
            <span className="ml-main">
              <strong>
                <Link href={hrefOf("H2", { id: line.id })}>{line.title}</Link>
              </strong>
              {line.sub && <small>{line.sub}</small>}
            </span>
            <span className="ml-quick">
              {line.badges.map((badge) => (
                <Badge key={badge.text} tone={badge.tone}>
                  {badge.text}
                </Badge>
              ))}
              <Badge tone={line.tone}>{line.state}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </DeliverablesPanel>
  );
}
