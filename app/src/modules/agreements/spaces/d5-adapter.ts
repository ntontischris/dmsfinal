// D5 (νέα εμφάνιση): το έγγραφο της πρότασης και οι νεκροί Σύνδεσμοι στις μορφές του prototype (`screens/d5-*.tsx`).
// Καθαρές συναρτήσεις· τα κείμενα έρχονται από τα labels-public, ίδια με τη σημερινή σελίδα.

import {
  endOfTerm,
  formatDate,
  formatDocNumber,
  localizeNumberIn,
} from "../helpers";
import {
  DEAD_LINK_CONTACT,
  DEAD_LINK_LABELS,
  DOC_LABELS,
  fillTemplate,
  type DeadLinkKind,
  type DocLabels,
} from "../labels-public";
import type {
  Language,
  ProposalDocument,
  ProvisionText,
  PublicCompany,
} from "../types";

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
const inLanguage = (language: Language, greek: string, english: string) =>
  language === "en" && english !== "" ? english : greek;

const provisionText = (language: Language, p: ProvisionText): string =>
  `${p.quantity} × ${inLanguage(language, p.label, p.labelEn)}`;

export interface D5Line {
  id: string;
  title: string;
  sub: string;
  quantity: string;
  amount: string;
}

export interface D5Pair {
  label: string;
  value: string;
  isStrong?: boolean;
}

export interface D5Document {
  brand: string;
  proposalFor: string;
  title: string;
  meta: string;
  lines: readonly D5Line[];
  included: { title: string; items: readonly string[] } | null;
  price: readonly D5Pair[];
  priceNotes: readonly string[];
  instalments: readonly string[];
  terms: readonly string[];
  filming: readonly string[];
  revisionLimits: readonly string[];
  legal: readonly string[];
}

const linesOf = (doc: ProposalDocument, t: DocLabels, language: Language) => {
  const suffix = doc.kind === "monthly" ? t.perMonth : "";
  return doc.lines.map((line, index) => ({
    id: `${index}-${line.description}`,
    title: inLanguage(language, line.description, line.descriptionEn),
    sub:
      line.provisions.map((p) => provisionText(language, p)).join(", ") || "—",
    quantity: `${t.quantity}: ${line.quantity}`,
    amount: `${docMoney(language, line.lineTotal)}${suffix}`,
  }));
};

const vatPairs = (doc: ProposalDocument, t: DocLabels, language: Language) => [
  {
    label: localizeNumberIn(
      language,
      t.vat(doc.totals.vatRate),
      doc.totals.vatRate,
    ),
    value: docMoney(language, doc.totals.vat),
  },
  {
    label: t.totalWithVat,
    value: docMoney(language, doc.totals.gross),
    isStrong: true,
  },
];

const endText = (doc: ProposalDocument, t: DocLabels): string | null => {
  if (doc.durationMonths === null) return null;
  if (doc.startOn === null) return t.endAfter(doc.durationMonths);
  return `${formatDate(endOfTerm(doc.startOn, doc.durationMonths))} · ${t.duration(doc.durationMonths)}`;
};

function monthlyPairs(
  doc: ProposalDocument,
  t: DocLabels,
  language: Language,
): D5Pair[] {
  const { totals } = doc;
  const hasDiscount = totals.discountPercent > 0 && totals.discountMonths > 0;
  const end = endText(doc, t);
  const discount = localizeNumberIn(
    language,
    t.discount(totals.discountPercent, totals.discountMonths),
    totals.discountPercent,
  );
  return [
    { label: t.monthlyPrice, value: docMoney(language, totals.net) },
    ...vatPairs(doc, t, language),
    ...(hasDiscount
      ? [
          {
            label: t.discountedPrice,
            value: `${discount}: ${docMoney(language, totals.discountedNet)} ${t.plusVat}`,
          },
        ]
      : []),
    {
      label: t.start,
      value: doc.startOn === null ? t.onSignature : formatDate(doc.startOn),
    },
    ...(end !== null ? [{ label: t.end, value: end }] : []),
  ];
}

const pricePairs = (doc: ProposalDocument, t: DocLabels, language: Language) =>
  doc.kind === "monthly"
    ? monthlyPairs(doc, t, language)
    : [
        { label: t.total, value: docMoney(language, doc.totals.net) },
        ...vatPairs(doc, t, language),
      ];

