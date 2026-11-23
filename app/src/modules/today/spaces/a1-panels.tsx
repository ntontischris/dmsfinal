import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";

import { formatCents } from "../helpers";
import type { CardContent } from "./a1-model";
import type { Programme } from "./a1-programme";

// Τα κομμάτια της Σήμερα της ομάδας (#241): το πρόγραμμα και τα χρήματα, μέσα στη γραμμή κορυφής.

const MONEY_SHOWN = 3;

export function ProgrammePanel({
  programme,
  href,
}: {
  programme: Programme;
  href: string;
}) {
  const dayWord = programme.day === "today" ? "σήμερα" : "αύριο";
  return (
    <div className="a1-brief-panel" data-part="programme">
      <Panel label="Το πρόγραμμα">
        <p className="a1-day">{programme.heading}</p>
        {programme.slots.length === 0 ? (
          <p className="muted a1-empty">
            Κανένα Γύρισμα {dayWord}.
            {programme.next && (
              <>
                {" "}
                Επόμενο:{" "}
                <Link href={programme.next.href}>
                  {programme.next.when}
                </Link>, {programme.next.label}.
              </>
            )}
          </p>
        ) : (
          <div className="a1-rows">
            <RowList>
              {programme.slots.map((slot) => (
                <ListRow
                  key={`${slot.href}${slot.time}`}
                  lead={<span className="a1-time">{slot.time}</span>}
                  title={slot.label}
                  href={slot.href}
                  sub={slot.note}
                />
              ))}
            </RowList>
          </div>
        )}
        <footer className="a1-card-foot">
          <Link href={href}>Όλη η εβδομάδα →</Link>
        </footer>
      </Panel>
    </div>
  );
}

// Όταν τα Χρήματα (today_money) δεν φόρτωσαν: οι γραμμές της κάρτας «Ληξιπρόθεσμα Τιμολόγια».
export function MoneyPanel({ content }: { content: CardContent }) {
  return (
    <div className="a1-brief-panel" data-part="money">
      <Panel label="Χρήματα" aside={content.count}>
        <p className="muted a1-summary">Ληξιπρόθεσμα Τιμολόγια</p>
        <div className="a1-rows">
          <RowList>
            {content.rows.slice(0, MONEY_SHOWN).map((row) => (
              <ListRow
                key={`${row.href}${row.label}`}
                title={row.label}
                href={row.href}
                sub={row.note}
                aside={
                  row.amountCents !== undefined ? (
                    <span className="a1-amount">
                      {formatCents(row.amountCents)}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </RowList>
        </div>
        <footer className="a1-card-foot">
          <Link href={content.allHref}>Όλα τα τιμολόγια →</Link>
        </footer>
      </Panel>
    </div>
  );
}
