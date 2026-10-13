import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import { fileHref, formatDate, KNOWLEDGE_PATH } from "../helpers";
import { KIND_LABEL, TEXT_STATUS_LABEL } from "../labels";
import { formatSize } from "../upload-rules";
import type { ItemView } from "../view-schema";
import { MarkdownBody } from "./markdown";

// Ένα στοιχείο της Γνώσης (A8): Άρθρο (Markdown) ή Αρχείο με λήψη.

function FileContent({ item }: { item: ItemView }) {
  if (!item.file) return null;
  return (
    <div className="grid justify-items-start gap-3">
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Αρχείο</dt>
        <dd className="m-0 break-all">{item.file.name}</dd>
        <dt className="text-muted-foreground">Μέγεθος</dt>
        <dd className="m-0">{formatSize(item.file.size)}</dd>
      </dl>
      <a
        className={buttonVariants({ variant: "primary" })}
        href={fileHref(item.id)}
      >
        Λήψη
      </a>
      {item.textStatus && (
        <p className="m-0 text-sm text-muted-foreground">
          {TEXT_STATUS_LABEL[item.textStatus]}
        </p>
      )}
    </div>
  );
}

export function ItemScreen({ item }: { item: ItemView }) {
  return (
    <article className="grid gap-4">
      <p className="m-0">
        <Link href={KNOWLEDGE_PATH}>← Γνώση</Link>
      </p>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{KIND_LABEL[item.kind]}</Badge>
          <span className="text-sm text-muted-foreground">
            Ενότητα: {item.sectionName} · Ενημερώθηκε{" "}
            {formatDate(item.updatedAt)}
          </span>
        </div>
        <p className="m-0 text-muted-foreground">Περίληψη: {item.summary}</p>
      </header>
      {item.kind === "article" ? (
        <MarkdownBody source={item.body ?? ""} />
      ) : (
        <FileContent item={item} />
      )}
    </article>
  );
}
