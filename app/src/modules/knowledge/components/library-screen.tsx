import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Rows, type RowItem } from "@/components/ui/rows";

import { formatDate, itemHref, KNOWLEDGE_PATH } from "../helpers";
import {
  CLIENT_HELP_NOTE,
  EMPTY_LIBRARY_TITLE,
  KIND_LABEL,
  PRICES_NOTE,
  SEARCH_LABEL,
} from "../labels";
import type { Library, SearchResult } from "../view-schema";

// A8 Γνώση: Ενότητες με τα στοιχεία του Κοινού μου, και αναζήτηση (ελληνικό full-text) από τη διεύθυνση (?q=).

function SearchForm({ q }: { q: string }) {
  return (
    <form
      method="get"
      action={KNOWLEDGE_PATH}
      role="search"
      className="mb-6 flex flex-wrap gap-2"
    >
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={SEARCH_LABEL}
        aria-label={SEARCH_LABEL}
        className="max-w-md flex-1"
      />
      <Button type="submit">Αναζήτηση</Button>
    </form>
  );
}

interface RowSource {
  id: string;
  kind: "article" | "file";
  title: string;
  summary: string;
}

const rowOf = (item: RowSource, extra?: string): RowItem => ({
  id: item.id,
  title: item.title,
  href: itemHref(item.id),
  meta: (
    <>
      <span className="block">Περίληψη: {item.summary}</span>
      {extra && <span className="block text-xs">{extra}</span>}
    </>
  ),
  aside: <Badge>{KIND_LABEL[item.kind]}</Badge>,
});

function Footer({ isClient }: { isClient: boolean }) {
  return (
    <p className="mt-6 text-sm text-muted-foreground">
      {isClient ? CLIENT_HELP_NOTE : PRICES_NOTE}
    </p>
  );
}

interface LibraryScreenProps {
  library: Library;
  isClient: boolean;
}

export function LibraryScreen({ library, isClient }: LibraryScreenProps) {
  return (
    <>
      <SearchForm q="" />
      {library.sections.length === 0 ? (
        <Notice kind="empty" title={EMPTY_LIBRARY_TITLE} />
      ) : (
        <div className="grid gap-6">
          {library.sections.map((section) => (
            <Panel
              key={section.id}
              label={section.name}
              aside={`${section.items.length}`}
            >
              {section.description && (
                <p className="mt-0 mb-3 text-sm text-muted-foreground">
                  {section.description}
                </p>
              )}
              <Rows
                isNumbered={false}
                items={section.items.map((item) =>
                  rowOf(item, `Ενημερώθηκε ${formatDate(item.updatedAt)}`),
                )}
              />
            </Panel>
          ))}
        </div>
      )}
      <Footer isClient={isClient} />
    </>
  );
}

interface SearchScreenProps {
  q: string;
  result: SearchResult;
  isClient: boolean;
}

export function SearchScreen({ q, result, isClient }: SearchScreenProps) {
  return (
    <>
      <SearchForm q={q} />
      {result.items.length === 0 ? (
        <Notice kind="empty" title={`Τίποτα για «${q}»`}>
          <p className="m-0">Δοκίμασε άλλες λέξεις.</p>
        </Notice>
      ) : (
        <Panel
          label={`Αποτελέσματα για «${q}»`}
          aside={`${result.items.length}`}
        >
          <Rows
            isNumbered={false}
            items={result.items.map((item) =>
              rowOf(item, `Ενότητα: ${item.sectionName}`),
            )}
          />
        </Panel>
      )}
      <Footer isClient={isClient} />
    </>
  );
}
