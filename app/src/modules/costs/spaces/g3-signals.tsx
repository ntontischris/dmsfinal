import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtMoney, fmtPercent } from "@/spaces/screens/shared";

import type { Figures } from "./g3-model";

// Prototype `screens/g3-signals.tsx`: κατάσταση ωρών και σήμα «Υπέρβαση κόστους». Το Ίχνος κόστους λείπει
// (δεν υπάρχει ανάγνωση του Ίχνους ανά Παραγωγή), όπως και ο σύνδεσμος προς την Κερδοφορία (I7 δεν υπάρχει ακόμα).

interface StatusProps {
  figures: Figures;
  isDelivered: boolean;
  isInternal: boolean;
}

export function G3Status({ figures, isDelivered, isInternal }: StatusProps) {
  if (figures.missing.length === 0)
    return (
      <p>
        <Badge tone="strong">με πραγματικές ώρες</Badge>
      </p>
    );
  return (
    <div role="status">
      <Panel
        label="Χωρίς πραγματικές ώρες"
        aside={<Badge tone="attention">{figures.missing.join(" · ")}</Badge>}
      >
        <p className="muted">
          Δεν μετράει ως μηδενικό κόστος στα σύνολα: μένει «—» μέχρι να γραφτούν
          πλήρεις ώρες.
        </p>
        {isDelivered && !isInternal && (
          <p className="note">
            Η Παραγωγή παραδόθηκε χωρίς πραγματικές ώρες: γεννιέται το Γεγονός
            «Παραγωγή παραδομένη χωρίς πραγματικές ώρες» και ειδοποιούνται μόνο
            όσοι βλέπουν κόστος.
          </p>
        )}
      </Panel>
    </div>
  );
}

interface SignalProps {
  figures: Figures;
  overrunPercent: number;
  multiplierMin: number;
}

const yesNo = (value: boolean): string => (value ? "ναι" : "όχι");

export function G3Signal({
  figures,
  overrunPercent,
  multiplierMin,
}: SignalProps) {
  const min = String(multiplierMin).replace(".", ",");
  return (
    <Panel
      label="Υπέρβαση κόστους"
      aside={
        figures.isOverrun ? (
          <Badge tone="attention">αναμμένο</Badge>
        ) : (
          <Badge>σβηστό</Badge>
        )
      }
    >
      {!figures.actual ? (
        <p className="muted">
          Χωρίς πλήρεις πραγματικές ώρες το σήμα δεν κρίνεται.
        </p>
      ) : (
        <RowList>
          <ListRow
            title={`α) Ώρες πάνω από την εκτίμηση κατά περισσότερο από ${String(overrunPercent).replace(".", ",")}%: ${yesNo(figures.hoursOver)} (${fmtPercent(figures.hoursPercent)})`}
            aside={
              <Badge tone={figures.hoursOver ? "attention" : undefined}>
                {yesNo(figures.hoursOver)}
              </Badge>
            }
          />
          {figures.price !== null && (
            <ListRow
              title={`β) Τιμή κάτω από κόστος × ${min}: ${yesNo(figures.belowMinimum)} (τιμή ${fmtMoney(figures.price)}, ελάχιστη τιμή ${figures.minimumPrice === null ? "—" : fmtMoney(figures.minimumPrice)})`}
              aside={
                <Badge tone={figures.belowMinimum ? "attention" : undefined}>
                  {yesNo(figures.belowMinimum)}
                </Badge>
              }
            />
          )}
        </RowList>
      )}
      <p className="note">
        Το σήμα ακολουθεί τα νούμερα: αν μια διόρθωση αναιρέσει τη συνθήκη,
        σβήνει μόνο του. Κάθε αλλαγή μένει στο Ίχνος. Ο Πελάτης δεν βλέπει
        τίποτα από αυτά.
      </p>
    </Panel>
  );
}
