import Link from "next/link";

import { formatCents } from "../helpers";
import { initialsOf } from "./a1-deck-model";
import { BriefBox, BriefFoot, BriefLine } from "./a1-lines";
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
    <BriefBox part="programme" label="Το πρόγραμμα">
      <p className="a1-day">{programme.heading}</p>
      {programme.slots.length === 0 ? (
        <p className="ml-empty">
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
        <ul className="ml-list">
          {programme.slots.map((slot) => (
            <BriefLine
              key={`${slot.href}${slot.time}`}
              thumb={slot.time}
              title={slot.label}
              label={slot.label}
              sub={slot.note}
              href={slot.href}
            />
          ))}
        </ul>
      )}
      <BriefFoot>
        <Link href={href}>Όλη η εβδομάδα →</Link>
      </BriefFoot>
    </BriefBox>
  );
}

// Όταν τα Χρήματα (today_money) δεν φόρτωσαν: οι γραμμές της κάρτας «Ληξιπρόθεσμα Τιμολόγια».
export function MoneyPanel({ content }: { content: CardContent }) {
  return (
    <BriefBox
      part="money"
      label="Χρήματα"
      aside={<span className="a1-box-count">{content.count}</span>}
    >
      <p className="a1-summary">Ληξιπρόθεσμα Τιμολόγια</p>
      <ul className="ml-list">
        {content.rows.slice(0, MONEY_SHOWN).map((row) => (
          <BriefLine
            key={`${row.href}${row.label}`}
            thumb={initialsOf(row.label) || "€"}
            title={row.label}
            label={row.label}
            sub={row.note}
            href={row.href}
            amount={
              row.amountCents !== undefined
                ? formatCents(row.amountCents)
                : undefined
            }
          />
        ))}
      </ul>
      <BriefFoot>
        <Link href={content.allHref}>Ποιος μας χρωστάει →</Link>
      </BriefFoot>
    </BriefBox>
  );
}
