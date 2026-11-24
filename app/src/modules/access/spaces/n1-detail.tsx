import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import {
  assignmentGroups,
  BLOCK_TEXT,
  type DeactivationPreview,
} from "../deactivation";
import type { N1User, PickerRole } from "./n1-adapter";
import {
  ChangeRolesForm,
  DeactivateButtons,
  ReactivateButton,
} from "./n1-user-forms";
import { Box, Hero } from "./n-parts";

// Η σελίδα ενός Χρήστη ομάδας (prototype `screens/n1-detail.tsx` + `n1-deactivate.tsx`): κεφαλίδα με το όνομα ως h1
// και κλειστά κουτιά από κάτω, με τις πραγματικές ενέργειες.

function Facts({ target, reach }: { target: N1User; reach: string }) {
  return (
    <dl className="ml-kv">
      <dt>Email</dt>
      <dd className="n1-email">{target.email}</dd>
      <dt>Ρόλοι</dt>
      <dd>{target.roles}</dd>
      <dt>Τι βλέπει</dt>
      <dd>{reach}</dd>
      {target.since && (
        <>
          <dt>Μέλος από</dt>
          <dd>{fmtDate(target.since)}</dd>
        </>
      )}
      {target.lastSeen !== undefined && (
        <>
          <dt>Τελευταία είσοδος</dt>
          <dd>{target.lastSeen ? fmtDate(target.lastSeen) : "ποτέ"}</dd>
        </>
      )}
      {target.deactivatedAt && (
        <>
          <dt>Απενεργοποιήθηκε</dt>
          <dd>{fmtDate(target.deactivatedAt)}</dd>
        </>
      )}
    </dl>
  );
}

