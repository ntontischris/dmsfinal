"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage } from "@/components/ui/form-message";
import { Panel } from "@/components/ui/panel";
import { Table, Th } from "@/components/ui/table";

import { createKind } from "../actions-settings";
import type { KindUsage, ProvisionKind } from "../types";

import { ActionForm } from "./action-form";
import { ProvisionKindFields } from "./provision-kind-fields";
import { ProvisionKindRow } from "./provision-kind-row";

interface ProvisionKindsEditorProps {
  kinds: readonly ProvisionKind[];
  usage: KindUsage;
  showRetired: boolean;
}

const SETTINGS_HREF = "/app/settings/agreements";

function RetiredToggle({
  count,
  showRetired,
}: {
  count: number;
  showRetired: boolean;
}) {
  if (count === 0 && !showRetired) return null;
  return (
    <Link
      href={showRetired ? SETTINGS_HREF : `${SETTINGS_HREF}?retired=1`}
      className="text-sm"
    >
      {showRetired ? "Κρύψε αποσυρμένα" : `Δείξε αποσυρμένα (${count})`}
    </Link>
  );
}

// Ο πίνακας κρατά το μήνυμα επιτυχίας των γραμμών του: η γραμμή που διαγράφηκε ή αποσύρθηκε φεύγει με την ανανέωση,
// ο πίνακας μένει, άρα το μήνυμα φαίνεται και μετά.
function KindsTable({
  kinds,
  usage,
}: {
  kinds: readonly ProvisionKind[];
  usage: KindUsage;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {notice && <FormMessage state={{ notice }} />}
      <Table>
        <thead>
          <tr>
            <Th>Σειρά</Th>
            <Th>Είδος</Th>
            <Th>Μονάδα</Th>
            <Th>Μέτρηση</Th>
            <Th>Κατάσταση</Th>
            <Th>Ενέργεια</Th>
          </tr>
        </thead>
        <tbody>
          {kinds.map((kind) => (
            <ProvisionKindRow
              key={kind.id}
              kind={kind}
              uses={usage[kind.id] ?? 0}
              onNotice={setNotice}
            />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// Η λίστα Είδη Παροχής (O3): προστίθεται και αναδιατάσσεται ελεύθερα· ό,τι χρησιμοποιήθηκε αποσύρεται, δεν σβήνεται (ADR 0015).
export function ProvisionKindsEditor({
  kinds,
  usage,
  showRetired,
}: ProvisionKindsEditorProps) {
  const retiredCount = kinds.filter((kind) => kind.isRetired).length;
  const visible = showRetired ? kinds : kinds.filter((kind) => !kind.isRetired);
  return (
    <Panel
      label="Είδη Παροχής"
      aside={<RetiredToggle count={retiredCount} showRetired={showRetired} />}
    >
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Τι δουλειά μετράει μια Παροχή. Ό,τι γράφεις εδώ φαίνεται στα Πακέτα,
          στις Συμφωνίες και στον πελάτη, γι&apos; αυτό θέλει ελληνικά και
          αγγλικά. Οι αλλαγές ισχύουν από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν
          αλλάζει.
        </p>
        <KindsTable kinds={visible} usage={usage} />
        <div className="border-t pt-4">
          <ActionForm
            action={createKind}
            submitLabel="Προσθήκη"
            pendingLabel="Προσθήκη…"
            resetOnSuccess
          >
            <ProvisionKindFields />
          </ActionForm>
        </div>
      </div>
    </Panel>
  );
}
