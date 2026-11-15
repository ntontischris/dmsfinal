import "server-only";

import path from "node:path";

import {
  Document,
  Font,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

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
import { FAMILY, s } from "./signed-pdf-styles";

// Το PDF της υπογεγραμμένης Συμφωνίας: το ίδιο έγγραφο που είδε ο πελάτης (documentOf, D5) στα χρώματα της εφαρμογής,
// με την υπογραφή στο τέλος. Η γραμματοσειρά (Inter Tight, OFL) ενσωματώνεται ώστε τα ελληνικά να φαίνονται παντού.

const FONT_DIR = path.join(process.cwd(), "src/modules/agreements/pdf/fonts");

Font.register({
  family: FAMILY,
  fonts: [
    { src: path.join(FONT_DIR, "InterTight-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "InterTight-SemiBold.ttf"), fontWeight: 600 },
  ],
});
// Η προεπιλεγμένη συλλαβοποίηση είναι αγγλική: στα ελληνικά θα έκοβε λάθος. Οι λέξεις δεν κόβονται.
Font.registerHyphenationCallback((word) => [word]);

function Label({ text }: { text: string }) {
  return <Text style={s.label}>{capsOf(text)}</Text>;
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
      <Text style={s.dot}>·</Text>
      <Text style={s.rowMain}>{item}</Text>
    </View>
  ));
}

function LineRow({ line }: { line: D5Line }) {
  return (
    <View style={s.row}>
      <View style={s.rowMain}>
        <Text style={s.strong}>{line.title}</Text>
        <Text style={s.muted}>{line.sub}</Text>
      </View>
      <View style={s.rowAside}>
        <Text style={s.muted}>{line.quantity}</Text>
        <Text style={s.strong}>{line.amount}</Text>
      </View>
    </View>
  );
}

function PairRow({ pair }: { pair: D5Pair }) {
  const weight = pair.isStrong ? s.strong : {};
  return (
    <View style={s.row}>
      <Text style={[s.rowMain, weight]}>{pair.label}</Text>
      <Text style={weight}>{pair.value}</Text>
    </View>
  );
}

export interface SignedPdfInput {
  document: ProposalDocument;
  language: Language;
  signedName: string;
  signedOn: string;
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

function Header({ view: { doc, labels } }: { view: PdfView }) {
  return (
    <View style={s.band}>
      <Text style={s.brand}>{doc.brand}</Text>
      <Text style={s.kicker}>
        {labels.docTitle} · {doc.proposalFor}
      </Text>
      <Text style={s.title}>{doc.title}</Text>
      <Text style={s.meta}>{doc.meta}</Text>
    </View>
  );
}

function Price({ view: { doc, t } }: { view: PdfView }) {
  return (
    <Section label={t.priceTitle}>
      {doc.price.map((pair) => (
        <PairRow key={pair.label} pair={pair} />
      ))}
      <Bullets items={doc.priceNotes} />
      {doc.instalments.length > 0 && <Text style={s.sub}>{t.instalments}</Text>}
      <Bullets items={doc.instalments} />
    </Section>
  );
}

function Terms({ view: { doc, t } }: { view: PdfView }) {
  return (
    <View style={s.section}>
      <Label text={t.termsTitle} />
      <Bullets items={doc.terms} />
      <Text style={s.sub}>{t.filmingTitle}</Text>
      <Bullets items={doc.filming} />
      {doc.revisionLimits.length > 0 && (
        <Text style={s.sub}>{t.revisionTitle}</Text>
      )}
      <Bullets items={doc.revisionLimits} />
    </View>
  );
}

function Body({ view }: { view: PdfView }) {
  const { doc, t, labels } = view;
  return (
    <View style={s.body}>
      <View style={s.section}>
        <Label text={t.linesTitle} />
        {doc.lines.map((line) => (
          <LineRow key={line.id} line={line} />
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
        <Text style={s.strong}>{view.signedBy}</Text>
      </View>
      <View style={s.legal}>
        {doc.legal.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

function SignedAgreementPdf({
  view,
  language,
}: {
  view: PdfView;
  language: Language;
}) {
  const { doc, labels } = view;
  return (
    <Document
      title={`${doc.title} — ${labels.docTitle}`}
      author={doc.brand}
      language={language}
    >
      <Page size="A4" style={s.page}>
        <Header view={view} />
        <Body view={view} />
        <View style={s.footer} fixed>
          <Text>{doc.brand}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              labels.page(pageNumber, totalPages)
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderSignedPdf(
  input: SignedPdfInput,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(
    <SignedAgreementPdf view={viewOf(input)} language={input.language} />,
  );
  return new Uint8Array(buffer);
}
