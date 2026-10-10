import { Rows, type RowItem } from "@/components/ui/rows";

import type { EmailLogRow } from "../invitation-schemas";

const STATUS: Record<EmailLogRow["status"], string> = {
  sent: "στάλθηκε",
  failed: "απέτυχε",
  suppressed: "δεν στάλθηκε (εκτός επιτρεπόμενων)",
};

const when = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

const toItem = (row: EmailLogRow): RowItem => ({
  id: row.id,
  title: row.subject || row.kind,
  meta: (
    <span className="text-sm text-muted-foreground">
      {row.toEmail} · {STATUS[row.status]} · {when(row.sentAt)}
      {row.error ? ` · ${row.error}` : ""}
    </span>
  ),
});

// Οι τελευταίες αποστολές: θέμα και κατάσταση μόνο, ποτέ σύνδεσμος ή κωδικός.
export function EmailLogList({ rows }: { rows: readonly EmailLogRow[] }) {
  if (rows.length === 0) return <p className="m-0 p-4 text-sm text-muted-foreground">Δεν έχει σταλεί ακόμα κανένα email.</p>;
  return <Rows items={rows.map(toItem)} isNumbered={false} />;
}
