import { Fragment } from "react";

import type { PaymentInfo } from "../ledger-view-schema";
import { Box } from "./i5-cards";
import { contactLinksOf } from "./i8-client-model";
import { CopyButton } from "./i5-pay";

// «Πώς πληρώνω» του Χρήστη πελάτη (Τ3): ο λογαριασμός της εταιρείας με αντιγραφή και, σε ένα Τιμολόγιο, η αιτιολογία
// (ο αριθμός του) με αντιγραφή. Χωρίς λογαριασμό: απλό μήνυμα και η επικοινωνία της εταιρείας, αν υπάρχει.

interface ClientPayBoxProps {
  // null όταν δεν φορτώθηκαν οι οδηγίες: ο πελάτης βλέπει πάλι το «Επικοινωνήστε μαζί μας».
  info: PaymentInfo | null;
  // Ο αριθμός του Τιμολογίου που πληρώνει (στη σελίδα ενός Τιμολογίου).
  reference?: string;
  isOpen?: boolean;
}

function BankDetails({
  bank,
  reference,
}: {
  bank: NonNullable<PaymentInfo["bank"]>;
  reference?: string;
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
      <dt>Αιτιολογία</dt>
      {reference ? (
        <dd className="i5-pay-line">
          <span>{reference}</span>
          <CopyButton value={reference} what="η αιτιολογία" />
        </dd>
      ) : (
        <dd>ο αριθμός του Τιμολογίου που πληρώνεις</dd>
      )}
    </dl>
  );
}

function AskUs({ company }: { company: PaymentInfo["company"] | null }) {
  const links = company ? contactLinksOf(company) : [];
  return (
    <>
      <p className="muted">
        Επικοινωνήστε μαζί μας για τον τρόπο πληρωμής
        {company?.name ? ` (${company.name})` : ""}.
      </p>
      {links.length > 0 && (
        <dl className="dl">
          {links.map((link) => (
            <Fragment key={link.label}>
              <dt>{link.label}</dt>
              <dd>
                <a href={link.href}>{link.value}</a>
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </>
  );
}

export function ClientPayBox({ info, reference, isOpen }: ClientPayBoxProps) {
  const bank = info?.bank ?? null;
  return (
    <Box
      id="pay"
      isOpen={isOpen}
      title="Πώς πληρώνω"
      hint={
        bank ? `${bank.bank} · IBAN με αντιγραφή` : "Επικοινωνήστε μαζί μας"
      }
    >
      {bank ? (
        <BankDetails bank={bank} reference={reference} />
      ) : (
        <AskUs company={info?.company ?? null} />
      )}
    </Box>
  );
}
