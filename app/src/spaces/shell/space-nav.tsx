"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  landingOf,
  mobileBar,
  screenCodeOf,
  spaceOf,
  type SpacesModel,
  type SpaceView,
} from "@/spaces/data/spaces";
import { Icon } from "@/spaces/shell/icons";
import { NavPending } from "@/spaces/shell/nav-pending";
import { ToolMenu } from "@/spaces/shell/tool-menu";

interface SpaceLinksProps {
  model: SpacesModel;
  views: readonly SpaceView[];
  className: string;
  showLabels: "wide" | "always";
  children?: ReactNode;
}

// Ο Χώρος της τρέχουσας διεύθυνσης (π.χ. /app/clients/<id> → Πελάτες).
const useActiveSpace = (model: SpacesModel): string | undefined =>
  spaceOf(screenCodeOf(usePathname(), model), model)?.id;

function SpaceLinks({
  model,
  views,
  className,
  showLabels,
  children,
}: SpaceLinksProps) {
  const active = useActiveSpace(model);
  return (
    <ul className={className} data-labels={showLabels}>
      {views.map((view) => (
        <li key={view.id}>
          <Link
            href={landingOf(view)}
            aria-current={view.id === active ? "page" : undefined}
            aria-label={view.label}
            title={view.label}
          >
            <Icon name={view.icon} size={18} />
            <span>{showLabels === "always" ? view.barLabel : view.label}</span>
            <NavPending />
          </Link>
        </li>
      ))}
      {children}
    </ul>
  );
}

interface SpaceNavProps {
  model: SpacesModel;
}

// Οι Χώροι στο χάπι πάνω (desktop).
export function SpaceNav({ model }: SpaceNavProps) {
  return (
    <SpaceLinks
      model={model}
      views={model.spaces}
      className="space-nav"
      showLabels="wide"
    />
  );
}

interface MoreSpacesProps {
  model: SpacesModel;
  views: readonly SpaceView[];
}

// «Περισσότερα»: οι Χώροι που δεν χωράνε στη μπάρα (π.χ. Εταιρεία). Ανάβει όταν είσαι σε έναν από αυτούς.
function MoreSpaces({ model, views }: MoreSpacesProps) {
  const active = useActiveSpace(model);
  const isActive = views.some((view) => view.id === active);
  return (
    <li className="bottom-bar-more" data-active={isActive}>
      <ToolMenu
        summary={
          <>
            <Icon name="more" size={18} />
            <span>Περισσότερα</span>
          </>
        }
        summaryClassName="bottom-bar-more-button"
        label="Περισσότεροι Χώροι"
      >
        <ul className="tool-menu-list" data-align="end" data-side="top">
          {views.map((view) => (
            <li key={view.id}>
              <Link
                href={landingOf(view)}
                aria-current={view.id === active ? "page" : undefined}
              >
                <Icon name={view.icon} size={18} />
                {view.label}
                <NavPending />
              </Link>
            </li>
          ))}
        </ul>
      </ToolMenu>
    </li>
  );
}

// Οι Χώροι σε μπάρα κάτω (κινητό): έως 5· με περισσότερους, 4 και οι υπόλοιποι στο «Περισσότερα».
export function BottomBar({ model }: SpaceNavProps) {
  const { bar, more } = mobileBar(model.spaces);
  return (
    <nav className="bottom-bar" aria-label="Χώροι" data-spaces>
      <SpaceLinks
        model={model}
        views={bar}
        className="bottom-bar-list"
        showLabels="always"
      >
        {more.length > 0 && <MoreSpaces model={model} views={more} />}
      </SpaceLinks>
    </nav>
  );
}
