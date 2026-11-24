import { Fragment } from "react";

import type { PaymentInfo } from "../ledger-view-schema";
import { Box } from "./i5-cards";
import {
  RF_LABEL,
  contactLinksOf,
  type ContactLink,
  type PaymentReference,
} from "./i8-client-model";
import { CopyButton } from "./i5-pay";

// «Πώς πληρώνω» του Χρήστη πελάτη (Τ3): ο λογαριασμός της εταιρείας με αντιγραφή και, σε ένα Τιμολόγιο, η αιτιολογία
// (κωδικός πληρωμής RF ή ο αριθμός του) με αντιγραφή. Χωρίς λογαριασμό: απλό μήνυμα και η επικοινωνία της εταιρείας.

interface ClientPayBoxProps {
  // null όταν δεν φορτώθηκαν οι οδηγίες: ο πελάτης βλέπει πάλι το «Επικοινώνησε μαζί μας».
  info: PaymentInfo | null;
  // Ο λογαριασμός από άλλη ανάγνωση (π.χ. την Καρτέλα), όταν οι οδηγίες δεν φορτώθηκαν.
  fallbackBank?: PaymentInfo["bank"];
  // Τι γράφει στην πληρωμή (στη σελίδα ενός Τιμολογίου): ο κωδικός πληρωμής (RF) ή ο αριθμός του.
  reference?: PaymentReference;
  isOpen?: boolean;
}

function ReferenceRow({ reference }: { reference: PaymentReference }) {
  return (
    <>
      <dt>{reference.label}</dt>
      <dd className="i5-pay-line">
        <span>{reference.value}</span>
        <CopyButton value={reference.value} what={reference.what} />
      </dd>
    </>
  );
}

function BankDetails({
  bank,
  reference,
}: {
  bank: NonNullable<PaymentInfo["bank"]>;
  reference?: PaymentReference;
}) {
  return (
    <dl className="dl">
      <dt>Δικαιούχος</dt>
      <dd>{bank.holder}</dd>
      <dt>Τράπεζα</dt>
      <dd>{bank.bank}</dd>
      <dt>IBAN</dt>
      <dd className="i5-pay-line">
        <span className="i245-iban">{bank.iban}</span>
        <CopyButton value={bank.iban} what="το IBAN" />
      </dd>
      {reference ? (
        <ReferenceRow reference={reference} />
      ) : (
        <>
          <dt>Αιτιολογία</dt>
          <dd>ο αριθμός του Τιμολογίου που πληρώνεις</dd>
        </>
      )}
    </dl>
  );
}

// Χωρίς λογαριασμό: μία φορά «Επικοινώνησε μαζί μας», με τηλέφωνο/email της εταιρείας όταν υπάρχουν.
// Ο κωδικός πληρωμής (RF) φαίνεται κι εδώ, αν έχει γραφτεί.
function AskUs({
  links,
  name,
  reference,
}: {
  links: readonly ContactLink[];
  name: string;
  reference?: PaymentReference;
}) {
  const hasRef = reference?.label === RF_LABEL;
  return (
    <>
      <p className="muted">
        Επικοινώνησε μαζί μας για τον τρόπο πληρωμής{name ? ` (${name})` : ""}.
      </p>
      {(links.length > 0 || hasRef) && (
        <dl className="dl">
          {links.map((link) => (
            <Fragment key={link.label}>
              <dt>{link.label}</dt>
              <dd>
                <a href={link.href}>{link.value}</a>
              </dd>
            </Fragment>
          ))}
          {hasRef && reference && <ReferenceRow reference={reference} />}
        </dl>
      )}
    </>
  );
}

const askUsHint = (links: readonly ContactLink[]): string =>
  links.length > 0
    ? links.map((link) => link.value).join(" · ")
    : "ρώτα την εταιρεία";

export function ClientPayBox({
  info,
  fallbackBank = null,
  reference,
  isOpen,
}: ClientPayBoxProps) {
  const bank = info ? info.bank : fallbackBank;
  const links = info ? contactLinksOf(info.company) : [];
  return (
    <Box
      id="pay"
      isOpen={isOpen}
      title="Πώς πληρώνω"
      hint={bank ? `${bank.bank} · IBAN με αντιγραφή` : askUsHint(links)}
    >
      {bank ? (
        <BankDetails bank={bank} reference={reference} />
      ) : (
        <AskUs
          links={links}
          name={info?.company.name ?? ""}
          reference={reference}
        />
      )}
    </Box>
  );
}
