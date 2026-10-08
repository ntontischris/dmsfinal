import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Th } from "@/components/ui/table";

import { formatMoney, formatNumber } from "../helpers";
import type {
  AgreementDetail,
  CatalogueOption,
  KindInfo,
  Totals,
} from "../types";

import { NoticeScope } from "./agreement-actions-parts";
import { AddLineForms } from "./add-line-forms";
import { LineRows, type LineColumns } from "./line-row";
import { MutedNote } from "./terms-section-parts";

interface LinesSectionProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  options: readonly CatalogueOption[]; // ό,τι προσφέρει ο Κατάλογος· κενό όταν ο θεατής δεν επεξεργάζεται
  isOptionsFailed?: boolean; // η ανάγνωση του Καταλόγου απέτυχε: αντί για φόρμα, σφάλμα
}

const WITHDRAW_NOTE = "Αν αλλάξεις την πρόταση, το αίτημα Έγκρισης αποσύρεται.";

function LinesHead({ columns }: { columns: LineColumns }) {
  return (
    <thead>
      <tr>
        <Th>Γραμμή</Th>
        <Th isNumeric>Ποσότητα</Th>
        {columns.amount && <Th isNumeric>Τιμή μονάδας</Th>}
        <Th>Παροχές</Th>
        {columns.cost && <Th isNumeric>Ώρες γύρ. / μοντ.</Th>}
        {columns.amount && <Th isNumeric>Σύνολο</Th>}
      </tr>
    </thead>
  );
}

function TotalRow({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: string;
  isStrong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${isStrong ? "font-semibold" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </div>
  );
}

interface TotalsBlockProps {
  totals: Totals;
  discount: { percent: number; months: number } | null;
  isMonthly: boolean;
}

function TotalsBlock({ totals, discount, isMonthly }: TotalsBlockProps) {
  const hasDiscount =
    discount !== null && totals.discountedPrice < totals.price;
  return (
    <div className="grid gap-2">
      <dl className="m-0 ml-auto grid w-full max-w-sm gap-1 text-sm">
        <TotalRow label="Σύνολο" value={formatMoney(totals.price)} />
        <TotalRow
          label={`ΦΠΑ ${formatNumber(totals.vatRate)}%`}
          value={formatMoney(totals.vat)}
        />
        <TotalRow
          label="Σύνολο με ΦΠΑ"
          value={formatMoney(totals.gross)}
          isStrong
        />
        {hasDiscount && (
          <>
            <TotalRow
              label={`Έκπτωση πρώτων μηνών ${formatNumber(discount.percent)}% για ${discount.months} ${discount.months === 1 ? "μήνα" : "μήνες"}`}
              value={`−${formatMoney(totals.price - totals.discountedPrice)}`}
            />
            <TotalRow
              label="Σύνολο με έκπτωση"
              value={formatMoney(totals.discountedPrice)}
            />
          </>
        )}
      </dl>
      <MutedNote>Τιμές χωρίς ΦΠΑ{isMonthly ? " ανά μήνα" : ""}.</MutedNote>
      {hasDiscount && (
        <MutedNote>
          Ο ΦΠΑ υπολογίζεται ανά Περίοδο στο ποσό που τιμολογείται.
        </MutedNote>
      )}
    </div>
  );
}

// Οι γραμμές της πρότασης: αντίγραφα από τον Κατάλογο ή ελεύθερες. Όποιος μπορεί να τις γράψει βλέπει από κάτω από κάθε
// γραμμή τη φόρμα της· οι υπόλοιποι μόνο τον πίνακα. Τιμές, ώρες και κόστος φτάνουν μόνο σε όποιον τα δικαιούται (αλλιώς null).
export function LinesSection({
  agreement,
  kinds,
  options,
  isOptionsFailed = false,
}: LinesSectionProps) {
  const { can, lines, totals, moneyTerms } = agreement;
  const columns: LineColumns = { amount: can.seeAmounts, cost: can.seeCost };
  const span = 3 + Number(columns.amount) * 2 + Number(columns.cost);
  const discount =
    moneyTerms === null || moneyTerms.discountPercent <= 0
      ? null
      : {
          percent: moneyTerms.discountPercent,
          months: moneyTerms.discountMonths,
        };
  return (
    <Panel label="Γραμμές">
      <NoticeScope>
        {can.edit && agreement.path === "awaiting_approval" && (
          <MutedNote>{WITHDRAW_NOTE}</MutedNote>
        )}
        {lines.length === 0 ? (
          <MutedNote>Δεν υπάρχουν γραμμές ακόμα.</MutedNote>
        ) : (
          <Table>
            <LinesHead columns={columns} />
            <tbody>
              {lines.map((line) => (
                <LineRows
                  key={line.id}
                  line={line}
                  agreement={agreement}
                  kinds={kinds}
                  columns={columns}
                  span={span}
                />
              ))}
            </tbody>
          </Table>
        )}
        {totals && lines.length > 0 && (
          <TotalsBlock
            totals={totals}
            discount={discount}
            isMonthly={agreement.kind === "monthly"}
          />
        )}
        {can.edit && isOptionsFailed && (
          <Notice kind="error" title="Δεν φόρτωσε ο Κατάλογος">
            <p className="m-0">
              Δεν μπορείς να προσθέσεις γραμμές αυτή τη στιγμή. Τίποτα δεν
              χάθηκε· δοκίμασε ξανά σε λίγο.
            </p>
          </Notice>
        )}
        {can.edit && !isOptionsFailed && (
          <AddLineForms
            agreementId={agreement.id}
            options={options}
            kinds={kinds}
            canEditPrices={can.editPrices}
          />
        )}
      </NoticeScope>
    </Panel>
  );
}
