"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { codeOfPath, titleOf } from "@/spaces/data/screens";
import {
  labelOf,
  landingOf,
  spaceOf,
  tabOf,
  type SpacesModel,
} from "@/spaces/data/spaces";
import { Icon } from "@/spaces/shell/icons";
import { ToolMenu } from "@/spaces/shell/tool-menu";

interface PageHeadProps {
  model: SpacesModel;
}

// Η κεφαλίδα κάθε οθόνης (prototype `shell/page-head.tsx`): στις καρτέλες ενός Χώρου ο τίτλος είναι ο Χώρος και από κάτω
// οι καρτέλες του και τα φίλτρα-ουρές· στις σελίδες λεπτομέρειας μόνο ο Χώρος από πάνω για επιστροφή (τον τίτλο του
// στοιχείου τον γράφει η ίδια η σελίδα). Οθόνες του μενού χωρίς καρτέλα μπαίνουν στο «Περισσότερα», για να μη χαθεί καμία.
// Καρτέλες και φίλτρα αλλάζουν χωρίς να πετούν τη σελίδα στην κορυφή (scroll={false}).
export function PageHead({ model }: PageHeadProps) {
  const code = codeOfPath(usePathname());
  const view = spaceOf(code, model);
  if (!code || !view) return null;
  const tab = tabOf(code);
  const isTab = view.tabs.some((candidate) => candidate.code === tab);
  const queues = isTab ? (view.queues[tab] ?? []) : [];
  const isMore = view.more.some((link) => link.code === code);

  if (!isTab)
    return (
      <header className="page-head">
        <p className="eyebrow">
          <Link href={landingOf(view)}>{view.label}</Link> /{" "}
          {isMore ? labelOf(code) : titleOf(code)}
        </p>
      </header>
    );

  return (
    <header className="page-head">
      <h1>
        {view.label}
        <span className="page-head-dot">.</span>
      </h1>
      {(view.tabs.length > 1 ||
        view.links.length > 0 ||
        view.more.length > 0) && (
        <nav className="page-tabs" aria-label={view.label}>
          {view.tabs.map((candidate) => (
            <Link
              key={candidate.code}
              href={candidate.href}
              scroll={false}
              aria-current={candidate.code === tab ? "page" : undefined}
            >
              {candidate.label}
            </Link>
          ))}
          {view.links.map((link) => (
            <Link
              key={link.code}
              className="page-tab-link"
              href={link.href}
              title={`Στον Χώρο «${link.space}»`}
            >
              {link.label}
              <Icon name="arrow" size={14} />
            </Link>
          ))}
          {view.more.length > 0 && <MoreScreens links={view.more} />}
        </nav>
      )}
      {queues.length > 0 && (
        <nav className="page-filters" aria-label="Φίλτρα">
          <Link
            href={
              view.tabs.find((candidate) => candidate.code === tab)?.href ??
              "/app"
            }
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

// «Περισσότερα» στο τέλος των καρτελών: το ίδιο μενού με το «Περισσότερα» της κάτω μπάρας του prototype.
function MoreScreens({
  links,
}: {
  links: SpacesModel["spaces"][number]["more"];
}) {
  return (
    <ToolMenu
      summary={
        <>
          Περισσότερα <Icon name="more" size={14} />
        </>
      }
      summaryClassName="page-tab-more"
      label="Περισσότερες οθόνες"
    >
      <ul className="tool-menu-list">
        {links.map((link) => (
          <li key={link.code}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </ToolMenu>
  );
}
