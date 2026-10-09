import { formatDate } from "../helpers";
import { DOC_LABELS } from "../labels-public";
import type {
  Language,
  ProposalDocument as ProposalDocumentData,
} from "../types";

import {
  LinesSection,
  PriceSection,
  ProvisionTotals,
  TermsSection,
} from "./proposal-document-parts";

// Η πρόταση όπως τη βλέπει ο πελάτης: ένα καθαρό έγγραφο, στη γλώσσα του. Το χρησιμοποιούν η D5 (δημόσια) και η προεπισκόπηση της D2.
// Είναι παρουσίαση μόνο (χωρίς κουμπιά): οι ενέργειες υπογραφής μπαίνουν από τη σελίδα. Στην εκτύπωση φεύγουν το banner και το φόντο.

interface ProposalDocumentProps {
  document: ProposalDocumentData;
  language: Language;
  mode: "public" | "preview";
}

function DocumentHeader({
  document,
  language,
}: Omit<ProposalDocumentProps, "mode">) {
  const t = DOC_LABELS[language];
  const { company, client } = document;
  return (
    <header className="grid gap-1">
      <p className="kit-label m-0">{company.tradeName || company.legalName}</p>
      <p className="m-0 text-sm text-muted-foreground">
        {t.proposalFor} {client.legalName || client.name}
      </p>
      <h1 className="m-0 text-2xl font-semibold tracking-tight">
        {document.title}
      </h1>
      <p className="m-0 text-sm text-muted-foreground">
        {t.revision(document.revision)} · {t.validUntil}{" "}
        {formatDate(document.validUntil)}
      </p>
    </header>
  );
}

function CompanyFooter({
  document,
  language,
}: Omit<ProposalDocumentProps, "mode">) {
  const t = DOC_LABELS[language];
  const { company } = document;
  const legal = t.legalLine(company.taxId, company.taxOffice, company.gemi);
  const contact = [company.address, company.phone, company.email]
    .filter((part) => part !== "")
    .join(" · ");
  return (
    <footer className="grid gap-1 border-t pt-4 text-xs text-muted-foreground">
      <p className="m-0">{company.legalName}</p>
      {legal !== "" && <p className="m-0">{legal}</p>}
      {contact !== "" && <p className="m-0">{contact}</p>}
    </footer>
  );
}

export function ProposalDocument({
  document,
  language,
  mode,
}: ProposalDocumentProps) {
  const t = DOC_LABELS[language];
  const section = { doc: document, t, language };
  return (
    <article
      lang={language}
      className="grid gap-6 rounded-md border bg-card p-4 sm:p-6 print:border-0 print:bg-transparent print:p-0"
    >
      {mode === "preview" && (
        <p
          role="note"
          className="m-0 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground print:hidden"
        >
          {DOC_LABELS.el.preview}
        </p>
      )}
      <DocumentHeader document={document} language={language} />
      <LinesSection {...section} />
      <ProvisionTotals {...section} />
      <PriceSection {...section} />
      <TermsSection {...section} />
      <CompanyFooter document={document} language={language} />
    </article>
  );
}
