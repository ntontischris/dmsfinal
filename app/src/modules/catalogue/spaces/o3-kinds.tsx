"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import {
  createKind,
  deleteKind,
  moveKind,
  reactivateKind,
  retireKind,
  updateKind,
} from "../actions-settings";
import { MEASURE_LABELS } from "../labels";
import type { KindUsage, ProvisionKind } from "../types";
import {
  hoursText,
  kindStatusOf,
  kindSubOf,
  type KindStatus,
} from "./o3-kinds-model";

import "./o3-kinds.css";

// Είδη Παροχής της O3 στη νέα εμφάνιση (prototype `screens/o3-types.tsx`), με τις πραγματικές ενέργειες της κλασικής:
// προσθήκη, επεξεργασία, σειρά ↑↓, Νέα → διαγραφή, Σε χρήση → απόσυρση, αποσυρμένο → επανενεργοποίηση (ADR 0015).

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const SETTINGS_HREF = "/app/settings/agreements";
const DELIVERABLES_HREF = "/app/settings/deliverables";

const TONE: Readonly<Record<KindStatus, BadgeTone>> = {
  Νέα: "waiting",
  "Σε χρήση": "ok",
  Αποσύρθηκε: "faded",
};

function FormNote({ state }: { state: FormState }) {
  const text = state.error ?? state.notice;
  if (!text) return null;
  return (
    <span className="note" role={state.error ? "alert" : "status"}>
      {text}
    </span>
  );
}

// Μία ενέργεια με κουμπί. Με onDone, το μήνυμα επιτυχίας ανεβαίνει στην κάρτα: η γραμμή φεύγει με την ανανέωση.
function RowAction({
  action,
  id,
  label,
  ariaLabel,
  isDanger = false,
  onDone,
  children,
}: {
  action: Action;
  id: string;
  label: string;
  ariaLabel?: string;
  isDanger?: boolean;
  onDone?: (notice: string) => void;
  children?: ReactNode;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    async (previous: FormState, form: FormData) => {
      const next = await action(previous, form);
      if (!onDone || !next.notice) return next;
      onDone(next.notice);
      return INITIAL_FORM_STATE;
    },
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      {children}
      <button
        type="submit"
        className="button"
        data-danger={isDanger ? "true" : undefined}
        aria-label={ariaLabel}
        disabled={isPending}
      >
        {label}
      </button>
      <FormNote state={state} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="stack o-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// Τα πεδία ενός είδους: ίδια στην «Προσθήκη» και στην «Επεξεργασία». Τα αγγλικά τα ζητά ο server, με την αιτιολογία.
function KindFields({ kind }: { kind?: ProvisionKind }) {
  return (
    <div className="o-fields">
      <Field label="Ετικέτα">
        <input
          className="input"
          name="label"
          required
          defaultValue={kind?.label}
        />
      </Field>
      <Field label="Ετικέτα (EN)">
        <input className="input" name="labelEn" defaultValue={kind?.labelEn} />
      </Field>
      <Field label="Μονάδα">
        <input
          className="input"
          name="unit"
          required
          defaultValue={kind?.unit}
        />
      </Field>
      <Field label="Μονάδα (EN)">
        <input className="input" name="unitEn" defaultValue={kind?.unitEn} />
      </Field>
      <Field label="Τρόπος μέτρησης">
        <select
          className="select"
          name="measure"
          defaultValue={kind?.measure ?? ""}
        >
          <option value="">Σε πλήθος</option>
          <option value="per_filming">{MEASURE_LABELS.per_filming}</option>
          <option value="per_hour">{MEASURE_LABELS.per_hour}</option>
          <option value="per_day">{MEASURE_LABELS.per_day}</option>
        </select>
      </Field>
      <Field label="Προεπιλεγμένη διάρκεια (ώρες, μόνο με Τρόπο μέτρησης)">
        <input
          className="input"
          name="defaultHours"
          inputMode="decimal"
          defaultValue={hoursText(kind)}
        />
      </Field>
    </div>
  );
}

function KindForm({
  action,
  kind,
  submitLabel,
}: {
  action: Action;
  kind?: ProvisionKind;
  submitLabel: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess: !kind,
  });
  return (
    <form ref={formRef} className="stack" onSubmit={onSubmit}>
      {kind && <input type="hidden" name="id" value={kind.id} />}
      <KindFields kind={kind} />
      <span className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending}
        >
          {isPending ? `${submitLabel}…` : submitLabel}
        </button>
        <FormNote state={state} />
      </span>
    </form>
  );
}

function MoveButtons({ kind }: { kind: ProvisionKind }) {
  return (
    <>
      {(["up", "down"] as const).map((direction) => (
        <RowAction
          key={direction}
          action={moveKind}
          id={kind.id}
          label={direction === "up" ? "↑" : "↓"}
          ariaLabel={`${direction === "up" ? "Πάνω" : "Κάτω"}: ${kind.label}`}
        >
          <input type="hidden" name="direction" value={direction} />
        </RowAction>
      ))}
    </>
  );
}

