import type { ReactNode } from "react";

import { Table, Td, Th } from "@/components/ui/table";

import {
  endOfTerm,
  formatDate,
  formatDocNumber,
  localizeNumberIn,
} from "../helpers";
import type { DocLabels } from "../labels-public";
import type { Language, ProposalDocument, ProvisionText } from "../types";

// Τα μέρη του εγγράφου που βλέπει ο πελάτης: γραμμές, τιμή και Όροι. Ποτέ ώρες, κόστος, περιθώριο, Κατάλογος ή Παρέκκλιση:
// το έγγραφο που έρχεται από τη βάση δεν τα περιέχει καν.

const LOCALES: Readonly<Record<Language, string>> = {
  el: "el-GR",
  en: "en-IE",
};

export const docMoney = (language: Language, value: number): string =>
  new Intl.NumberFormat(LOCALES[language], {
    style: "currency",
    currency: "EUR",
  }).format(value);

// Η περιγραφή στη γλώσσα του εγγράφου, με πτώση στα ελληνικά όταν λείπει η αγγλική.
export const inLanguage = (
  language: Language,
  greek: string,
  english: string,
): string => (language === "en" && english !== "" ? english : greek);

export const provisionText = (
  language: Language,
  provision: ProvisionText,
): string =>
  `${provision.quantity} × ${inLanguage(language, provision.label, provision.labelEn)}`;

interface SectionProps {
  doc: ProposalDocument;
  t: DocLabels;
  language: Language;
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t pt-4 print:break-inside-avoid">
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function PlainList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-disc gap-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Pair({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right tabular-nums">{value}</dd>
    </>
  );
}

export function LinesSection({ doc, t, language }: SectionProps) {
  const suffix = doc.kind === "monthly" ? t.perMonth : "";
  return (
    <Section title={t.linesTitle}>
      <Table>
        <thead>
          <tr>
            <Th>{t.description}</Th>
            <Th>{t.provisions}</Th>
            <Th isNumeric>{t.quantity}</Th>
            <Th isNumeric>{t.amount}</Th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((line, index) => (
            <tr key={`${index}-${line.description}`}>
              <Td data-label={t.description}>
                {inLanguage(language, line.description, line.descriptionEn)}
              </Td>
              <Td data-label={t.provisions}>
                {line.provisions
                  .map((p) => provisionText(language, p))
                  .join(", ") || "—"}
              </Td>
              <Td isNumeric data-label={t.quantity}>
                {line.quantity}
              </Td>
              <Td isNumeric data-label={t.amount}>
                {docMoney(language, line.lineTotal)}
                {suffix}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
  );
}

export function ProvisionTotals({ doc, t, language }: SectionProps) {
  if (doc.provisionTotals.length === 0) return null;
  const title = doc.kind === "monthly" ? t.includedTitle : t.provisions;
  return (
    <Section title={title}>
      <PlainList
        items={doc.provisionTotals.map((p) => provisionText(language, p))}
      />
    </Section>
  );
}

function VatRows({ doc, t, language }: SectionProps) {
  const { totals } = doc;
  return (
    <>
      <Pair
        label={localizeNumberIn(
          language,
          t.vat(totals.vatRate),
          totals.vatRate,
        )}
        value={docMoney(language, totals.vat)}
      />
      <Pair
        label={<strong>{t.totalWithVat}</strong>}
        value={<strong>{docMoney(language, totals.gross)}</strong>}
      />
    </>
  );
}

function MonthlyPrice(props: SectionProps) {
  const { doc, t, language } = props;
  const { totals, startOn, durationMonths } = doc;
  const hasDiscount = totals.discountPercent > 0 && totals.discountMonths > 0;
  const endText = (): string | null => {
    if (durationMonths === null) return null;
    if (startOn === null) return t.endAfter(durationMonths);
    return `${formatDate(endOfTerm(startOn, durationMonths))} · ${t.duration(durationMonths)}`;
  };
  const end = endText();
  return (
    <>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        <Pair label={t.monthlyPrice} value={docMoney(language, totals.net)} />
        <VatRows {...props} />
        {hasDiscount && (
          <Pair
            label={t.discountedPrice}
            value={`${localizeNumberIn(language, t.discount(totals.discountPercent, totals.discountMonths), totals.discountPercent)}: ${docMoney(language, totals.discountedNet)} ${t.plusVat}`}
          />
        )}
        <Pair
          label={t.start}
          value={startOn === null ? t.onSignature : formatDate(startOn)}
        />
        {end !== null && <Pair label={t.end} value={end} />}
      </dl>
      <PlainList items={[t.proRata]} />
    </>
  );
}

function OneOffPrice(props: SectionProps) {
  const { doc, t, language } = props;
  return (
    <>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        <Pair label={t.total} value={docMoney(language, doc.totals.net)} />
        <VatRows {...props} />
      </dl>
      {doc.milestones.length > 0 && (
        <div className="grid gap-2">
          <h3 className="m-0 text-base font-semibold">{t.instalments}</h3>
          <PlainList
            items={doc.milestones.map(
              (m) =>
                `${formatDocNumber(language, m.percent)}% · ${docMoney(language, m.amount)} ${t.plusVat} · ${t.trigger(m.trigger, m.dueOn === null ? null : formatDate(m.dueOn))}`,
            )}
          />
        </div>
      )}
    </>
  );
}

export function PriceSection(props: SectionProps) {
  return (
    <Section title={props.t.priceTitle}>
      {props.doc.kind === "monthly" ? (
        <MonthlyPrice {...props} />
      ) : (
        <OneOffPrice {...props} />
      )}
    </Section>
  );
}

// Οι Όροι της μηνιαίας έχουν επιπλέον περίοδο χάριτος, αχρησιμοποίητες Παροχές, ανανέωση και λύση.
function termItems({ doc, t, language }: SectionProps): string[] {
  const { terms, kind } = doc;
  const items = [t.payment(terms.paymentDays)];
  if (kind === "monthly") {
    if (terms.graceDays > 0) items.push(t.grace(terms.graceDays));
    items.push(t.unused[terms.unusedProvisions]);
    if (terms.renewal !== null) items.push(t.renewal[terms.renewal]);
    const fee =
      terms.dissolutionFee > 0
        ? docMoney(language, terms.dissolutionFee)
        : null;
    items.push(t.dissolution(terms.dissolutionNoticeDays, fee));
  }
  return items;
}

export function TermsSection(props: SectionProps) {
  const { doc, t, language } = props;
  const { terms } = doc;
  return (
    <Section title={t.termsTitle}>
      <PlainList items={termItems(props)} />
      <h3 className="m-0 text-base font-semibold">{t.filmingTitle}</h3>
      <PlainList
        items={[
          t.notice(terms.filmingNoticeHours),
          t.cancel(terms.filmingCancelHours),
          t.lateCancel(terms.lateCancelBurns),
          t.noShow(terms.noShowBurns),
        ]}
      />
      {terms.revisionLimits.length > 0 && (
        <>
          <h3 className="m-0 text-base font-semibold">{t.revisionTitle}</h3>
          <PlainList
            items={terms.revisionLimits.map((limit) =>
              t.revisionLimit(
                limit.rounds,
                inLanguage(language, limit.label, limit.labelEn),
              ),
            )}
          />
        </>
      )}
    </Section>
  );
}
