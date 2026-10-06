"use client";

import { ProposalActions, type ActionProps } from "@/screens/d2-actions";
import { SignedActions } from "@/screens/d2-actions-signed";
import { Confirmation } from "@/screens/d2-ui";
import { fmtDate } from "@/screens/shared";

interface ActionBarProps extends ActionProps {
  notice: string | null;
  notify: (notice: string) => void;
  hasNoContinuation: boolean;
  onNoContinuation: (value: boolean) => void;
  isPreviewOpen: boolean;
  onPreview: () => void;
}

const pathHint = ({ draft }: ActionProps): string | null => {
  if (draft.state !== "πρόταση")
    return draft.state === "έληξε" || draft.state === "λύθηκε"
      ? "Η Συμφωνία έκλεισε: μόνο ανάγνωση."
      : null;
  const validity = draft.validUntil ? fmtDate(draft.validUntil) : "—";
  switch (draft.path) {
    case "Σύνταξη":
      return "Σε σύνταξη: όσα αλλάζεις φαίνονται αμέσως στις Παρεκκλίσεις και στο περιθώριο.";
    case "Εστάλη":
      return `Οι Σύνδεσμοι είναι ενεργοί ως τις ${validity}. Για αλλαγές: νέα αναθεώρηση.`;
    case "Έληξε":
      return `Η Ισχύς έληξε στις ${validity}. Οι Σύνδεσμοι δεν δουλεύουν· η Ευκαιρία μένει ανοιχτή.`;
    case "Χάθηκε":
      return "Χάθηκε: μόνο ανάγνωση.";
    default:
      return null;
  }
};

// Οι ενέργειες στην κορυφή της σελίδας, ανά κατάσταση, πορεία και Δικαιώματα.
export function ActionBar(props: ActionBarProps) {
  const { draft, caps, notice, isPreviewOpen, onPreview } = props;
  const isProposal = draft.state === "πρόταση";
  const hint = caps.isClient ? null : pathHint(props);
  return (
    <section className="card d2-actions" aria-label="Ενέργειες">
      {hint && <p className="muted">{hint}</p>}
      <div className="btn-row">
        {isProposal ? (
          <ProposalActions {...props} />
        ) : (
          <SignedActions {...props} />
        )}
        {isProposal && !caps.isClient && (
          <button
            type="button"
            className="button"
            aria-expanded={isPreviewOpen}
            onClick={onPreview}
          >
            {isPreviewOpen
              ? "Κλείσιμο προεπισκόπησης"
              : "Όπως θα τη δει ο πελάτης"}
          </button>
        )}
      </div>
      <Confirmation text={notice} />
    </section>
  );
}
