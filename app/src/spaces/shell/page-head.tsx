"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { titleOf } from "@/spaces/data/screens";
import {
  labelOf,
  landingOf,
  screenCodeOf,
  spaceOf,
  tabOf,
  type SpacesModel,
} from "@/spaces/data/spaces";

interface PageHeadProps {
  model: SpacesModel;
}

// Η Καταχώρηση Τιμολογίου με ?invoice= είναι η Διόρθωση μιας καταχώρισης (ίδια οθόνη I3): η διαδρομή το λέει.
const detailTitleOf = (code: string, search: URLSearchParams): string =>
  code === "I3" && search.has("invoice")
    ? "Διόρθωση Τιμολογίου"
    : titleOf(code);

// Η κεφαλίδα κάθε οθόνης: σε μια λίστα του μενού ο τίτλος της και από κάτω τα φίλτρα-ουρές της· στις σελίδες
// λεπτομέρειας μόνο το θέμα από πάνω για επιστροφή (τον τίτλο του στοιχείου τον γράφει η ίδια η σελίδα).
// Οι άλλες λίστες του θέματος ζουν στο αριστερό μενού. Τα φίλτρα αλλάζουν χωρίς να πετούν τη σελίδα στην κορυφή.
export function PageHead({ model }: PageHeadProps) {
  const code = screenCodeOf(usePathname(), model);
  const search = useSearchParams();
  const view = spaceOf(code, model);
  if (!code || !view) return null;
  const tab = tabOf(code);
  const tabLink = view.tabs.find((candidate) => candidate.code === tab);
  const isMore = view.more.some((link) => link.code === code);

  if (!tabLink && !isMore)
    return (
      <header className="page-head">
        <p className="eyebrow">
          <Link href={landingOf(view)}>{view.label}</Link> /{" "}
          {detailTitleOf(code, search)}
        </p>
      </header>
    );

  const queues = tabLink ? (view.queues[tab] ?? []) : [];
  return (
    <header className="page-head">
      <h1>
        {labelOf(tabLink ? tab : code)}
        <span className="page-head-dot">.</span>
      </h1>
      {tabLink && queues.length > 0 && (
        <nav className="page-filters" aria-label="Φίλτρα">
          <Link
            href={tabLink.href}
            scroll={false}
            aria-current={code === tab ? "page" : undefined}
          >
            {labelOf(tab)}
          </Link>
          {queues.map((queue) => (
            <Link
              key={queue.code}
              href={queue.href}
              scroll={false}
              aria-current={queue.code === code ? "page" : undefined}
            >
              {queue.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
