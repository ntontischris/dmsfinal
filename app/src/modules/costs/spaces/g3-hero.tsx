import Link from "next/link";

import { Badge, fmtMoney, fmtPercent } from "@/spaces/screens/shared";

import { INTERNAL_LABEL, STATE_LABELS } from "../labels";
import type { CostState } from "../types";
import type { Figures } from "./g3-model";

// Η κεφαλίδα της G3 (μορφή της I8): η Παραγωγή, το πραγματικό κόστος σε μεγάλο νούμερο, εκτίμηση και περιθώριο από
// κάτω, και ο δρόμος πίσω στην Παραγωγή. Απαντά «πόσο κόστισε και τι κάνω;».

export interface G3HeroProps {
  title: string;
  client: string | null;
  state: CostState;
  backHref: string;
  figures: Figures;
  canManageCost: boolean;
}

const initialsOf = (title: string): string =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

function StateBadge({ figures }: { figures: Figures }) {
  if (figures.missing.length > 0)
    return <Badge tone="attention">χωρίς πραγματικές ώρες</Badge>;
  if (figures.isOverrun)
    return <Badge tone="attention">υπέρβαση κόστους</Badge>;
  return <Badge tone="strong">με πραγματικές ώρες</Badge>;
}

const factsOf = (props: G3HeroProps): string =>
  [props.client ?? INTERNAL_LABEL, STATE_LABELS[props.state]].join(" · ");

const smallOf = (figures: Figures): string => {
  const estimate = figures.estimate?.cost;
  const parts = [
    `εκτίμηση ${estimate === null || estimate === undefined ? "—" : fmtMoney(estimate)}`,
  ];
  const cost = figures.actual?.cost ?? null;
  if (figures.price !== null && cost !== null && figures.price > 0)
    parts.push(
      `περιθώριο ${fmtMoney(figures.price - cost)} (${fmtPercent((figures.price - cost) / figures.price)})`,
    );
  return parts.join(" · ");
};

export function G3Hero(props: G3HeroProps) {
  const { figures } = props;
  const cost = figures.actual?.cost ?? null;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(props.title)}
      </span>
      <div>
        <StateBadge figures={figures} />
        <h1 data-page-title>{props.title}</h1>
        <p>{factsOf(props)}</p>
        <p className="ml-hero-amount">
          {cost === null ? "—" : fmtMoney(cost)}
          <small>πραγματικό κόστος · {smallOf(figures)}</small>
        </p>
        <p>
          {props.canManageCost
            ? "Γράφεις τις πραγματικές ώρες· το κόστος και το σήμα υπέρβασης βγαίνουν μόνα τους."
            : "Τις γράφει μόνο όποιος «Διαχειρίζεται κόστος» (αρχικά ο Ιδιοκτήτης)."}
        </p>
      </div>
      <div className="ml-quick">
        <Link href={props.backHref}>Πίσω στην Παραγωγή (G2)</Link>
      </div>
    </header>
  );
}