function StatusAction({
  kind,
  status,
  onDone,
}: {
  kind: ProvisionKind;
  status: KindStatus;
  onDone: (notice: string) => void;
}) {
  if (status === "Αποσύρθηκε")
    return (
      <RowAction
        action={reactivateKind}
        id={kind.id}
        label="Επανενεργοποίηση"
      />
    );
  if (status === "Νέα")
    return (
      <RowAction
        action={deleteKind}
        id={kind.id}
        label="Διαγραφή"
        isDanger
        onDone={onDone}
      />
    );
  return (
    <RowAction
      action={retireKind}
      id={kind.id}
      label="Απόσυρση"
      onDone={onDone}
    />
  );
}

function KindRow({
  kind,
  index,
  uses,
  onDone,
}: {
  kind: ProvisionKind;
  index: number;
  uses: number;
  onDone: (notice: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const status = kindStatusOf(kind, uses);
  return (
    <ListRow
      isFaded={status === "Αποσύρθηκε"}
      lead={
        <span className="o3k-order">
          {index + 1}
          {status !== "Αποσύρθηκε" && <MoveButtons kind={kind} />}
        </span>
      }
      title={kind.label}
      sub={
        <>
          {kindSubOf(kind)}
          {isEditing && (
            <KindForm
              action={updateKind}
              kind={kind}
              submitLabel="Αποθήκευση"
            />
          )}
        </>
      }
      aside={
        <>
          {status !== "Νέα" && <span className="part-sub">{uses} χρήσεις</span>}
          <Badge tone={TONE[status]}>{status}</Badge>
          <button
            type="button"
            className="button"
            aria-expanded={isEditing}
            aria-label={`Επεξεργασία: ${kind.label}`}
            onClick={() => setIsEditing((current) => !current)}
          >
            Επεξεργασία
          </button>
          <StatusAction kind={kind} status={status} onDone={onDone} />
        </>
      }
    />
  );
}

function AddKind() {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        + Νέο είδος Παροχής
      </button>
    );
  return <KindForm action={createKind} submitLabel="Προσθήκη" />;
}

interface SpacesProvisionKindsProps {
  kinds: readonly ProvisionKind[];
  usage: KindUsage;
  showRetired: boolean;
}

export function SpacesProvisionKinds({
  kinds,
  usage,
  showRetired,
}: SpacesProvisionKindsProps) {
  const [notices, setNotices] = useState<readonly string[]>([]);
  const onDone = (notice: string) =>
    setNotices((current) => [...current, notice]);
  const retiredCount = kinds.filter((kind) => kind.isRetired).length;
  const visible = showRetired ? kinds : kinds.filter((kind) => !kind.isRetired);
  return (
    <div className="o-card">
      <Panel label="Είδη Παροχής">
        <Badge>ελληνικά και αγγλικά</Badge>
        {notices.map((notice, index) => (
          <p key={index} className="note" role="status">
            {notice}
          </p>
        ))}
        {visible.length === 0 ? (
          <p className="muted">
            Κανένα είδος Παροχής ακόμα. Χωρίς είδη δεν στήνεται Κατάλογος.
          </p>
        ) : (
          <RowList>
            {visible.map((kind, index) => (
              <KindRow
                key={kind.id}
                kind={kind}
                index={index}
                uses={usage[kind.id] ?? 0}
                onDone={onDone}
              />
            ))}
          </RowList>
        )}
        <div className="btn-row o-list-actions">
          <AddKind />
          {(retiredCount > 0 || showRetired) && (
            <Link
              className="button"
              href={showRetired ? SETTINGS_HREF : `${SETTINGS_HREF}?retired=1`}
            >
              {showRetired
                ? "Κρύψε αποσυρμένα"
                : `Δείξε αποσυρμένα (${retiredCount})`}
            </Link>
          )}
        </div>
        <p className="muted o-hint">
          Ο Τρόπος μέτρησης είναι σταθερή επιλογή (σε πλήθος /{" "}
          {MEASURE_LABELS.per_filming} / {MEASURE_LABELS.per_hour} /{" "}
          {MEASURE_LABELS.per_day}): το σύστημα ξέρει να μετρά μόνο αυτούς, γι
          αυτό δεν προστίθενται άλλοι. Τη λίστα τη βλέπει ο πελάτης, οπότε η
          αποθήκευση θέλει και τις δύο γλώσσες. Οι αλλαγές ισχύουν από εδώ και
          πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.
        </p>
        <p className="muted o-hint">
          Την προθεσμία παράδοσης ανά είδος την ορίζεις στα{" "}
          <Link href={DELIVERABLES_HREF}>Παραδοτέα (O5)</Link>.
        </p>
      </Panel>
    </div>
  );
}
