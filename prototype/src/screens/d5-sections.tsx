// Τα μέρη του καθαρού εγγράφου: γραμμές, τιμή και Όροι. Ποτέ ώρες, κόστος, περιθώριο, Κατάλογος ή Παρέκκλιση.

import {
  agreementTotal,
  discountedTotal,
  lineTotal,
  provisionsOf,
  withVat,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS, provisionKind } from "@/data/catalogue";
import type { Provision } from "@/data/catalogue";
import type { DocLabels, DocLanguage } from "@/screens/d5-labels";
import { fmtDate } from "@/screens/shared";

const LOCALES: Readonly<Record<DocLanguage, string>> = {
  el: "el-GR",
  en: "en-IE",
};

export const docMoney = (lang: DocLanguage, value: number): string =>
  new Intl.NumberFormat(LOCALES[lang], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);

interface SectionProps {
  agreement: AgreementRecord;
  t: DocLabels;
  lang: DocLanguage;
}

const kindName = (lang: DocLanguage, provision: Provision): string => {
  const kind = provisionKind(provision.kindId);
  return lang === "en" ? kind.nameEn : kind.name;
};

const provisionsText = (
  lang: DocLanguage,
  provisions: readonly Provision[],
): string =>
  provisions.map((p) => `${p.quantity} × ${kindName(lang, p)}`).join(", ");

export function LinesSection({ agreement, t, lang }: SectionProps) {
  const suffix = agreement.kind === "μηνιαία" ? t.perMonth : "";
  return (
    <section className="d5-section">
      <h2>{t.linesTitle}</h2>
      <table className="rtable">
        <thead>
          <tr>
            <th>{t.description}</th>
            <th>{t.provisions}</th>
            <th className="num">{t.quantity}</th>
            <th className="num">{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {agreement.lines.map((line) => (
            <tr key={line.id}>
              <td data-label={t.description}>{line.description}</td>
              <td data-label={t.provisions}>
                {provisionsText(lang, line.provisions)}
              </td>
              <td data-label={t.quantity} className="num">
                {line.quantity}
              </td>
              <td data-label={t.amount} className="num">
                {docMoney(lang, lineTotal(line))}
                {suffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function VatRows({
  amount,
  t,
  lang,
}: { amount: number } & Omit<SectionProps, "agreement">) {
  return (
    <>
      <dt>{t.vat(COST_SETTINGS.vatPercent)}</dt>
      <dd>{docMoney(lang, withVat(amount) - amount)}</dd>
      <dt>
        <strong>{t.totalWithVat}</strong>
      </dt>
      <dd>
        <strong>{docMoney(lang, withVat(amount))}</strong>
      </dd>
    </>
  );
}

function MonthlyPrice({ agreement, t, lang }: SectionProps) {
  const total = agreementTotal(agreement);
  const { percent, months } = agreement.terms.firstMonthsDiscount;
  const { durationMonths, renewal, unusedProvisions } = agreement.terms;
  return (
    <>
      <dl className="dl">
        <dt>{t.monthlyPrice}</dt>
        <dd>{docMoney(lang, total)}</dd>
        <VatRows amount={total} t={t} lang={lang} />
        {percent > 0 && (
          <>
            <dt>{t.discountedPrice}</dt>
            <dd>
              {t.discount(percent, months)}:{" "}
              {docMoney(lang, discountedTotal(agreement))} {t.plusVat}
            </dd>
          </>
        )}
        <dt>{t.start}</dt>
        <dd>{agreement.start ? fmtDate(agreement.start) : t.onSignature}</dd>
        {durationMonths !== null && (
          <>
            <dt>{t.end}</dt>
            <dd>
              {t.duration(durationMonths)}
              {agreement.end && ` · ${fmtDate(agreement.end)}`}
            </dd>
          </>
        )}
      </dl>
      <ul className="d5-plain">
        <li>{t.unused[unusedProvisions]}</li>
        {renewal && <li>{t.renewal[renewal]}</li>}
      </ul>
    </>
  );
}

function OneOffPrice({ agreement, t, lang }: SectionProps) {
  const total = agreementTotal(agreement);
  const milestones = agreement.terms.milestones;
  return (
    <>
      <dl className="dl">
        <dt>{t.total}</dt>
        <dd>{docMoney(lang, total)}</dd>
        <VatRows amount={total} t={t} lang={lang} />
      </dl>
      {milestones.length > 0 && (
        <>
          <h3>{t.instalments}</h3>
          <ul className="d5-plain">
            {milestones.map((milestone, index) => (
              <li key={`${milestone.trigger}-${index}`}>
                {milestone.percent}% ·{" "}
                {docMoney(lang, (total * milestone.percent) / 100)} {t.plusVat}{" "}
                ·{" "}
                {t.trigger(
                  milestone.trigger,
                  milestone.date ? fmtDate(milestone.date) : undefined,
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function PriceSection(props: SectionProps) {
  return (
    <section className="d5-section">
      <h2>{props.t.priceTitle}</h2>
      {props.agreement.kind === "μηνιαία" ? (
        <MonthlyPrice {...props} />
      ) : (
        <OneOffPrice {...props} />
      )}
    </section>
  );
}

export function TermsSection({ agreement, t, lang }: SectionProps) {
  const { terms } = agreement;
  const fee =
    terms.dissolution.fee > 0 ? docMoney(lang, terms.dissolution.fee) : null;
  const limits = provisionsOf(agreement).flatMap((provision) => {
    const rounds = terms.revisionLimit[provision.kindId];
    return provision.kindId === "shoot" || rounds === undefined
      ? []
      : [t.revisionLimit(rounds, kindName(lang, provision))];
  });
  return (
    <section className="d5-section">
      <h2>{t.termsTitle}</h2>
      <ul className="d5-plain">
        <li>{t.payment(terms.paymentDays)}</li>
        {agreement.kind === "μηνιαία" && terms.graceDays > 0 && (
          <li>{t.grace(terms.graceDays)}</li>
        )}
        {limits.map((limit) => (
          <li key={limit}>{limit}</li>
        ))}
        <li>{t.dissolution(terms.dissolution.noticeDays, fee)}</li>
      </ul>
      <h3>{t.filmingTitle}</h3>
      <ul className="d5-plain">
        <li>{t.notice(terms.filming.noticeDays)}</li>
        <li>{t.cancel(terms.filming.cancelHours)}</li>
        <li>{t.lateCancel(terms.filming.lateCancelBurns)}</li>
        <li>{t.noShow(terms.filming.noShowBurns)}</li>
      </ul>
    </section>
  );
}