// Τι επιστρέφει για νέα ανάθεση, ονομαστικά, όπως το λέει η βάση (team_deactivation_preview).
function AssignmentList({ preview }: { preview: DeactivationPreview }) {
  const groups = assignmentGroups(preview.items);
  if (groups.length === 0)
    return <p className="ml-empty">Καμία ανοιχτή ανάθεση.</p>;
  return (
    <dl className="ml-kv">
      {groups.map((group) => (
        <div key={group.kind}>
          <dt>{group.title}</dt>
          <dd>{group.names.join(" · ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewMissing() {
  return (
    <p className="n-warn">
      Δεν φόρτωσε τι θα επιστρέψει η απενεργοποίηση. Δοκίμασε ξανά.
    </p>
  );
}

// Η κεφαλίδα: όνομα (h1), κατάσταση, Ρόλοι και οι ενέργειες της σελίδας (Ιστορικό, Απενεργοποίηση).
function UserHero({
  target,
  preview,
  quick,
  isConfirming,
}: {
  target: N1User;
  preview: DeactivationPreview | null;
  quick: ReactNode;
  isConfirming: boolean;
}) {
  // Στην επιβεβαίωση το «γιατί όχι» το λέει η κάρτα της· εδώ μόνο στην κανονική όψη.
  const block =
    target.isActive && !isConfirming ? preview?.block : undefined;
  return (
    <Hero
      mono={initialsOf(target.name)}
      tag={`${target.isActive ? "ενεργός" : "απενεργοποιημένος"}${target.isSelf ? " · εσύ" : ""}`}
      title={target.name}
      lead={
        <>
          {target.roles}
          {block && <span className="n-warn n-block">{BLOCK_TEXT[block]}</span>}
        </>
      }
      quick={quick}
    />
  );
}

function DeactivateAction({
  target,
  preview,
}: {
  target: N1User;
  preview: DeactivationPreview | null;
}) {
  if (!target.isActive || !preview) return null;
  return preview.block ? (
    <button type="button" data-danger disabled>
      Απενεργοποίηση
    </button>
  ) : (
    <Link data-danger href={`${target.href}?confirm=deactivate`}>
      Απενεργοποίηση
    </Link>
  );
}

function Assignments({
  target,
  preview,
}: {
  target: N1User;
  preview: DeactivationPreview | null;
}) {
  if (!target.isActive)
    return (
      <Box
        title="Επανενεργοποίηση"
        hint="Επιστρέφει με τους ίδιους Ρόλους"
        isOpen
      >
        <p className="muted">
          Κρατά τους Ρόλους του ({target.roles}). Οι αναθέσεις που είχε δεν
          επιστρέφουν.
        </p>
        <ReactivateButton userId={target.id} />
      </Box>
    );
  return (
    <Box
      title="Ανοιχτές αναθέσεις"
      hint="Τι επιστρέφει για νέα ανάθεση αν απενεργοποιηθεί"
    >
      {preview ? <AssignmentList preview={preview} /> : <PreviewMissing />}
    </Box>
  );
}

function ConfirmCard({
  title,
  role,
  children,
}: {
  title: string;
  role?: "status" | "alert";
  children: ReactNode;
}) {
  return (
    <section className="n-confirm" role={role}>
      <h2 className="ml-box-title">{title}</h2>
      {children}
    </section>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <div className="ml-actions">
      <Link href={href}>Πίσω στον Χρήστη</Link>
    </div>
  );
}

function DeactivateConfirm({
  target,
  preview,
  backHref,
}: {
  target: N1User;
  preview: DeactivationPreview | null;
  backHref: string;
}) {
  // Μετά το «Ναι» η σελίδα ξαναφορτώνει με τον Χρήστη ανενεργό: εδώ λέμε ότι έγινε, όχι ότι «δεν γίνεται».
  if (!target.isActive)
    return (
      <ConfirmCard title={`Απενεργοποίηση: ${target.name}`} role="status">
        <p>Ο Χρήστης είναι απενεργοποιημένος. Δεν έχει πια πρόσβαση.</p>
        <BackLink href={backHref} />
      </ConfirmCard>
    );
  if (!preview || preview.block)
    return (
      <ConfirmCard title="Δεν γίνεται η Απενεργοποίηση" role="alert">
        {preview?.block ? (
          <p>{BLOCK_TEXT[preview.block]}</p>
        ) : (
          <PreviewMissing />
        )}
        <BackLink href={backHref} />
      </ConfirmCard>
    );
  return (
    <ConfirmCard title={`Απενεργοποίηση: ${target.name}`}>
      <p>Επιστρέφουν για νέα ανάθεση:</p>
      <AssignmentList preview={preview} />
      <p className="muted">
        Οι συνεδρίες του κλείνουν αμέσως και ο Σύνδεσμος ημερολογίου παύει. Το
        όνομά του μένει στο ιστορικό. Με Επανενεργοποίηση κρατά τους Ρόλους του,
        αλλά οι αναθέσεις δεν επιστρέφουν.
      </p>
      <DeactivateButtons userId={target.id} backHref={backHref} />
    </ConfirmCard>
  );
}

function RolesBox({
  target,
  roles,
  selected,
  isOwner,
}: {
  target: N1User;
  roles: readonly PickerRole[];
  selected: readonly string[];
  isOwner: boolean;
}) {
  return (
    <Box title="Ρόλοι" hint={target.roles}>
      <ChangeRolesForm userId={target.id} roles={roles} selected={selected} />
      <p className="muted">
        Ισχύει στην επόμενη ενέργειά του και γράφεται στο Ίχνος.{" "}
        {isOwner ? (
          <>
            Τι κάνει κάθε Ρόλος αλλάζει στη{" "}
            <Link href={hrefOf("N4")}>Ρόλοι και Δικαιώματα</Link>
          </>
        ) : (
          "Ο Ιδιοκτήτης ειδοποιείται για την αλλαγή. Τους ίδιους τους Ρόλους τους αλλάζει μόνο ο Ιδιοκτήτης."
        )}
      </p>
    </Box>
  );
}

export type DetailConfirm = "deactivate" | "anonymize" | undefined;

interface UserDetailProps {
  target: N1User;
  reach: string;
  roles: readonly PickerRole[];
  selected: readonly string[];
  preview: DeactivationPreview | null;
  isOwner: boolean;
  confirm: DetailConfirm;
  // Τα τμήματα GDPR (μόνο Ιδιοκτήτης): η ενότητα και η επιβεβαίωση ανωνυμοποίησης, από το module gdpr.
  gdprSection: ReactNode;
  gdprConfirm: ReactNode;
  history?: ReactNode;
}

export function UserDetail(props: UserDetailProps) {
  const { target, preview, isOwner, confirm } = props;
  return (
    <div className="ml-stack">
      <p>
        <Link href={hrefOf("N1")}>← Όλοι οι Χρήστες ομάδας</Link>
      </p>
      <UserHero
        target={target}
        preview={preview}
        isConfirming={confirm !== undefined}
        quick={
          <>
            {props.history}
            {!confirm && <DeactivateAction target={target} preview={preview} />}
          </>
        }
      />
      {confirm === "deactivate" && (
        <DeactivateConfirm
          target={target}
          preview={preview}
          backHref={target.href}
        />
      )}
      {confirm === "anonymize" && isOwner && props.gdprConfirm}
      {!confirm && (
        <>
          <Box title="Στοιχεία" hint={target.email}>
            <Facts target={target} reach={props.reach} />
          </Box>
          <RolesBox
            target={target}
            roles={props.roles}
            selected={props.selected}
            isOwner={isOwner}
          />
          <Assignments target={target} preview={preview} />
          {isOwner && props.gdprSection}
        </>
      )}
    </div>
  );
}
