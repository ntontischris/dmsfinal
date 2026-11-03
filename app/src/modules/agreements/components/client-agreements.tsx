import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import { getClientAgreement, listClientAgreements } from "../queries-client";
import { clientCardOf } from "../spaces/client-adapter";
import { ProposalDocument } from "./proposal-document";

// Η όψη του Χρήστη πελάτη στην παλιά εμφάνιση: ελάχιστη, με τις ίδιες αναγνώσεις με τη νέα (client_agreements_view,
// client_agreement_view). Λίστα με συνδέσμους και το έγγραφο όπως στον Σύνδεσμο. Μόνο ανάγνωση.

const LIST_EYEBROW = "D1 · Συμφωνίες";
const PAGE_EYEBROW = "D2 · Συμφωνίες";

const BackLink = () => (
  <Link href="/app/agreements" className={buttonVariants({ variant: "ghost" })}>
    ← Συμφωνίες
  </Link>
);

export async function ClientAgreementsList() {
  const found = await listClientAgreements();
  return (
    <>
      <ScreenHeader eyebrow={LIST_EYEBROW} title="Συμφωνίες" />
      {!found.ok ? (
        <Notice kind="error" title="Δεν φόρτωσαν οι Συμφωνίες">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      ) : found.data.length === 0 ? (
        <Notice kind="empty" title="Δεν έχετε ακόμα Συμφωνία με την ομάδα." />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {found.data.map(clientCardOf).map((card) => (
            <li
              key={card.id}
              className="grid gap-1 rounded-md border bg-card p-4"
            >
              <Link href={card.href} className="font-semibold">
                {card.title}
              </Link>
              <span className="text-sm text-muted-foreground">
                {card.status} · {card.kind}
                {card.amount && ` · ${card.amount} (χωρίς ΦΠΑ)`}
                {card.validUntil && ` · Ισχύει ως ${card.validUntil}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export async function ClientAgreementPage({
  agreementId,
}: {
  agreementId: string;
}) {
  const found = await getClientAgreement(agreementId);
  if (!found.ok || found.data === null || found.data.document === null)
    return (
      <>
        <ScreenHeader eyebrow={PAGE_EYEBROW} title="Συμφωνία">
          <BackLink />
        </ScreenHeader>
        {found.ok ? (
          <Notice kind="empty" title="Δεν βρέθηκε η Συμφωνία">
            <p className="m-0">
              Βλέπεις μόνο τις Συμφωνίες σου και τις προτάσεις που σου έχουν
              σταλεί.
            </p>
          </Notice>
        ) : (
          <Notice kind="error" title="Δεν φόρτωσε η Συμφωνία">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        )}
      </>
    );
  const { document } = found.data;
  return (
    <>
      <div className="print:hidden">
        <ScreenHeader eyebrow={PAGE_EYEBROW} title={found.data.title}>
          <BackLink />
        </ScreenHeader>
      </div>
      <ProposalDocument
        document={document}
        language={document.language}
        mode="public"
      />
    </>
  );
}
