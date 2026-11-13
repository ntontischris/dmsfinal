import type { DeliverableVersion } from "../types";

// Οι σημειώσεις πάνω στο βίντεο ως νήματα, ίδιες για ομάδα (H2) και πελάτη (H4).

export interface NoteLike {
  id: string;
  parentId: string | null;
  atSeconds: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface NoteThread<T extends NoteLike> {
  note: T;
  replies: T[];
}

const byCreated = (a: NoteLike, b: NoteLike): number =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

// Πρώτα όσες έχουν χρόνο, με τη σειρά του βίντεο· μετά όσες δεν έχουν, με τη σειρά που γράφτηκαν.
const byVideoTime = (a: NoteLike, b: NoteLike): number => {
  if (a.atSeconds !== null && b.atSeconds !== null)
    return a.atSeconds - b.atSeconds || byCreated(a, b);
  if (a.atSeconds !== null) return -1;
  if (b.atSeconds !== null) return 1;
  return byCreated(a, b);
};

// Απάντηση χωρίς ορατή σημείωση (δεν συμβαίνει από τη βάση) φαίνεται ως σημείωση, για να μη χαθεί.
export const threadsOf = <T extends NoteLike>(
  notes: readonly T[],
): NoteThread<T>[] => {
  const ids = new Set(notes.map((note) => note.id));
  const isRoot = (note: T) =>
    note.parentId === null || !ids.has(note.parentId);
  return notes
    .filter(isRoot)
    .sort(byVideoTime)
    .map((note) => ({
      note,
      replies: notes
        .filter((reply) => reply.parentId === note.id)
        .sort(byCreated),
    }));
};

export const openCountOf = <T extends NoteLike>(
  threads: readonly NoteThread<T>[],
): number => threads.filter((thread) => thread.note.resolvedAt === null).length;

export const seenLineOf = (seenBy: readonly string[]): string | null =>
  seenBy.length > 0 ? `Το είδε: ${seenBy.join(", ")}` : null;

// «Δες το όπως ο πελάτης»: μόνο ό,τι στάλθηκε, χωρίς τις εσωτερικές σημειώσεις.
export const clientPreviewOf = (
  versions: readonly DeliverableVersion[],
): DeliverableVersion[] =>
  versions
    .filter((version) => version.sentAt !== null)
    .map((version) => ({
      ...version,
      comments: version.comments.filter((comment) => !comment.isInternal),
    }));
