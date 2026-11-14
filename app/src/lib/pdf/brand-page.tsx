import "server-only";

import path from "node:path";

import {
  Font,
  Image,
  Page,
  Text,
  View,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

import { FAMILY, kit } from "./brand-styles";
import { fallbackLogo, pdfLogoOf, type LogoBytes, type PdfLogo } from "./logo";

// Το κοινό πλαίσιο κάθε PDF: λογότυπο και τίτλος στην πρώτη σελίδα, γραμμή με το όνομα στις επόμενες,
// υποσέλιδο με τα στοιχεία της Εταιρείας και τη σελίδα. Η Manrope ενσωματώνεται ώστε τα ελληνικά να φαίνονται παντού.

const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

Font.register({
  family: FAMILY,
  fonts: [
    { src: path.join(FONT_DIR, "Manrope-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Manrope-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "Manrope-ExtraBold.ttf"), fontWeight: 800 },
  ],
});
// Η προεπιλεγμένη συλλαβοποίηση είναι αγγλική: στα ελληνικά θα έκοβε λάθος. Οι λέξεις δεν κόβονται.
Font.registerHyphenationCallback((word) => [word]);

export interface BrandPageProps {
  logo: PdfLogo;
  // Ήδη σε κεφαλαία (το κάθε πρότυπο ξέρει τη γλώσσα του).
  kind: string;
  runningTitle: string;
  eyebrow: string;
  title: string;
  meta: string;
  company: readonly string[];
  pageLabel: (current: number, total: number) => string;
  children: ReactNode;
}

function Masthead({ logo, kind, eyebrow, title, meta }: BrandPageProps) {
  return (
    <View>
      <View style={kit.masthead}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- το Image του react-pdf δεν έχει alt */}
        <Image
          style={kit.logo}
          src={{ data: logo.data, format: logo.format }}
        />
        <Text style={kit.kind}>{kind}</Text>
      </View>
      <Text style={kit.eyebrow}>{eyebrow}</Text>
      <Text style={kit.title}>{title}</Text>
      <Text style={kit.meta}>{meta}</Text>
      <View style={kit.accent} />
    </View>
  );
}

// Στις σελίδες μετά την πρώτη: ποιο έγγραφο είναι, χωρίς να ξαναμπεί το λογότυπο.
function RunningHead({ kind, runningTitle }: BrandPageProps) {
  const after =
    (text: string) =>
    ({ pageNumber }: { pageNumber: number }) =>
      pageNumber > 1 ? text : "";
  return (
    <View style={kit.runningHead} fixed>
      <Text render={after(runningTitle)} />
      <Text render={after(kind)} />
    </View>
  );
}

function Footer({ company, pageLabel }: BrandPageProps) {
  const [name, ...rest] = company;
  return (
    <View style={kit.footer} fixed>
      <View style={kit.footerCompany}>
        <View style={kit.footerName}>
          <View style={kit.rec} />
          {name && <Text style={kit.footerStrong}>{name}</Text>}
        </View>
        {rest.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </View>
      <Text
        style={kit.pageNumberText}
        render={({ pageNumber, totalPages }) =>
          pageLabel(pageNumber, totalPages)
        }
      />
    </View>
  );
}

export function BrandPage(props: BrandPageProps) {
  return (
    <Page size="A4" style={kit.page}>
      <RunningHead {...props} />
      <Masthead {...props} />
      {props.children}
      <Footer {...props} />
    </Page>
  );
}

// Το react-pdf κρατά τη φορτωμένη γραμματοσειρά ανάμεσα στα PDF της ίδιας διεργασίας, και από το δεύτερο PDF
// τα γράμματα που δεν είχε το πρώτο βγαίνουν λάθος ή λείπουν. Κάθε PDF φορτώνει τη γραμματοσειρά από την αρχή
// (το Font.reset() δεν αρκεί: αφήνει την παλιά υπόσχεση φόρτωσης και το render σκάει).
const reloadBrandFont = () => {
  for (const source of Font.getRegisteredFonts()[FAMILY]?.sources ?? []) {
    source.data = null;
    source.loadResultPromise = null;
  }
};

const toBytes = async (document: ReactElement<DocumentProps>) => {
  reloadBrandFont();
  return new Uint8Array(await renderToBuffer(document));
};

// Αποδίδει ένα PDF με το λογότυπο της Εταιρείας· αν εκείνο χαλάσει το render, ξανά με το λογότυπο του brand.
export async function renderBrandPdf(
  build: (logo: PdfLogo) => ReactElement<DocumentProps>,
  file: LogoBytes | null,
): Promise<Uint8Array> {
  const logo = pdfLogoOf(file);
  try {
    return await toBytes(build(logo));
  } catch (error) {
    if (logo.isFallback) throw error;
    console.error(
      "renderBrandPdf: company logo failed, using the brand logo",
      error,
    );
    return toBytes(build(fallbackLogo()));
  }
}
