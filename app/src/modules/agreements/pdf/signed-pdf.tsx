import "server-only";

import { Document, Text, View } from "@react-pdf/renderer";

import { BrandPage, renderBrandPdf } from "@/lib/pdf/brand-page";
import { kit } from "@/lib/pdf/brand-styles";
import type { LogoBytes, PdfLogo } from "@/lib/pdf/logo";

import { DOC_LABELS, type DocLabels } from "../labels-public";
import {
  documentOf,
  type D5Document,
  type D5Line,
  type D5Pair,
} from "../spaces/d5-adapter";
import type { Language, ProposalDocument } from "../types";
import {
  capsOf,
  signedPdfLabels,
  type SignedPdfLabels,
} from "./signed-pdf-labels";
import { s } from "./signed-pdf-styles";

// Το PDF της υπογεγραμμένης Συμφωνίας: το ίδιο έγγραφο που είδε ο πελάτης (documentOf, D5) στο κοινό πλαίσιο
// του brand (src/lib/pdf), με την υπογραφή στο τέλος και τα στοιχεία της Εταιρείας στο υποσέλιδο κάθε σελίδας.

function Label({ text }: { text: string }) {
  return <Text style={kit.label}>{capsOf(text)}</Text>;
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section} wrap={false}>
      <Label text={label} />
      {children}
    </View>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return items.map((item) => (
    <View key={item} style={s.bullet}>
      <View style={s.dot} />
      <Text style={s.bulletText}>{item}</Text>
    </View>
  ));
}

function LineRow({ line, isFirst }: { line: D5Line; isFirst: boolean }) {
  return (
    <View style={[s.row, isFirst ? s.firstRow : {}]} wrap={false}>
      <View style={s.rowMain}>
        <Text style={s.strong}>{line.title}</Text>
        <Text style={s.muted}>{line.sub}</Text>
      </View>
      <View style={s.rowAside}>
        <Text style={s.strong}>{line.amount}</Text>
        <Text style={s.muted}>{line.quantity}</Text>
      </View>
    </View>
  );
}

function PairRow({ pair, isFirst }: { pair: D5Pair; isFirst: boolean }) {
  if (pair.isStrong)
    return (
      <View style={s.total}>
        <Text style={s.strong}>{pair.label}</Text>
        <Text style={s.totalValue}>{pair.value}</Text>
      </View>
    );
  return (
    <View style={[s.row, isFirst ? s.firstRow : {}]}>
      <Text style={s.rowMain}>{pair.label}</Text>
      <Text>{pair.value}</Text>
    </View>
  );
}

export interface SignedPdfInput {
  document: ProposalDocument;
  language: Language;
  signedName: string;
  signedOn: string;
  // Το λογότυπο που ανέβασε ο Ιδιοκτήτης· χωρίς αυτό (ή αν δεν διαβάζεται) μπαίνει του brand.
  logo: LogoBytes | null;
}

// Ό,τι χρειάζεται κάθε κομμάτι, υπολογισμένο μία φορά.
interface PdfView {
  doc: D5Document;
  t: DocLabels;
  labels: SignedPdfLabels;
  signedBy: string;
}

const viewOf = (input: SignedPdfInput): PdfView => {
  const labels = signedPdfLabels(input.language);
  return {
    doc: documentOf(input.document, input.language),
    t: DOC_LABELS[input.language],
    labels,
    signedBy: labels.signedBy(input.signedName, input.signedOn),
  };
};

function Price({ view: { doc, t } }: { view: PdfView }) {
  return (
    <Section label={t.priceTitle}>
      {doc.price.map((pair, index) => (
        <PairRow key={pair.label} pair={pair} isFirst={index === 0} />
      ))}
      <Bullets items={doc.priceNotes} />
      {doc.instalments.length > 0 && (
        <Text style={s.sub} minPresenceAhead={40}>
          {t.instalments}
        </Text>
      )}
      <Bullets items={doc.instalments} />
    </Section>
  );
}

function Terms({ view: { doc, t } }: { view: PdfView }) {
  return (
    <View style={s.section}>
      <Label text={t.termsTitle} />
      <Bullets items={doc.terms} />
      <Text style={s.sub} minPresenceAhead={40}>
        {t.filmingTitle}
      </Text>
      <Bullets items={doc.filming} />
      {doc.revisionLimits.length > 0 && (
        <Text style={s.sub} minPresenceAhead={40}>
          {t.revisionTitle}
        </Text>
      )}
      <Bullets items={doc.revisionLimits} />
    </View>
  );
}

function Body({ view }: { view: PdfView }) {
  const { doc, t, labels } = view;
  return (
    <View>
      <View style={s.section}>
        <Label text={t.linesTitle} />
        {doc.lines.map((line, index) => (
          <LineRow key={line.id} line={line} isFirst={index === 0} />
        ))}
      </View>
      {doc.included && (
        <Section label={doc.included.title}>
          <Bullets items={doc.included.items} />
        </Section>
      )}
      <Price view={view} />
      <Terms view={view} />
      <View style={s.signature} wrap={false}>
        <Label text={labels.signatureTitle} />
        <Text style={s.signatureText}>{view.signedBy}</Text>
      </View>
    </View>
  );
}

function SignedAgreementPdf({
  view,
  language,
  logo,
}: {
  view: PdfView;
  language: Language;
  logo: PdfLogo;
}) {
  const { doc, labels } = view;
  return (
    <Document
      title={`${doc.title} — ${labels.docTitle}`}
      author={doc.brand}
      language={language}
    >
      <BrandPage
        logo={logo}
        kind={capsOf(labels.docTitle)}
        runningTitle={capsOf(doc.brand)}
        eyebrow={capsOf(doc.proposalFor)}
        title={doc.title}
        meta={doc.meta}
        company={doc.legal}
        pageLabel={labels.page}
      >
        <Body view={view} />
      </BrandPage>
    </Document>
  );
}

export async function renderSignedPdf(
  input: SignedPdfInput,
): Promise<Uint8Array> {
  const view = viewOf(input);
  return renderBrandPdf(
    (logo) => (
      <SignedAgreementPdf view={view} language={input.language} logo={logo} />
    ),
    input.logo,
  );
}
