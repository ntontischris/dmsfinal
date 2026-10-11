import { Segmented } from "@/components/ui/segmented";

import { filterHref } from "../invoices-helpers";
import { FILTER_LABELS, INVOICES_FILTER_LABEL } from "../invoices-labels";
import { INVOICE_FILTERS, type InvoiceFilter, type InvoicesView } from "../invoices-view-schema";

interface InvoiceFilterTabsProps {
  current: InvoiceFilter;
  counts: InvoicesView["counts"];
}

// Το φίλτρο ζει στη διεύθυνση (?filter=), οπότε η επιλογή επιζεί της ανανέωσης και μοιράζεται.
export function InvoiceFilterTabs({ current, counts }: InvoiceFilterTabsProps) {
  return (
    <Segmented
      label={INVOICES_FILTER_LABEL}
      options={INVOICE_FILTERS.map((filter) => ({
        label: FILTER_LABELS[filter],
        href: filterHref(filter),
        isCurrent: filter === current,
        count: counts[filter],
      }))}
    />
  );
}