const instalmentsOf = (
  doc: ProposalDocument,
  t: DocLabels,
  language: Language,
) =>
  doc.kind === "monthly"
    ? []
    : doc.milestones.map(
        (m) =>
          `${formatDocNumber(language, m.percent)}% · ${docMoney(language, m.amount)} ${t.plusVat} · ${t.trigger(m.trigger, m.dueOn === null ? null : formatDate(m.dueOn))}`,
      );

// Οι Όροι της μηνιαίας έχουν επιπλέον περίοδο χάριτος, αχρησιμοποίητες Παροχές, ανανέωση και λύση.
function termsOf(doc: ProposalDocument, t: DocLabels, language: Language) {
  const { terms } = doc;
  if (doc.kind !== "monthly") return [t.payment(terms.paymentDays)];
  const fee =
    terms.dissolutionFee > 0 ? docMoney(language, terms.dissolutionFee) : null;
  return [
    t.payment(terms.paymentDays),
    ...(terms.graceDays > 0 ? [t.grace(terms.graceDays)] : []),
    t.unused[terms.unusedProvisions],
    ...(terms.renewal !== null ? [t.renewal[terms.renewal]] : []),
    t.dissolution(terms.dissolutionNoticeDays, fee),
  ];
}

const includedOf = (doc: ProposalDocument, t: DocLabels, language: Language) =>
  doc.provisionTotals.length === 0
    ? null
    : {
        title: doc.kind === "monthly" ? t.includedTitle : t.provisions,
        items: doc.provisionTotals.map((p) => provisionText(language, p)),
      };

const legalOf = (doc: ProposalDocument, t: DocLabels): string[] => {
  const { company } = doc;
  const contact = [company.address, company.phone, company.email]
    .filter((part) => part !== "")
    .join(" · ");
  return [
    company.legalName,
    t.legalLine(company.taxId, company.taxOffice, company.gemi),
    contact,
  ].filter((line) => line !== "");
};

export function documentOf(
  doc: ProposalDocument,
  language: Language,
): D5Document {
  const t = DOC_LABELS[language];
  const { terms } = doc;
  return {
    brand: doc.company.tradeName || doc.company.legalName,
    proposalFor: `${t.proposalFor} ${doc.client.legalName || doc.client.name}`,
    title: doc.title,
    meta: `${t.revision(doc.revision)} · ${t.validUntil} ${formatDate(doc.validUntil)}`,
    lines: linesOf(doc, t, language),
    included: includedOf(doc, t, language),
    price: pricePairs(doc, t, language),
    priceNotes: doc.kind === "monthly" ? [t.proRata] : [],
    instalments: instalmentsOf(doc, t, language),
    terms: termsOf(doc, t, language),
    filming: [
      t.notice(terms.filmingNoticeHours),
      t.cancel(terms.filmingCancelHours),
      t.lateCancel(terms.lateCancelBurns),
      t.noShow(terms.noShowBurns),
    ],
    revisionLimits: terms.revisionLimits.map((limit) =>
      t.revisionLimit(
        limit.rounds,
        inLanguage(language, limit.label, limit.labelEn),
      ),
    ),
    legal: legalOf(doc, t),
  };
}

export interface D5DeadInput {
  kind: DeadLinkKind;
  language: Language | null;
  managerName: string | null;
  company: PublicCompany | null;
  date?: string | null;
}

export interface D5DeadMessage {
  language: Language;
  title: string;
  contact: string | null;
  reach: string | null;
}

const SIGNED_ON: Readonly<Record<Language, string>> = { el: "στις", en: "on" };

const deadTitle = (input: D5DeadInput, language: Language): string => {
  const label = DEAD_LINK_LABELS[language][input.kind];
  const date = input.date ? formatDate(input.date) : "";
  if (input.kind === "expired") return fillTemplate(label, { date });
  if (input.kind === "signed" && date)
    return `${label} ${SIGNED_ON[language]} ${date}`;
  return label;
};

// Ο νεκρός Σύνδεσμος: στη γλώσσα της πρότασης· ο άγνωστος δεν έχει γλώσσα και δείχνει και τις δύο.
export function deadMessagesOf(input: D5DeadInput): D5DeadMessage[] {
  const languages: readonly Language[] = input.language
    ? [input.language]
    : ["el", "en"];
  const who = input.managerName ?? input.company?.name ?? "";
  const reach = [input.company?.phone ?? "", input.company?.email ?? ""]
    .filter((part) => part !== "")
    .join(" · ");
  return languages.map((language) => ({
    language,
    title: deadTitle(input, language),
    contact:
      who === "" ? null : fillTemplate(DEAD_LINK_CONTACT[language], { who }),
    reach: reach === "" ? null : reach,
  }));
}
