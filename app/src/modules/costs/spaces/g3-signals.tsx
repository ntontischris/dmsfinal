import { Badge, fmtMoney, fmtPercent } from "@/spaces/screens/shared";

import { G3Box } from "./g3-box";
import type { Figures } from "./g3-model";

// Prototype `screens/g3-signals.tsx`: κατάσταση ωρών και σήμα «Υπέρβαση κόστους». Η κατάσταση φαίνεται μόνο όταν λείπουν
// ώρες (προειδοποίηση)· το σήμα ζει σε κλειστό κουτί που ανοίγει μόνο του όταν είναι αναμμένο. Το Ίχνος κόστους λείπει
// (δεν υπάρχει ανάγνωση του Ίχνους ανά Παραγωγή).

interface StatusProps {
  figures: Figures;
  isDelivered: boolean;
  isInternal: boolean;
}

export function G3Status({ figures, isDelivered, isInternal }: StatusProps) {
  if (figures.missing.length === 0) return null;
  return (
    <div className="g3-warn" role="status">
      <strong>Χωρίς πραγματικές ώρες</strong>
      <span className="ml-tag">{figures.missing.join(" · ")}</span>
      <small>
        Δεν μετράει ως μηδενικό κόστος στα σύνολα: μένει «—» μέχρι να γραφτούν
        πλήρεις ώρες.
      </small>
      {isDelivered && !isInternal && (
        <small>
          Η Παραγωγή παραδόθηκε χωρίς πραγματικές ώρες: γεννιέται το Γεγονός
          «Παραγωγή παραδομένη χωρίς πραγματικές ώρες» και ειδοποιούνται μόνο
          όσοι βλέπουν κόστος.
        </small>
      )}
    </div>
  );
}

interface SignalProps {
  figures: Figures;
  overrunPercent: number;
  multiplierMin: number;
}

const yesNo = (value: boolean): string => (value ? "ναι" : "όχι");
const decimal = (value: number): string => String(value).replace(".", ",");

function SignalLine(props: { label: string; isOn: boolean }) {
  return (
    <li className="ml-line" data-urgent={props.isOn || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {props.isOn ? "!" : "✓"}
      </span>
      <span className="ml-main">
        <strong>{props.label}</strong>
      </span>
      <span className="ml-amount">
        <Badge tone={props.isOn ? "attention" : undefined}>
          {yesNo(props.isOn)}
        </Badge>
      </span>
    </li>
  );
}

function SignalLines({ figures, overrunPercent, multiplierMin }: SignalProps) {
  if (!figures.actual)
    return (
      <p className="muted">
        Χωρίς πλήρεις πραγματικές ώρες το σήμα δεν κρίνεται.
      </p>
    );
  return (
    <ul className="ml-list">
      <SignalLine
        isOn={figures.hoursOver}
        label={`α) Ώρες πάνω από την εκτίμηση κατά περισσότερο από ${decimal(overrunPercent)}%: ${yesNo(figures.hoursOver)} (${fmtPercent(figures.hoursPercent)})`}
      />
      {figures.price !== null && (
        <SignalLine
          isOn={figures.belowMinimum}
          label={`β) Τιμή κάτω από κόστος × ${decimal(multiplierMin)}: ${yesNo(figures.belowMinimum)} (τιμή ${fmtMoney(figures.price)}, ελάχιστη τιμή ${figures.minimumPrice === null ? "—" : fmtMoney(figures.minimumPrice)})`}
        />
      )}
    </ul>
  );
}

export function G3Signal(props: SignalProps) {
  const isOn = props.figures.isOverrun;
  return (
    <G3Box
      title="Υπέρβαση κόστους"
      hint={isOn ? "αναμμένο: δες τι το άναψε" : "σβηστό"}
      isOpen={isOn}
    >
      <SignalLines {...props} />
      <p className="note">
        Το σήμα ακολουθεί τα νούμερα: αν μια διόρθωση αναιρέσει τη συνθήκη,
        σβήνει μόνο του. Κάθε αλλαγή μένει στο Ίχνος. Ο Πελάτης δεν βλέπει
        τίποτα από αυτά.
      </p>
    </G3Box>
  );
}
