"use client";

import { useState, type JSX } from "react";

import {
  currentRevision,
  signatoryOf,
  type AgreementRecord,
} from "@/data/agreements";
import { findClient } from "@/data/sales";
import { ProposalActions } from "@/screens/d5-actions";
import { ACTION_LABELS, DOC_LABELS } from "@/screens/d5-labels";
import {
  LinesSection,
  PriceSection,
  TermsSection,
} from "@/screens/d5-sections";
import { fmtDate } from "@/screens/shared";

import "./d5.css";

export type ProposalViewer = "signatory" | "recipient" | "preview";

export interface ProposalDocumentProps {
  agreement: AgreementRecord;
  viewer: ProposalViewer;
  language: "el" | "en";
}

function PdfButton({ label }: { label: string }) {
  const [isClicked, setIsClicked] = useState(false);
  return (
    <span className="btn-row">
      <button
        type="button"
        className="button"
        onClick={() => setIsClicked(true)}
      >
        {label}
      </button>
      {isClicked && (
        <span className="muted">prototype: δεν κατεβαίνει αρχείο</span>
      )}
    </span>
  );
}

// Το καθαρό έγγραφο που βλέπει ο πελάτης στον Σύνδεσμο πρότασης, στη γλώσσα του Πελάτη.
export function ProposalDocument({
  agreement,
  viewer,
  language,
}: ProposalDocumentProps): JSX.Element {
  const t = DOC_LABELS[language];
  const a = ACTION_LABELS[language];
  const client = findClient(agreement.clientId);
  const signatory = signatoryOf(agreement);
  const revision = currentRevision(agreement)?.number ?? 1;

  return (
    <article className="card d5-doc" lang={language}>
      <header className="d5-head">
        <div className="d5-brand">{t.company}</div>
        <div className="muted">
          {t.proposalFor} {client?.legalName ?? client?.name ?? "—"}
        </div>
        <h2 className="d5-title">{agreement.title}</h2>
        <div className="muted">
          {t.revision(revision)}
          {agreement.validUntil &&
            ` · ${t.validUntil} ${fmtDate(agreement.validUntil)}`}
        </div>
      </header>

      <LinesSection agreement={agreement} t={t} lang={language} />
      <PriceSection agreement={agreement} t={t} lang={language} />
      <TermsSection agreement={agreement} t={t} lang={language} />

      <footer className="d5-section stack">
        <PdfButton label={t.pdf} />
        {viewer === "preview" ? (
          <p className="muted">{a.preview}</p>
        ) : (
          <ProposalActions
            isSignatory={viewer === "signatory"}
            signatoryName={signatory?.name ?? "—"}
            signatoryEmail={signatory?.email ?? ""}
            a={a}
          />
        )}
      </footer>
    </article>
  );
}
