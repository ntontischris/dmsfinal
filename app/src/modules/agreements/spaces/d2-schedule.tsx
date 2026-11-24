"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { updateBasics } from "../actions-draft";
import { formatDate, formatMoney, periodLabel } from "../helpers";
import type {
  AgreementDetail,
  Language,
  PeriodRow,
  PeriodState,
} from "../types";
import { D2Box } from "./d2-box";
import { endText } from "./d2-model";
import { D2Form, Field, IdField, NumberInput } from "./d2-ui";

import "../../finance/spaces/money-lines.css";

// «Έναρξη και διάρκεια» και «Περίοδοι» (prototype `screens/d2-schedule.tsx`, `d2-history.tsx`). Τίτλος, γλώσσα και Ισχύς
// αποθηκεύονται με το ίδιο action (`updateBasics`) με την Έναρξη και τη Διάρκεια, γι' αυτό είναι στην ίδια φόρμα.

const LANGUAGES: readonly { value: Language; label: string }[] = [
  { value: "el", label: "Ελληνικά" },
  { value: "en", label: "English" },
];

function StartInput({ agreement }: { agreement: AgreementDetail }) {
  const [isOnSignature, setIsOnSignature] = useState(
    agreement.startOn === null,
  );
  return (
    <span className="stack">
      <label>
        <input
          type="checkbox"
          name="startOnSignature"
          checked={isOnSignature}
          onChange={(e) => setIsOnSignature(e.target.checked)}
        />{" "}
        με την υπογραφή
      </label>
      {!isOnSignature && (
        <input
          id="d2-start"
          className="input"
          type="date"
          name="startOn"
          defaultValue={agreement.startOn ?? ""}
        />
      )}
    </span>
  );
}

function ScheduleRows({ agreement }: { agreement: AgreementDetail }) {
  const isEditing = agreement.can.edit;
  const isMonthly = agreement.kind === "monthly";
  const languageLabel =
    LANGUAGES.find((l) => l.value === agreement.language)?.label ??
    agreement.language;
  return (
    <dl className="ml-kv">
      <Field
        id="d2-title"
        label="Τίτλος"
        isEditing={isEditing}
        value={agreement.title || "Χωρίς τίτλο"}
        input={
          <input
            id="d2-title"
            className="input d2-wide"
            name="title"
            defaultValue={agreement.title}
          />
        }
      />
      <Field
        id="d2-language"
        label="Γλώσσα πρότασης"
        isEditing={isEditing}
        value={languageLabel}
        input={
          <select
            id="d2-language"
            className="select"
            name="language"
            defaultValue={agreement.language}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        }
      />
      {agreement.state === "proposal" && (
        <Field
          id="d2-valid"
          label="Ισχύς πρότασης"
          isEditing={isEditing}
          value={`έως ${formatDate(agreement.validUntil)}`}
          input={
            <input
              id="d2-valid"
              className="input"
              type="date"
              name="validUntil"
              defaultValue={agreement.validUntil}
            />
          }
        />
      )}
      <Field
        id="d2-start"
        label="Έναρξη"
        isEditing={isEditing}
        value={
          agreement.startOn ? formatDate(agreement.startOn) : "με την υπογραφή"
        }
        input={<StartInput agreement={agreement} />}
      />
      {isMonthly && (
        <Field
          id="d2-duration"
          label="Διάρκεια"
          isEditing={isEditing}
          value={
            agreement.durationMonths === null
              ? "—"
              : `${agreement.durationMonths} μήνες`
          }
          input={
            <NumberInput
              id="d2-duration"
              name="durationMonths"
              defaultValue={
                agreement.durationMonths === null
                  ? ""
                  : String(agreement.durationMonths)
              }
              suffix="μήνες"
            />
          }
        />
      )}
      <dt>{isMonthly ? "Λήξη" : "Τέλος"}</dt>
      <dd>
        {endText(agreement)}
        {isEditing && isMonthly && (
          <div className="muted">Λήξη = Έναρξη + Διάρκεια − 1 μέρα.</div>
        )}
      </dd>
    </dl>
  );
}

export function ScheduleSection({ agreement }: { agreement: AgreementDetail }) {
  return (
    <D2Box
      title="Έναρξη και διάρκεια"
      hint={`${agreement.startOn === null ? "έναρξη με την υπογραφή" : formatDate(agreement.startOn)} → ${endText(agreement)}`}
    >
      {agreement.can.edit ? (
        <D2Form
          action={updateBasics}
          submitLabel="Αποθήκευση χρονοδιαγράμματος"
        >
          <IdField id={agreement.id} />
          <ScheduleRows agreement={agreement} />
        </D2Form>
      ) : (
        <ScheduleRows agreement={agreement} />
      )}
      {agreement.state === "proposal" && (
        <p className="note">
          Αν η υπογραφή έρθει μετά την ημερομηνία έναρξης, η έναρξη γίνεται η
          μέρα της υπογραφής.
        </p>
      )}
    </D2Box>
  );
}

const STATE_TEXT: Readonly<Record<PeriodState, string>> = {
  closed: "κλειστή",
  current: "τρέχουσα",
  next: "επόμενη",
};

function PeriodLine({
  period,
  showProduction,
}: {
  period: PeriodRow;
  showProduction: boolean;
}) {
  const isCurrent = period.state === "current";
  return (
    <li className="ml-line" data-current={isCurrent}>
      <span className="ml-main">
        <span className="ml-tag">{STATE_TEXT[period.state]}</span>
        <strong>{periodLabel(period)}</strong>
        <small>
          {formatDate(period.starts)} – {formatDate(period.ends)}
          {period.isPartial && (
            <>
              {" "}
              <Badge tone="attention">σπασμένη</Badge>
            </>
          )}
        </small>
        <small>
          Παροχές: {period.givesProvisions ? "ολόκληρες" : "χωρίς νέες Παροχές"}
        </small>
      </span>
      <span className="ml-amount">
        {period.amount === null ? "—" : formatMoney(period.amount)}
        {period.isDiscounted && <small>με έκπτωση</small>}
      </span>
      {showProduction && period.productionId && (
        <span className="ml-quick">
          <Link href={`/app/productions/${period.productionId}`}>Παραγωγή</Link>
        </span>
      )}
    </li>
  );
}

// Το πλάνο των Περιόδων μιας μηνιαίας: υπολογίζεται από τη βάση (ημερομηνίες, σπασμένοι μήνες, έκπτωση, Παροχές).
export function PeriodsSection({
  agreement,
  canSeeProductions,
}: {
  agreement: AgreementDetail;
  canSeeProductions: boolean;
}) {
  const { periods } = agreement;
  if (agreement.kind !== "monthly" || periods.length === 0) return null;
  const showProduction =
    canSeeProductions && periods.some((p) => p.productionId !== null);
  return (
    <D2Box
      title={agreement.state === "proposal" ? "Σχέδιο Περιόδων" : "Περίοδοι"}
      hint={`${periods.length} Περίοδοι`}
    >
      <p className="muted">
        Ημερολογιακοί μήνες. Η μερική πρώτη δίνει ολόκληρες Παροχές, η μερική
        τελευταία δεν δίνει νέες· ο μήνας που δεν είναι ολόκληρος («σπασμένη»)
        χρεώνεται αναλογικά με τις μέρες.
      </p>
      <ul className="ml-list d2-periods" aria-label="Περίοδοι">
        {periods.map((period) => (
          <PeriodLine
            key={period.n}
            period={period}
            showProduction={showProduction}
          />
        ))}
      </ul>
    </D2Box>
  );
}
