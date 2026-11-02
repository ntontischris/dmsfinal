"use client";

import type { AgreementDetail } from "../types";
import { Field, NumberInput } from "./d2-ui";

// Κοινά των γραμμών των Όρων (prototype `screens/d2-term-row.tsx`) και οι όροι των Γυρισμάτων (`d2-terms-more.tsx`).

type Terms = AgreementDetail["terms"];
type Baseline = AgreementDetail["baseline"];

export const days = (n: number) => `${n} ${n === 1 ? "μέρα" : "μέρες"}`;
const hours = (n: number) => `${n} ${n === 1 ? "ώρα" : "ώρες"}`;

// «προεπιλογή: …» μόνο όταν η τιμή διαφέρει (η βάση δίνει προεπιλογές μόνο σε όποιον βλέπει τις Παρεκκλίσεις).
export const changedHint = <T,>(
  baseline: Baseline,
  pick: (b: NonNullable<Baseline>) => T,
  value: T,
  text: (v: T) => string,
): string | undefined =>
  baseline === null || pick(baseline) === value
    ? undefined
    : `προεπιλογή: ${text(pick(baseline))}`;

export interface RowsProps {
  terms: Terms;
  baseline: Baseline;
  isEditing: boolean;
  isMonthly: boolean;
}

export function FilmingRows({ terms, baseline, isEditing }: RowsProps) {
  const late = (v: boolean) =>
    v ? "Η αργή ακύρωση καίει Παροχή" : "Η αργή ακύρωση δεν καίει Παροχή";
  const noShow = (v: boolean) =>
    v ? "Το «δεν έγινε» καίει Παροχή" : "Το «δεν έγινε» δεν καίει Παροχή";
  return (
    <>
      <Field
        id="t-fnotice"
        label="Γυρίσματα: προειδοποίηση"
        isEditing={isEditing}
        value={`Κράτηση τουλάχιστον ${hours(terms.filmingNoticeHours)} πριν`}
        hint={changedHint(
          baseline,
          (b) => b.filmingNoticeHours,
          terms.filmingNoticeHours,
          hours,
        )}
        input={
          <NumberInput
            id="t-fnotice"
            name="filmingNoticeHours"
            defaultValue={String(terms.filmingNoticeHours)}
            suffix="ώρες"
          />
        }
      />
      <Field
        id="t-fcancel"
        label="Γυρίσματα: όριο ακύρωσης"
        isEditing={isEditing}
        value={`Ακύρωση έως ${hours(terms.filmingCancelHours)} πριν`}
        hint={changedHint(
          baseline,
          (b) => b.filmingCancelHours,
          terms.filmingCancelHours,
          hours,
        )}
        input={
          <NumberInput
            id="t-fcancel"
            name="filmingCancelHours"
            defaultValue={String(terms.filmingCancelHours)}
            suffix="ώρες"
          />
        }
      />
      <Field
        id="t-flate"
        label="Γυρίσματα: αργή ακύρωση"
        isEditing={isEditing}
        value={late(terms.lateCancelBurns)}
        hint={changedHint(
          baseline,
          (b) => b.lateCancelBurns,
          terms.lateCancelBurns,
          late,
        )}
        input={
          <label>
            <input
              id="t-flate"
              type="checkbox"
              name="lateCancelBurns"
              defaultChecked={terms.lateCancelBurns}
            />{" "}
            η αργή ακύρωση καίει Παροχή
          </label>
        }
      />
      <Field
        id="t-fnoshow"
        label="Γυρίσματα: «δεν έγινε»"
        isEditing={isEditing}
        value={noShow(terms.noShowBurns)}
        hint={changedHint(
          baseline,
          (b) => b.noShowBurns,
          terms.noShowBurns,
          noShow,
        )}
        input={
          <label>
            <input
              id="t-fnoshow"
              type="checkbox"
              name="noShowBurns"
              defaultChecked={terms.noShowBurns}
            />{" "}
            το «δεν έγινε» καίει Παροχή
          </label>
        }
      />
    </>
  );
}
