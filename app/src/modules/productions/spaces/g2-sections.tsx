import type { ReactNode } from "react";

import { athensDate, athensTime } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { DateLead, ListRow, RowList, Segments } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { periodLabel } from "../helpers";
import type { ProductionDetail, ProductionFilming } from "../types";
import {
  deliverableLineOf,
  filmingWord,
  provisionRowsOf,
  provisionSub,
} from "./g2-model";
import { DeliverablesPanel } from "./g2-new-deliverable";

// Τα πάνελ περιεχομένου της Σελίδας Παραγωγής (prototype `screens/g2-sections.tsx`), όψη ομάδας.

// Οι Παροχές της Περιόδου. Η εφάπαξ δεν έχει Περίοδο και η βάση δεν δίνει εδώ τις Παροχές της Συμφωνίας: το πάνελ λείπει.
export function G2Provisions({ production }: { production: ProductionDetail }) {
  if (production.isInternal || !production.period) return null;
  const rows = provisionRowsOf(production.balances);
  return (
    <Panel
      label="Παροχές της Περιόδου"
      aside={periodLabel(production.period.starts)}
    >
      {rows.length === 0 && <p className="muted">Δεν υπάρχουν Παροχές.</p>}
      <ul className="g2-provisions">
        {rows.map((row) => (
          <li key={row.kindId}>
            <Segments label={row.label} used={row.used} total={row.total} />
            <span className="part-sub">{provisionSub(row)}</span>
          </li>
        ))}
      </ul>
    </Panel>
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

function FilmingLine({ filming }: { filming: ProductionFilming }) {
  const day = athensDate(filming.startsAt);
  const word = filmingWord(filming);
  return (
    <ListRow
      lead={<DateLead weekday={weekdayOf(day)} day={dayOf(day)} />}
      title={`${fmtDate(day)} · ${athensTime(filming.startsAt)}–${endOf(filming)}`}
      href={hrefOf("E3", { id: filming.id })}
      sub={[filming.kind, filming.isExtra && "έξτρα"]
        .filter(Boolean)
        .join(" · ")}
      aside={
        <Badge tone={word === "έγινε" ? "strong" : undefined}>{word}</Badge>
      }
    />
  );
}

// Τα Γυρίσματα της Παραγωγής, όσα βλέπει ο Χρήστης. Το Συνεργείο κάθε Γυρίσματος δεν έρχεται εδώ.
export function G2Filmings({
  filmings,
}: {
  filmings: readonly ProductionFilming[];
}) {
  return (
    <Panel label="Γυρίσματα" aside={filmings.length} isFlush>
      {filmings.length === 0 && (
        <p className="muted g2-pad">Η Παραγωγή δεν έχει ακόμα Γυρίσματα.</p>
      )}
      <RowList>
        {filmings.map((filming) => (
          <FilmingLine key={filming.id} filming={filming} />
        ))}
      </RowList>
    </Panel>
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
    <DeliverablesPanel newForm={newForm}>
      <div className="g2-pad">
        {newForm && (
          <p className="muted">
            Η δημιουργία δεσμεύει Παροχή· στήνεται στο module Παραδοτέα.
          </p>
        )}
        {production.isInternal && (
          <p className="note">
            Εσωτερική: χωρίς Παροχή και χωρίς πελάτη· την έγκριση τη δίνει
            όποιος «Ελέγχει Παραδοτέα» (στον έναν άνθρωπο, ο Ιδιοκτήτης). Χωρίς
            όριο αλλαγών.
          </p>
        )}
        {lines.length === 0 && (
          <p className="muted">Η Παραγωγή δεν έχει ακόμα Παραδοτέα.</p>
        )}
      </div>
      <RowList>
        {lines.map((line) => (
          <ListRow
            key={line.id}
            lead={<span className="part-sub">{line.lead}</span>}
            title={line.title}
            href={hrefOf("H2", { id: line.id })}
            sub={line.sub}
            isFaded={line.isFaded}
            aside={
              <>
                {line.badges.map((badge) => (
                  <Badge key={badge.text} tone={badge.tone}>
                    {badge.text}
                  </Badge>
                ))}
                <Badge tone={line.tone}>{line.state}</Badge>
              </>
            }
          />
        ))}
      </RowList>
    </DeliverablesPanel>
  );
}
